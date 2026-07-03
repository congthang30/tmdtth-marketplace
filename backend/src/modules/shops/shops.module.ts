import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminShopsController } from './admin-shops.controller';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ShopsController, AdminShopsController],
  providers: [ShopsService],
})
export class ShopsModule {}
