import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { AllowAnonymous } from 'src/auth/allowAll.metas';

@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  // Login endpoint
  @Post('login')
  @AllowAnonymous()
  async login(@Body() body: { username: string; password: string }) {
    return await this.service.login(body.username, body.password);
  }

  // Logout endpoint
  @Get('logout')
  async logout(@Req() request: Request) {
    const token = request.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header
    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, '51456564156454'); // Verify and decode the JWT token
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    const username = decodedToken.username; // Assuming the username is stored in the JWT claim
    if (!username) {
      throw new UnauthorizedException('No username found in token');
    }

    await this.service.logout(username); // Call logout method in service to remove session from Redis
    return { message: 'Logged out successfully' };
  }
}
