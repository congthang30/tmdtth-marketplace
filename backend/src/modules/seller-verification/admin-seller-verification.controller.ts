import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AppRole } from '../auth/app-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { AdminSellerVerificationService } from './admin-seller-verification.service';
import {
  AdminSellerVerificationQueryDto,
  ReviewReasonDto,
} from './dto/admin-seller-verification.dto';

@Controller('admin/seller-verifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Admin)
export class AdminSellerVerificationController {
  constructor(private readonly service: AdminSellerVerificationService) {}

  @Get()
  list(@Query() query: AdminSellerVerificationQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  detail(@Param('id') profileId: string) {
    return this.service.detail(profileId);
  }

  @Get(':id/documents/:documentId/access')
  accessDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') profileId: string,
    @Param('documentId') documentId: string,
    @Req() request: Request,
  ) {
    return this.service.accessDocument(user, profileId, documentId, {
      ipAddress: request.ip?.slice(0, 64) ?? null,
      userAgent: request.get('user-agent')?.slice(0, 500) ?? null,
    });
  }


  @Patch(':id/request-revision')
  requestRevision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') profileId: string,
    @Body() dto: ReviewReasonDto,
  ) {
    return this.service.requestRevision(user, profileId, dto);
  }

  @Patch(':id/approve')
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') profileId: string,
  ) {
    return this.service.approve(user, profileId);
  }

  @Patch(':id/reject')
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') profileId: string,
    @Body() dto: ReviewReasonDto,
  ) {
    return this.service.reject(user, profileId, dto);
  }
}
