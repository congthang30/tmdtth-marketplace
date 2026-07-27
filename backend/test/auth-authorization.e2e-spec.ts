import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { setupApp } from '../src/common/setup-app';
import { AddressesController } from '../src/modules/addresses/addresses.controller';
import { AddressesService } from '../src/modules/addresses/addresses.service';
import { AppRole } from '../src/modules/auth/app-role.enum';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { AuthenticatedUser, JwtPayload } from '../src/modules/auth/types';
import { CartController } from '../src/modules/cart/cart.controller';
import { CartService } from '../src/modules/cart/cart.service';
import { AdminCategoriesController } from '../src/modules/categories/admin-categories.controller';
import { CategoriesService } from '../src/modules/categories/categories.service';
import { OrdersController } from '../src/modules/orders/orders.controller';
import { OrdersService } from '../src/modules/orders/orders.service';
import { SellerOrdersController } from '../src/modules/orders/seller-orders.controller';
import { PaymentsController } from '../src/modules/payments/payments.controller';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { SellerProductsController } from '../src/modules/products/seller-products.controller';
import { ProductsService } from '../src/modules/products/products.service';
import { ReviewsController } from '../src/modules/reviews/reviews.controller';
import { ReviewsService } from '../src/modules/reviews/reviews.service';
import { AdminShippingProvidersController } from '../src/modules/shipping/admin-shipping-providers.controller';
import { SellerShipmentsController } from '../src/modules/shipping/seller-shipments.controller';
import { ShippingController } from '../src/modules/shipping/shipping.controller';
import { ShippingService } from '../src/modules/shipping/shipping.service';
import { AdminShopsController } from '../src/modules/shops/admin-shops.controller';
import { ShopsController } from '../src/modules/shops/shops.controller';
import { ShopsService } from '../src/modules/shops/shops.service';
import { SellerVerificationController } from '../src/modules/seller-verification/seller-verification.controller';
import { SellerVerificationService } from '../src/modules/seller-verification/seller-verification.service';
import { AdminSellerVerificationController } from '../src/modules/seller-verification/admin-seller-verification.controller';
import { AdminSellerVerificationService } from '../src/modules/seller-verification/admin-seller-verification.service';
import { UploadController } from '../src/modules/upload/upload.controller';
import { UploadService } from '../src/modules/upload/upload.service';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';

type ErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
};

type AuthServiceMock = {
  getAuthenticatedUser: jest.Mock<Promise<AuthenticatedUser | null>, [bigint]>;
};

type JwtServiceMock = {
  verifyAsync: jest.Mock<Promise<JwtPayload>, [string]>;
};

function createUser(id: bigint, role: AppRole): AuthenticatedUser {
  return {
    id,
    idString: id.toString(),
    email: `${role.toLowerCase()}@example.com`,
    phoneNumber: null,
    userStatus: 'Active',
    roles: [role],
    profile: null,
  };
}

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
type SecuredRoute = readonly [name: string, method: HttpMethod, url: string];

const protectedRoutes: SecuredRoute[] = [
  ['auth logout', 'post', '/api/auth/logout'],
  ['auth me', 'get', '/api/auth/me'],
  ['customer role check', 'get', '/api/auth/role-check/customer'],
  ['seller role check', 'get', '/api/auth/role-check/seller'],
  ['admin role check', 'get', '/api/auth/role-check/admin'],
  ['user profile detail', 'get', '/api/users/me'],
  ['user profile update', 'patch', '/api/users/me'],
  ['address list', 'get', '/api/addresses'],
  ['address create', 'post', '/api/addresses'],
  ['address update', 'patch', '/api/addresses/1'],
  ['address delete', 'delete', '/api/addresses/1'],
  ['address default', 'patch', '/api/addresses/1/default'],
  ['admin category list', 'get', '/api/admin/categories'],
  ['admin category create', 'post', '/api/admin/categories'],
  ['admin category update', 'patch', '/api/admin/categories/1'],
  ['admin category delete', 'delete', '/api/admin/categories/1'],
  ['seller product list', 'get', '/api/seller/products'],
  ['seller product create', 'post', '/api/seller/products'],
  ['seller product update', 'patch', '/api/seller/products/1'],
  ['seller product delete', 'delete', '/api/seller/products/1'],
  ['seller variant list', 'get', '/api/seller/products/1/variants'],
  ['seller variant create', 'post', '/api/seller/products/1/variants'],
  ['seller variant update', 'patch', '/api/seller/products/1/variants/2'],
  ['seller variant delete', 'delete', '/api/seller/products/1/variants/2'],
  ['seller image list', 'get', '/api/seller/products/1/images'],
  ['seller image create', 'post', '/api/seller/products/1/images'],
  ['seller image update', 'patch', '/api/seller/products/1/images/2'],
  ['seller image delete', 'delete', '/api/seller/products/1/images/2'],
  [
    'seller inventory detail',
    'get',
    '/api/seller/products/1/variants/2/inventory',
  ],
  [
    'seller inventory update',
    'patch',
    '/api/seller/products/1/variants/2/inventory',
  ],
  ['cart detail', 'get', '/api/cart'],
  ['cart item create', 'post', '/api/cart/items'],
  ['cart item update', 'patch', '/api/cart/items/1'],
  ['cart item select', 'patch', '/api/cart/items/1/select'],
  ['cart item delete', 'delete', '/api/cart/items/1'],
  ['customer order list', 'get', '/api/orders/my'],
  ['customer order detail', 'get', '/api/orders/1'],
  ['checkout preview', 'post', '/api/orders/checkout-preview'],
  ['order create', 'post', '/api/orders'],
  ['order cancel', 'patch', '/api/orders/1/cancel'],
  ['payment method list', 'get', '/api/payments/methods'],
  ['fake payment success', 'post', '/api/payments/1/fake-success'],
  ['shop registration', 'post', '/api/shops'],
  ['admin shop approve', 'patch', '/api/admin/shops/1/approve'],
  ['admin shop reject', 'patch', '/api/admin/shops/1/reject'],
  ['admin seller verification list', 'get', '/api/admin/seller-verifications'],
  [
    'admin seller verification detail',
    'get',
    '/api/admin/seller-verifications/1',
  ],
  [
    'admin seller document access',
    'get',
    '/api/admin/seller-verifications/1/documents/2/access',
  ],
  [
    'admin seller verification start',
    'patch',
    '/api/admin/seller-verifications/1/start-review',
  ],
  [
    'admin seller verification revision',
    'patch',
    '/api/admin/seller-verifications/1/request-revision',
  ],
  [
    'admin seller verification approve',
    'patch',
    '/api/admin/seller-verifications/1/approve',
  ],
  [
    'admin seller verification reject',
    'patch',
    '/api/admin/seller-verifications/1/reject',
  ],
  ['seller order list', 'get', '/api/seller/orders'],
  ['seller order detail', 'get', '/api/seller/orders/1'],
  ['seller order confirm', 'patch', '/api/seller/orders/1/confirm'],
  ['seller order prepare', 'patch', '/api/seller/orders/1/prepare'],
  ['admin shipping provider list', 'get', '/api/admin/shipping-providers'],
  ['shipping quote create', 'post', '/api/shipping/quotes'],
  ['seller shipment create', 'post', '/api/seller/orders/1/shipments'],
  [
    'seller shipment tracking',
    'patch',
    '/api/seller/orders/1/shipments/2/tracking',
  ],
  ['product review create', 'post', '/api/reviews/products'],
  ['upload create', 'post', '/api/uploads'],
  ['upload list', 'get', '/api/uploads'],
];

// These routes are protected by authentication only (JwtAuthGuard), not
// the Seller role: the Seller role is granted once a shop reaches
// Approved status, which itself requires an Approved verification
// profile. Requiring Seller here would make onboarding impossible for
// any new seller. Authorization is instead enforced by the service layer
// scoping every query to the caller's own shop.
const ownerScopedVerificationRoutes: SecuredRoute[] = [
  ['seller verification detail', 'get', '/api/shops/verification/me'],
  ['seller verification create', 'post', '/api/shops/verification'],
  ['seller verification update', 'patch', '/api/shops/verification/me'],
  ['seller payout update', 'put', '/api/shops/payout-account/me'],
  ['seller verification submit', 'post', '/api/shops/verification/me/submit'],
  ['seller document upload', 'post', '/api/shops/verification/me/documents'],
  [
    'seller document delete',
    'delete',
    '/api/shops/verification/me/documents/1',
  ],
  [
    'seller document access',
    'get',
    '/api/shops/verification/me/documents/1/access',
  ],
];

const sellerRoutes: SecuredRoute[] = protectedRoutes.filter(
  ([name]) => name.startsWith('seller ') && name !== 'shop registration',
);
const adminRoutes: SecuredRoute[] = protectedRoutes.filter(([name]) =>
  name.startsWith('admin '),
);
const customerRoleRoutes: SecuredRoute[] = [
  ['shipping quote create', 'post', '/api/shipping/quotes'],
  ['product review create', 'post', '/api/reviews/products'],
];

describe('Authentication and role authorization (e2e)', () => {
  let app: INestApplication;
  let authService: AuthServiceMock;
  let jwtService: JwtServiceMock;
  let ordersList: jest.Mock;
  let sellerProductList: jest.Mock;
  let shippingCompanyList: jest.Mock;
  let createReview: jest.Mock;

  const users = new Map<bigint, AuthenticatedUser>([
    [1n, createUser(1n, AppRole.Customer)],
    [2n, createUser(2n, AppRole.Seller)],
    [3n, createUser(3n, AppRole.Admin)],
  ]);

  beforeAll(async () => {
    authService = {
      getAuthenticatedUser: jest.fn<
        Promise<AuthenticatedUser | null>,
        [bigint]
      >(),
    };
    jwtService = {
      verifyAsync: jest.fn<Promise<JwtPayload>, [string]>(),
    };
    ordersList = jest.fn().mockResolvedValue({
      items: [],
      message: 'Orders retrieved successfully',
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    sellerProductList = jest.fn().mockResolvedValue({
      items: [],
      message: 'Seller products retrieved successfully',
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    shippingCompanyList = jest.fn().mockResolvedValue({
      data: [],
      message: 'Carrier providers retrieved successfully',
    });
    createReview = jest.fn().mockResolvedValue({
      id: '100',
      orderItemId: '200',
      rating: 5,
      reviewStatus: 'Published',
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        UsersController,
        AddressesController,
        AdminCategoriesController,
        CartController,
        OrdersController,
        PaymentsController,
        ShopsController,
        AdminShopsController,
        SellerVerificationController,
        AdminSellerVerificationController,
        SellerProductsController,
        SellerOrdersController,
        AdminShippingProvidersController,
        ShippingController,
        SellerShipmentsController,
        ReviewsController,
        UploadController,
      ],
      providers: [
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: {} },
        { provide: AddressesService, useValue: {} },
        { provide: CategoriesService, useValue: {} },
        { provide: CartService, useValue: {} },
        {
          provide: OrdersService,
          useValue: { listMyOrders: ordersList },
        },
        {
          provide: ProductsService,
          useValue: { listSellerProducts: sellerProductList },
        },
        { provide: PaymentsService, useValue: {} },
        { provide: ShopsService, useValue: {} },
        { provide: SellerVerificationService, useValue: {} },
        { provide: AdminSellerVerificationService, useValue: {} },
        {
          provide: ShippingService,
          useValue: {
            listCarrierProviders: shippingCompanyList,
            createShippingQuote: jest.fn(),
          },
        },
        {
          provide: ReviewsService,
          useValue: { createProductReview: createReview },
        },
        { provide: UploadService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jwtService.verifyAsync.mockImplementation((token) => {
      const subjectByToken: Record<string, string> = {
        'customer-token': '1',
        'seller-token': '2',
        'admin-token': '3',
        'missing-user-token': '999',
      };
      const subject = subjectByToken[token];

      if (!subject) {
        return Promise.reject(new Error('Invalid token'));
      }

      return Promise.resolve({ sub: subject, email: 'actor@example.com' });
    });
    authService.getAuthenticatedUser.mockImplementation((userId) =>
      Promise.resolve(users.get(userId) ?? null),
    );
    ordersList.mockClear();
    sellerProductList.mockClear();
    shippingCompanyList.mockClear();
    createReview.mockClear();
  });

  it.each([...protectedRoutes, ...ownerScopedVerificationRoutes])(
    'returns 401 without a token on %s',
    async (_name, method, url) => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];

      await request(server)
        [method](url)
        .expect(401)
        .expect((response) => {
          const body = response.body as ErrorBody;

          expect(body.success).toBe(false);
          expect(body.error.code).toBe('UNAUTHORIZED');
        });
    },
  );

  it.each(sellerRoutes)(
    'returns 403 when a customer calls %s',
    async (_name, method, url) => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];

      await request(server)
        [method](url)
        .set('Authorization', 'Bearer customer-token')
        .expect(403);
    },
  );

  it.each(adminRoutes)(
    'returns 403 when a seller calls %s',
    async (_name, method, url) => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];

      await request(server)
        [method](url)
        .set('Authorization', 'Bearer seller-token')
        .expect(403);
    },
  );

  it.each(customerRoleRoutes)(
    'returns 403 when a seller calls customer-only %s',
    async (_name, method, url) => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];

      await request(server)
        [method](url)
        .set('Authorization', 'Bearer seller-token')
        .expect(403);
    },
  );

  it.each(ownerScopedVerificationRoutes)(
    'never returns 403 for an authenticated customer without a shop on %s (owner-scoped, not role-gated)',
    async (_name, method, url) => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];

      const response = await request(server)
        [method](url)
        .set('Authorization', 'Bearer customer-token');

      expect(response.status).not.toBe(403);
    },
  );

  it.each(['invalid-token', 'missing-user-token'])(
    'returns 401 for rejected bearer token %s',
    async (token) => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];

      await request(server)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${token}`)
        .expect(401)
        .expect((response) => {
          const body = response.body as ErrorBody;

          expect(body.error.code).toBe('UNAUTHORIZED');
        });

      expect(ordersList).not.toHaveBeenCalled();
    },
  );

  it('allows a customer token to reach a customer order route', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get('/api/orders/my')
      .set('Authorization', 'Bearer customer-token')
      .expect(200);

    expect(ordersList).toHaveBeenCalledWith(
      users.get(1n),
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('returns 403 when a customer token calls a seller route', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get('/api/seller/products')
      .set('Authorization', 'Bearer customer-token')
      .expect(403)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.error.code).toBe('FORBIDDEN');
      });

    expect(sellerProductList).not.toHaveBeenCalled();
  });

  it('allows a seller token and injects the authenticated seller', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get('/api/seller/products')
      .set('Authorization', 'Bearer seller-token')
      .expect(200);

    expect(sellerProductList).toHaveBeenCalledWith(
      users.get(2n),
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('returns 403 when a seller token calls an admin route', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get('/api/admin/shipping-providers')
      .set('Authorization', 'Bearer seller-token')
      .expect(403);

    expect(shippingCompanyList).not.toHaveBeenCalled();
  });

  it('allows an admin token to reach an admin route', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get('/api/admin/shipping-providers')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(shippingCompanyList).toHaveBeenCalledWith();
  });

  it('returns 403 before DTO validation when a seller calls a customer route', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/shipping/quotes')
      .set('Authorization', 'Bearer seller-token')
      .send({})
      .expect(403)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.error.code).toBe('FORBIDDEN');
      });
  });

  it('allows a customer token to create a review', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/reviews/products')
      .set('Authorization', 'Bearer customer-token')
      .send({ orderItemId: '200', rating: 5 })
      .expect(201);

    expect(createReview).toHaveBeenCalledWith(users.get(1n), {
      orderItemId: '200',
      rating: 5,
    });
  });
});
