import { Module } from '@nestjs/common';
import { SocketsService } from './sockets.service';
import { ChatbotGateway } from './chatbot/chatbot.gateway';
import { LoggerModule } from 'src/logger/logger.module';
import { GroqModule } from 'src/groq/groq.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [LoggerModule,GroqModule,RedisModule],
  providers: [SocketsService, ChatbotGateway],
})
export class SocketsModule {}
