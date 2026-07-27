import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminSearchController, PublicSearchController, SellerSearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({ imports: [PrismaModule, AuthModule], controllers: [PublicSearchController, SellerSearchController, AdminSearchController], providers: [SearchService] })
export class SearchModule {}
