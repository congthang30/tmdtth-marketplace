import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ShippingService } from './shipping.service';

/**
 * Read-only view of the fixed GHN/GHTK carrier registry for admins,
 * including live isConfigured/connectivity status. Carriers are static
 * platform-level entities (see prisma schema ShippingCompany.provider);
 * there is no create/update/delete here since providers can no longer be
 * registered by end users.
 */
@Controller('admin/shipping-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Admin)
export class AdminShippingProvidersController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get()
  listCarrierProviders() {
    return this.shippingService.listCarrierProviders();
  }
}
