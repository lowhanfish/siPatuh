import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

// Extend Express Request interface to include authenticated user
declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Token autentikasi tidak ditemukan');
    }

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: accessSecret,
      });

      if (payload.type && payload.type !== 'access') {
        throw new UnauthorizedException('Tipe token tidak valid');
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Sesi autentikasi telah berakhir atau tidak valid',
      );
    }
  }

  private extractTokenFromRequest(request: Request): string | undefined {
    // 1. Ambil dari cookie access_token (prioritas utama httpOnly cookie)
    if (request.cookies && request.cookies.access_token) {
      return request.cookies.access_token as string;
    }

    // 2. Fallback ke header Authorization: Bearer <token>
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }
}
