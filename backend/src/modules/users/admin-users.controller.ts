import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UsersService } from './users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Admin)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query() query: AdminUserQueryDto) {
    return this.usersService.listAdminUsers(query);
  }

  @Patch(':id')
  update(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.adminUpdateUser(admin, id, dto);
  }

  @Patch(':id/suspend')
  suspend(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.setUserStatus(admin, id, 'Suspended');
  }

  @Patch(':id/activate')
  activate(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.setUserStatus(admin, id, 'Active');
  }

  @Delete(':id')
  remove(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.adminDeleteUser(admin, id);
  }
}
