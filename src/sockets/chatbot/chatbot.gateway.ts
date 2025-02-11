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
export class ChatbotGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
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
      // Check if the user has joined before
      const greeted = await this.redisService.get(`greeted:${username}`);

      client.join(roomId);
      this.server
        .to(roomId)
        .emit('message', `${username} has joined the room.`);

      // Send greeting only if user hasn't been greeted before
      if (!greeted) {
        const greetingMessage =
          await this.groqService.getChatCompletionWithPrompt(
            `Greet the user ${username} warmly and introduce yourself.`,
            username,
          );
        this.server.to(roomId).emit('message', {
          username: 'AI Assistant',
          message: greetingMessage.content,
        });

        // Mark user as greeted
        await this.redisService.set(`greeted:${username}`, 'true', 3600); // Expire in 1 hour
      }
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
      // Save user message to Redis
      // const userMessageKey = `${timestamp}:user:${username}`;
      // await this.redisService.hashOperation(
      //   'set',
      //   hashKey,
      //   userMessageKey,
      //   message,
      // );

      // Broadcast user's message
      this.server.to(roomId).emit('message', { username, message });

      // Check if the user is already greeted
      const greeted = await this.redisService.get(`greeted:${username}`);

      let aiResponse;
      if (!greeted) {
        // First-time response with a greeting
        aiResponse = await this.groqService.getChatCompletionWithPrompt(
          `Greet the user ${username} warmly and introduce yourself.`,
          username,
        );
        await this.redisService.set(`greeted:${username}`, 'true', 3600); // Set greeting flag
      } else {
        // Normal AI response
        aiResponse =
          await this.groqService.getChatCompletionWithPrompt(message);
      }

      if (aiResponse?.content) {
        const aiMessageKey = `${timestamp}:ai`;
        const aiMessage = aiResponse.content;
        // TODO
        // // Save AI response to Redis
        // await this.redisService.hashOperation(
        //   'set',
        //   hashKey,
        //   aiMessageKey,
        //   aiMessage,
        // );

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
}
