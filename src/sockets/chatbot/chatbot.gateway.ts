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

@WebSocketGateway({ namespace:'/mychat',cors: true })
export class ChatbotGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly redisService: RedisService) {}

  async handleConnection(client: Socket) {
   
    const { username, roomId } = client.handshake.query;

    if (!username || !roomId) {
      console.log("Wrong RoomId");
      
      client.disconnect(true); // Disconnect if username or roomId is missing
      return;
    }

    // Check session in Redis
    const session = await this.redisService.get(`session:${username}`);
    console.log(session);
    
    if (!session || session.roomId !== roomId) {
      client.emit('error', 'Invalid session or room ID.');
      client.disconnect(true);
      return;
    }

    client.join(roomId); // Add client to the specified room
    this.server.to(roomId).emit('message', `{}${username} has joined the room.`);
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
    // console.log(message);
    
    if (!roomId) {
      client.emit('error', 'Room ID missing.');
      return;
    }

    // Broadcast message to the room
    this.server.to(roomId).emit('message', { username, message });
  }
}
