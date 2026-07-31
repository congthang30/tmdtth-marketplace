import { AppRole } from '../../auth/app-role.enum';
import { AuthenticatedUser } from '../../auth/types';
import { ToolDispatcher } from './tool-dispatcher';

describe('ToolDispatcher', () => {
  const customer: AuthenticatedUser = {
    id: 42n,
    idString: '42',
    email: 'customer@example.com',
    phoneNumber: null,
    userStatus: 'Active',
    roles: [AppRole.Customer],
    profile: null,
  };

  const products = {
    listPublicProducts: jest.fn(),
    getPublicProductDetail: jest.fn(),
  };
  const cart = {
    getMyCart: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
  };
  const orders = {
    listMyOrders: jest.fn(),
    getMyOrderDetail: jest.fn(),
    cancelMyOrder: jest.fn(),
  };
  const addresses = { listMyAddresses: jest.fn() };
  const reviews = { listPublicProductReviews: jest.fn() };
  const vouchers = { listAvailableVouchers: jest.fn() };
  const shipping = { listActiveShippingServices: jest.fn() };

  const dispatcher = new ToolDispatcher(
    products as never,
    cart as never,
    orders as never,
    addresses as never,
    reviews as never,
    vouchers as never,
    shipping as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects unknown tools before calling a service', async () => {
    await expect(
      dispatcher.dispatch(customer, 'delete_everything', '{}'),
    ).rejects.toMatchObject({ response: { code: 'CHAT_TOOL_NOT_ALLOWED' } });
    expect(products.listPublicProducts).not.toHaveBeenCalled();
  });

  it('allows a guest to use only public tools', async () => {
    products.getPublicProductDetail.mockResolvedValue({ slug: 'gao-st25' });

    await expect(
      dispatcher.dispatch(undefined, 'get_product', '{"slug":"gao-st25"}'),
    ).resolves.toEqual({ slug: 'gao-st25' });
    await expect(
      dispatcher.dispatch(undefined, 'get_cart', '{}'),
    ).rejects.toMatchObject({ response: { code: 'CHAT_LOGIN_REQUIRED' } });
  });

  it('passes the server actor to private services', async () => {
    cart.getMyCart.mockResolvedValue({ items: [] });

    await dispatcher.dispatch(customer, 'get_cart', '{}');

    expect(cart.getMyCart).toHaveBeenCalledWith(customer);
  });

  it('rejects roles outside the tool policy', async () => {
    const seller = { ...customer, roles: [AppRole.Seller] };

    await expect(
      dispatcher.dispatch(seller, 'list_my_orders', '{"page":1,"limit":10}'),
    ).rejects.toMatchObject({ response: { code: 'CHAT_TOOL_FORBIDDEN' } });
  });

  it('strictly validates arguments and rejects model-supplied identity', async () => {
    await expect(
      dispatcher.dispatch(customer, 'get_cart', '{"userId":"999"}'),
    ).rejects.toMatchObject({ response: { code: 'CHAT_TOOL_INVALID_INPUT' } });
    expect(cart.getMyCart).not.toHaveBeenCalled();
  });

  it('does not execute confirmation-required tools through dispatch', async () => {
    await expect(
      dispatcher.dispatch(
        customer,
        'add_cart_item',
        '{"productVariantId":"7","quantity":1}',
      ),
    ).rejects.toMatchObject({
      response: { code: 'CHAT_CONFIRMATION_REQUIRED' },
    });
    expect(cart.addItem).not.toHaveBeenCalled();
  });

  it('removes nested order PII before returning tool output', async () => {
    orders.getMyOrderDetail.mockResolvedValue({
      id: '1',
      orderCode: 'ORD-1',
      orderStatus: 'Created',
      paymentStatus: 'Pending',
      receiverName: 'Sensitive Name',
      receiverPhone: '0900000000',
      shippingAddress: { streetAddress: 'Sensitive street' },
      subtotalAmount: '100000',
      discountAmount: '0',
      shippingFeeAmount: '20000',
      totalAmount: '120000',
      customerNote: 'Sensitive note',
      shopOrders: [
        {
          id: '2',
          shopOrderCode: 'SHOP-1',
          shop: { id: '3', shopName: 'Gian hàng A', slug: 'gian-hang-a' },
          orderStatus: 'Created',
          items: [],
          shipments: [
            { shipmentCode: 'S-1', pickupStation: { address: 'PII' } },
          ],
        },
      ],
      payments: [{ paymentCode: 'PAY-1', providerName: 'internal-provider' }],
    });

    const result = await dispatcher.dispatch(
      customer,
      'get_my_order',
      '{"orderId":"1"}',
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('Sensitive');
    expect(serialized).not.toContain('0900000000');
    expect(serialized).not.toContain('internal-provider');
    expect(serialized).not.toContain('pickupStation');
    expect(serialized).toContain('ORD-1');
  });

  it('executes an approved mutation exactly once', async () => {
    cart.addItem.mockResolvedValue({ id: '9' });

    await dispatcher.dispatchConfirmed(
      customer,
      'add_cart_item',
      '{"productVariantId":"7","quantity":1}',
    );

    expect(cart.addItem).toHaveBeenCalledTimes(1);
    expect(cart.addItem).toHaveBeenCalledWith(customer, {
      productVariantId: '7',
      quantity: 1,
    });
  });
});
