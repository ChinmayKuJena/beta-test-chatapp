import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';
import { AuthGuard } from 'src/auth/web.auth';
import { GroqService } from 'src/groq/groq.service';

@WebSocketGateway({ namespace: '/mychat', cors: true })
export class ChatbotGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly redisService: RedisService,
    private readonly groqService: GroqService,
  ) {}

  async handleConnection(client: Socket) {
    const { username, roomId } = client.handshake.query;

    if (!username || !roomId) {
      console.log('Invalid username or room ID.');
      client.disconnect(true);
      return;
    }

    try {
      // Verify session from Redis
      const session = await this.redisService.get(`session:${username}`);
      if (!session || session.roomId !== roomId) {
        client.emit('error', 'Invalid session or room ID.');
        client.disconnect(true);
        return;
      }

      client.join(roomId); // Add client to room
      this.server.to(roomId).emit('message', `${username} has joined the room.`);
    } catch (error) {
      console.error('Error handling connection:', error);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const { username, roomId } = client.handshake.query;

    if (username && roomId) {
      this.server.to(roomId).emit('message', `${username} has left the room.`);
    }
  }

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() data: { username: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { username, message } = data;
    const { roomId } = client.handshake.query;

    if (!roomId) {
      client.emit('error', 'Room ID missing.');
      return;
    }

    const hashKey = `chat:${roomId}`;
    const timestamp = new Date().toISOString();

    try {
      // Save user message to Redis hash
      const userMessageKey = `${timestamp}:user:${username}`;
      await this.redisService.hset(hashKey, userMessageKey, message);

      // Broadcast user's message to the room
      this.server.to(roomId).emit('message', { username, message });

      // Generate and broadcast AI response
      const aiResponse = await this.groqService.getChatCompletionWithPrompt(message);
      if (aiResponse?.content) {
        const aiMessageKey = `${timestamp}:ai`;
        const aiMessage = aiResponse.content;

        // Save AI message to Redis hash
        await this.redisService.hset(hashKey, aiMessageKey, aiMessage);

        this.server.to(roomId).emit('message', {
          username: 'AI Assistant',
          message: aiMessage,
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      client.emit('error', 'Failed to process the message.');
    }
  }

  @SubscribeMessage('getHistory')
  async getChatHistory(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = data;

    if (!roomId) {
      client.emit('error', 'Room ID missing.');
      return;
    }

    try {
      const chatHistory = await this.redisService.hgetall(`chat:${roomId}`);
      const sortedHistory = Object.entries(chatHistory)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort by timestamp
        .map(([key, value]) => ({
          sender: key.includes(':user:') ? key.split(':user:')[1] : 'AI Assistant',
          timestamp: key.split(':')[0],
          message: value,
        }));

      client.emit('chatHistory', sortedHistory);
    } catch (error) {
      console.error('Error retrieving chat history:', error);
      client.emit('error', 'Failed to retrieve chat history.');
    }
  }
}
