import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { SearchService } from './search.service';

const scopes = [
  'all',
  'product',
  'variant',
  'order',
  'shop-category',
  'sale-campaign',
] as const;
type SearchScope = (typeof scopes)[number];
const parse = (q?: string, limit?: string, scope?: string) => ({
  q: (q ?? '').trim().slice(0, 100),
  limit: Math.min(10, Math.max(1, Number(limit) || 8)),
  scope: scopes.includes(scope as SearchScope)
    ? (scope as SearchScope)
    : ('all' as SearchScope),
});

@Controller('search/suggestions')
export class PublicSearchController {
  constructor(private readonly service: SearchService) {}
  @Get() suggest(@Query('q') q?: string, @Query('limit') limit?: string) {
    const input = parse(q, limit);
    return input.q.length < 2
      ? []
      : this.service.customer(input.q, input.limit);
  }
}

@Controller('seller/search/suggestions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Seller)
export class SellerSearchController {
  constructor(private readonly service: SearchService) {}
  @Get() suggest(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('scope') scope?: string,
  ) {
    const input = parse(q, limit, scope);
    return input.q.length < 2
      ? []
      : this.service.seller(user, input.q, input.limit, input.scope);
  }
}

@Controller('admin/search/suggestions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Admin)
export class AdminSearchController {
  constructor(private readonly service: SearchService) {}
  @Get() suggest(@Query('q') q?: string, @Query('limit') limit?: string) {
    const input = parse(q, limit);
    return input.q.length < 2 ? [] : this.service.admin(input.q, input.limit);
  }
}
