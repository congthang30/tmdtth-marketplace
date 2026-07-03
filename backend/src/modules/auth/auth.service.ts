import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { getJwtExpiresIn } from '../../config/jwt.config';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRolesService } from './app-roles.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser, AuthUserResponse, JwtPayload } from './types';

type UserWithProfile =
  Awaited<ReturnType<AuthService['findUserByEmail']>> extends infer T
    ? NonNullable<T>
    : never;

const BLOCKED_USER_STATUSES = new Set(['Suspended', 'Deleted']);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly appRolesService: AppRolesService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException({
        code: 'EMAIL_EXISTS',
        message: 'Email đã được sử dụng',
        details: [{ field: 'email' }],
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        phoneNumber: dto.phoneNumber?.trim() || null,
        passwordHash,
        userStatus: 'Active',
        emailConfirmed: true,
        phoneConfirmed: Boolean(dto.phoneNumber),
        profile: {
          create: {
            fullName: dto.fullName.trim(),
          },
        },
      },
      include: { profile: true },
    });

    return this.createAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.findUserByEmail(email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không đúng',
        details: [],
      });
    }

    if (user.isDeleted || BLOCKED_USER_STATUSES.has(user.userStatus)) {
      throw new UnauthorizedException({
        code: 'USER_LOCKED',
        message: 'Tài khoản không thể đăng nhập',
        details: [],
      });
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không đúng',
        details: [],
      });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), updatedAt: new Date() },
      include: { profile: true },
    });

    return this.createAuthResponse(updatedUser);
  }

  async getAuthenticatedUser(
    userId: bigint,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || user.isDeleted || BLOCKED_USER_STATUSES.has(user.userStatus)) {
      return null;
    }

    return this.toAuthenticatedUser(user);
  }

  toResponseUser(user: AuthenticatedUser): AuthUserResponse {
    return {
      id: user.idString,
      idString: user.idString,
      email: user.email,
      phoneNumber: user.phoneNumber,
      userStatus: user.userStatus,
      roles: user.roles,
      profile: user.profile,
    };
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  private async createAuthResponse(user: UserWithProfile) {
    const authenticatedUser = await this.toAuthenticatedUser(user);
    const payload: JwtPayload = {
      sub: authenticatedUser.idString,
      email: authenticatedUser.email,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: getJwtExpiresIn(),
      user: this.toResponseUser(authenticatedUser),
    };
  }

  private async toAuthenticatedUser(
    user: UserWithProfile,
  ): Promise<AuthenticatedUser> {
    const roles = await this.appRolesService.getRolesForUser({
      id: user.id,
      email: user.email,
    });

    return {
      id: user.id,
      idString: user.id.toString(),
      email: user.email,
      phoneNumber: user.phoneNumber,
      userStatus: user.userStatus,
      roles,
      profile: user.profile
        ? {
            fullName: user.profile.fullName,
            avatarUrl: user.profile.avatarUrl,
          }
        : null,
    };
  }
}
