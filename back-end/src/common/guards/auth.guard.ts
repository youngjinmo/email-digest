import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../../auth/jwt/token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { UserStatus } from '../../users/user.enums';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = this.extractTokenFromHeader(request);

    if (!accessToken) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      // Validate access token (checks expiration and signature)
      const payload = this.tokenService.parsePayloadFromToken(accessToken);
      const user = await this.usersService.findById(payload.userId);

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Set user in request
      request.user = {
        userId: payload.userId,
        username: payload.username,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('EXPIRED TOKEN');
      }

      this.logger.warn(
        `Authentication failed for ${request.method} ${request.url}: ${error?.message}`,
      );
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
