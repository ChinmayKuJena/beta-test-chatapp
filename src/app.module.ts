import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatGateway } from './chat/chat.gateway';
import { GroqModule } from './groq/groq.module';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { SocketsModule } from './sockets/sockets.module';
import { LoggerModule } from './logger/logger.module';
import { UsersModule } from './users/users.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/web.auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GroqModule,
    RedisModule,
    SocketsModule,
    LoggerModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ChatGateway,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
