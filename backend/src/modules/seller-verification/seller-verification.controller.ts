import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { getSellerDocumentMaxFileSizeBytes } from '../../config/seller-verification.config';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AppRole } from '../auth/app-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import {
  SaveSellerPayoutAccountDto,
  SaveSellerVerificationDto,
} from './dto/save-seller-verification.dto';
import { UploadSellerDocumentDto } from './dto/upload-seller-document.dto';
import { SellerVerificationService } from './seller-verification.service';

@Controller('shops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Seller)
export class SellerVerificationController {
  constructor(private readonly service: SellerVerificationService) {}

  @Get('verification/me')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getMine(user);
  }

  @Post('verification')
  createDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveSellerVerificationDto,
  ) {
    return this.service.saveMine(user, dto);
  }

  @Patch('verification/me')
  updateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveSellerVerificationDto,
  ) {
    return this.service.saveMine(user, dto);
  }

  @Put('payout-account/me')
  savePayout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveSellerPayoutAccountDto,
  ) {
    return this.service.savePayout(user, dto);
  }

  @Post('verification/me/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: getSellerDocumentMaxFileSizeBytes() },
    }),
  )
  uploadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadSellerDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'SELLER_DOCUMENT_REQUIRED',
        message: 'Vui lòng chọn tài liệu xác minh.',
        details: [{ field: 'file' }],
      });
    }
    return this.service.uploadDocument(user, dto.documentType, file);
  }

  @Get('verification/me/documents/:id/access')
  accessDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') documentId: string,
    @Req() request: Request,
  ) {
    return this.service.accessMyDocument(user, documentId, {
      ipAddress: request.ip?.slice(0, 64) ?? null,
      userAgent: request.get('user-agent')?.slice(0, 500) ?? null,
    });
  }

  @Delete('verification/me/documents/:id')
  deleteDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') documentId: string,
  ) {
    return this.service.deleteMyDocument(user, documentId);
  }

  @Post('verification/me/submit')
  submit(@CurrentUser() user: AuthenticatedUser) {
    return this.service.submitMine(user);
  }
}
