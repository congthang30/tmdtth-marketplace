import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import {
  SaveSellerContactDto,
  SaveSellerVerificationDto,
} from './dto/save-seller-verification.dto';
import { UploadSellerDocumentDto } from './dto/upload-seller-document.dto';
import {
  SendSellerEmailCodeDto,
  VerifySellerEmailCodeDto,
} from './dto/seller-email-verification.dto';
import { SellerVerificationEmailService } from './seller-verification-email.service';
import { SellerVerificationService } from './seller-verification.service';

// Intentionally requires only authentication (JwtAuthGuard), not the
// Seller role. The Seller role is granted once a shop is Approved, and a
// shop can only be Approved once its verification profile is Approved by
// an admin (see ShopsService.approveShop). Requiring Seller here would
// make it impossible for any new seller to ever start or complete
// verification. Every operation below is instead scoped to the caller's
// own shop via SellerVerificationService.findOwnedShop, which is the
// actual authorization boundary (an authenticated user with no owned
// shop gets 404, never another user's data).
@Controller('shops')
@UseGuards(JwtAuthGuard)
export class SellerVerificationController {
  constructor(
    private readonly service: SellerVerificationService,
    private readonly emailService: SellerVerificationEmailService,
  ) {}

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

  @Patch('verification/me/contact')
  updateContact(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveSellerContactDto,
  ) {
    return this.service.saveContact(user, dto);
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

  @Post('verification/me/email/send-code')
  sendEmailCode(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendSellerEmailCodeDto,
    @Req() request: Request,
  ) {
    return this.emailService.sendCode(
      user.id,
      dto.email,
      request.ip?.slice(0, 64) ?? 'unknown',
    );
  }

  @Post('verification/me/email/verify-code')
  async verifyEmailCode(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifySellerEmailCodeDto,
  ) {
    if (
      !(await this.emailService.verifyCode(
        user.id,
        dto.email,
        dto.challengeId,
        dto.code,
      ))
    ) {
      throw new BadRequestException({
        code: 'EMAIL_VERIFICATION_CODE_INVALID',
        message: 'Mã xác minh không đúng hoặc đã hết hạn.',
        details: [{ field: 'code' }],
      });
    }
    return this.service.confirmContactEmail(user, dto.email);
  }

  @Post('verification/me/submit')
  submit(@CurrentUser() user: AuthenticatedUser) {
    return this.service.submitMine(user);
  }
}
