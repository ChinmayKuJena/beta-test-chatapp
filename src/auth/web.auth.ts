import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken'; // Import jsonwebtoken
import { IS_ALLOW_ANONYMOUS_KEY } from './allowAll.metas';
// import { Socket } from 'socket.io';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAllowAnonymous = this.reflector.get<boolean>(
      IS_ALLOW_ANONYMOUS_KEY,
      context.getHandler(),
    );

    // Allow anonymous access if configured
    if (isAllowAnonymous) {
      return true;
    }

    const type = context.getType(); // 'ws' for WebSocket, 'http' for HTTP
    console.log(type);
    
    if (type == 'ws') {
      const client = context.switchToWs().getClient(); // Handle WebSocket client
      const headers = client.handshake?.headers;
      // Handle WebSocket headers
      if (!headers || !headers['authorization']) {
        throw new UnauthorizedException('Token missing in headers.');
      }
      const token = headers['authorization'].split(' ')[1]; // Extract token
      try {
        // console.log(token);
        
        const decodedToken = jwt.verify(
          token,
          process.env.JWT_SECRET || '51456564156454',
        );
        client.user = decodedToken; // Attach decoded token to the client object
        return true;
      } catch (error) {
        throw new UnauthorizedException('Invalid or expired token.');
      }
    }
    // Handle HTTP requests

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      throw new UnauthorizedException('Token missing or malformed.HTTP');
    }

    const token = authHeader.split(' ')[1];
    try {
      const decodedToken = jwt.verify(token, '51456564156454'); // Secret key
      request.user = decodedToken; // Attach the decoded token to the request object
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
