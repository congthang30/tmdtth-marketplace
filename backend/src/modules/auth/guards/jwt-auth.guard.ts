import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';
import { JwtPayload } from '../types';

function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Thiếu token xác thực',
        details: [],
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const userId = BigInt(payload.sub);
      const user = await this.authService.getAuthenticatedUser(userId);

      if (!user) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Token không hợp lệ',
          details: [],
        });
      }

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token không hợp lệ',
        details: [],
      });
    }
  }
}
