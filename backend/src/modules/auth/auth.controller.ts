import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AppRole } from './app-role.enum';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthenticatedUser } from './types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout() {
    return { loggedOut: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.toResponseUser(user);
  }

  @Get('role-check/customer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.Customer)
  customerRoleCheck(@CurrentUser() user: AuthenticatedUser) {
    return {
      role: AppRole.Customer,
      allowed: true,
      user: this.authService.toResponseUser(user),
    };
  }

  @Get('role-check/seller')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.Seller)
  sellerRoleCheck(@CurrentUser() user: AuthenticatedUser) {
    return {
      role: AppRole.Seller,
      allowed: true,
      user: this.authService.toResponseUser(user),
    };
  }

  @Get('role-check/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.Admin)
  adminRoleCheck(@CurrentUser() user: AuthenticatedUser) {
    return {
      role: AppRole.Admin,
      allowed: true,
      user: this.authService.toResponseUser(user),
    };
  }
}
