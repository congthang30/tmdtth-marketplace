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

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization) return true;

    const [scheme, token, extra] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token || extra) this.unauthorized();

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.authService.getAuthenticatedUser(
        BigInt(payload.sub),
      );
      if (!user) this.unauthorized();
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.unauthorized();
    }
  }

  private unauthorized(): never {
    throw new UnauthorizedException({
      code: 'UNAUTHORIZED',
      message: 'Token không hợp lệ',
      details: [],
    });
  }
}
