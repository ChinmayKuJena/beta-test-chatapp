import { Module } from '@nestjs/common';
import { GroqService } from './groq.service';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { GroqEntity } from './groq.entity';
// import { GroqDbService } from './groq.db.service';
import { GroqController } from './groq.controller';
import { RedisModule } from 'src/redis/redis.module';
// import { GroqServiceBackeUp } from './groq.service-backup';

@Module({
  imports: [
    // TypeOrmModule.forFeature([GroqEntity]),
    RedisModule,
  ],
  controllers: [GroqController],
  providers: [GroqService],
  exports: [GroqService],
})
export class GroqModule {}
