import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class UsersService {
  private users: Map<string, { password: string; email: string }> = new Map([
    ['Chinmay09', { password: 'Chinmay09', email: 'chinmay09jena@gmail.com' }],
    ['User2', { password: '123456', email: 'xyz@gmail.com' }],
  ]);

  constructor(private readonly redisService: RedisService) {}

  // Login, create JWT, and handle Redis session
  async login(username: string, password: string) {
    const user = this.users.get(username);
    if (!user) {
      throw new NotFoundException(`${username} Not found`);
    }

    if (password !== user.password) {
      throw new NotFoundException('Incorrect password');
    }

    // Check if the user already has an active session in Redis
    const activeSession = await this.redisService.get(`session:${username}`);
    // console.log(activeSession);

    if (activeSession) {
      throw new ConflictException(`${username} already has an active session`);
    }

    // Generate the JWT token
    const roomId = `RoomId${username}${this.generateRequestId()}`; // Dynamically assign roomId as needed
    const claims = {
      username: username,
      email: user.email,
      roomId: roomId,
    };

    // Use environment variable for JWT secret
    const token = jwt.sign(claims, process.env.JWT_SECRET || '51456564156454', {
      expiresIn: '18h', // Set the expiration as required
    });

    // Store session data in Redis
    const sessionData = {
      username,
      roomId: roomId,
      joinedAt: new Date().toISOString(),
    };

    // Set session in Redis with TTL (18 hours)
    await this.redisService.set(`session:${username}`, sessionData); // 18 hours TTL
    console.log(sessionData);
    console.log(claims);
    
    return { claims, token };
  }

  // Logout, remove session from Redis
  async logout(username: string): Promise<void> {
    // Remove session from Redis
    await this.redisService.delete(`session:${username}`);
  }
  generateRequestId(): string {
    return uuidv4();
  }
}
