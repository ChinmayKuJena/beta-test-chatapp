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
import { GroqService } from 'src/groq/groq.service'; // Import the AI service

@WebSocketGateway({ namespace: '/mychat', cors: true })
export class ChatbotGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly redisService: RedisService,
    private readonly groqService: GroqService, // Inject AI service
  ) {}

  async handleConnection(client: Socket) {
    const { username, roomId } = client.handshake.query;

    if (!username || !roomId) {
      console.log('Wrong RoomId');
      client.disconnect(true); // Disconnect if username or roomId is missing
      return;
    }

    // Check session in Redis
    const session = await this.redisService.get(`session:${username}`);
    if (!session || session.roomId !== roomId) {
      client.emit('error', 'Invalid session or room ID.');
      client.disconnect(true);
      return;
    }

    client.join(roomId); // Add client to the specified room
    this.server.to(roomId).emit('message', `${username} has joined the room.`);
  }

  async handleDisconnect(client: Socket) {
    const { username, roomId } = client.handshake.query;
    if (username && roomId) {
      this.server.to(roomId).emit('message', `${username} has left the room.`);
    }
  }

  @UseGuards(AuthGuard) // Require AuthGuard for message sending
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

    // Broadcast user's message to the room
    // this.server.to(roomId).emit('message', { username, message });

    // Generate AI response using GroqService
    try {
      const aiResponse = await this.groqService.getChatCompletionWithPrompt(message);
      if (aiResponse && aiResponse.content) {
        // Send AI response to the same room
        this.server.to(roomId).emit('message', {
          username: 'AI Assistant',
          message: aiResponse.content,
        });
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      client.emit('error', 'Failed to generate AI response.');
    }
  }
}
