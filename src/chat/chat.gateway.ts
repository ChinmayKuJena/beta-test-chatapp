import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust the origin based on your needs
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: { username: string; message: string },
    @ConnectedSocket() client: Socket,
  ): void {
    this.server.emit('message', data); // Broadcast the message to all clients
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() username: string,
    @ConnectedSocket() client: Socket,
  ): void {
    client.emit('joined', `Welcome ${username}`);
    client.broadcast.emit('joined', `${username} has joined the chat`);
  }
}
