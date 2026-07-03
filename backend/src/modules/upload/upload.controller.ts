import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ensureUploadRoot,
  getUploadMaxFileSizeBytes,
} from '../../config/upload.config';
import { AppRole } from '../auth/app-role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UploadService } from './upload.service';

function getSafeExtension(file: Express.Multer.File): string {
  const originalExtension = extname(file.originalname).toLowerCase();

  if (originalExtension && originalExtension.length <= 10) {
    return originalExtension;
  }

  const mimeToExtension: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };

  return mimeToExtension[file.mimetype] ?? '';
}

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Seller)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          callback(null, ensureUploadRoot());
        },
        filename: (_request, file, callback) => {
          callback(
            null,
            `${Date.now()}-${randomUUID()}${getSafeExtension(file)}`,
          );
        },
      }),
      limits: {
        fileSize: getUploadMaxFileSizeBytes(),
      },
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException({
              code: 'UPLOAD_INVALID_FILE_TYPE',
              message: 'Chỉ hỗ trợ upload ảnh jpg, png, webp hoặc gif',
              details: [{ field: 'file', mimeType: file.mimetype }],
            }),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadFile(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({
        code: 'UPLOAD_FILE_REQUIRED',
        message: 'Vui lòng chọn file ảnh để upload',
        details: [{ field: 'file' }],
      });
    }

    this.uploadService.assertUploadedImage(file);

    return this.uploadService.createUploadResponse(file);
  }

  @Get()
  listFiles(@Query() query: PaginationQueryDto) {
    return this.uploadService.listFiles(query);
  }
}
