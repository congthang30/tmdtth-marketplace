import { Injectable } from '@nestjs/common';
import { CarrierClient, CarrierProvider } from './carrier.types';
import { GhnClient } from './ghn.client';

/**
 * Resolves the correct CarrierClient implementation for a given provider
 * code (as stored on ShippingCompany.provider). GHN is currently the only
 * supported carrier; GHTK integration was removed since the platform does
 * not have GHTK production/sandbox credentials.
 */
@Injectable()
export class CarrierRegistry {
  constructor(private readonly ghnClient: GhnClient) {}

  getClient(provider: string): CarrierClient {
    switch (provider as CarrierProvider) {
      case 'GHN':
        return this.ghnClient;
      default:
        throw new Error(`Unsupported shipping carrier provider: ${provider}`);
    }
  }

  getAllClients(): CarrierClient[] {
    return [this.ghnClient];
  }
}
