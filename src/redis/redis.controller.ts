import { Controller, Get, Param, Query } from '@nestjs/common';
import { RedisService } from './redis.service';
import { AllowAnonymous } from 'src/auth/allowAll.metas';
// import { AllowAnonymous } from 'src/auth/allowAll.metas';

@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}
  @Get('room')
  @AllowAnonymous()
  async getRoomMetadata(@Param('roomId') roomId: string) {
    return await this.redisService.hgetall(`chat:RoomIdAdmin214cdfb8c-ced4-40b0-b8bd-d37e9ac2ccb4`);
  }

  // @Get('room/:roomId/messages')
  // async getRoomMessages(@Param('roomId') roomId: string) {
  //   return this.redisService.getMessagesForRoom(roomId);
  // }
  // @Get('rooms')
  // async getAllRooms() {
  //   // Implement logic to list all active rooms (can be based on keys in Redis)
  //   // Example: Fetch keys matching `room:*` and extract room IDs
  //   return this.redisService.getAllRooms();
  //   // return ['room1232']; // Mock data
  // }
}
