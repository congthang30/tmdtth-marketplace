const baseUrl = process.env.MVP_BASE_URL ?? 'http://localhost:3100/api';
const password = process.env.MVP_DEMO_PASSWORD ?? 'Demo@123456';
const suffix = Date.now().toString();

async function api(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload.data;
}

const register = (email, fullName) =>
  api('/auth/register', {
    method: 'POST',
    body: { email, password, fullName, phoneNumber: '0901234567' },
  });
const login = (email) =>
  api('/auth/login', { method: 'POST', body: { email, password } });

const admin = await login('admin@example.com');
const sellerA = await register(`seller-a-${suffix}@example.com`, 'Seller A');
const sellerB = await register(`seller-b-${suffix}@example.com`, 'Seller B');
const customer = await register(`customer-${suffix}@example.com`, 'Customer');

async function createSellerCatalog(seller, label, index, categoryId) {
  const shop = await api('/shops', {
    token: seller.accessToken,
    method: 'POST',
    body: { shopName: `Acceptance Shop ${label} ${suffix}`, email: seller.user.email },
  });
  await api(`/admin/shops/${shop.id}/approve`, { token: admin.accessToken, method: 'PATCH' });
  const product = await api('/seller/products', {
    token: seller.accessToken,
    method: 'POST',
    body: { shopId: shop.id, categoryId, productName: `Acceptance Product ${label} ${suffix}`, basePrice: String(100000 + index * 10000), weightGram: 500, productStatus: 'Published' },
  });
  const variant = await api(`/seller/products/${product.id}/variants`, {
    token: seller.accessToken,
    method: 'POST',
    body: { sku: `ACC-${suffix}-${label}`, variantName: `Variant ${label}`, price: String(100000 + index * 10000), weightGram: 500, variantStatus: 'Active' },
  });
  await api(`/seller/products/${product.id}/variants/${variant.id}/inventory`, { token: seller.accessToken, method: 'PATCH', body: { quantityOnHand: 10 } });
  return { seller, shop, product, variant };
}

const category = await api('/admin/categories', { token: admin.accessToken, method: 'POST', body: { categoryName: `Acceptance ${suffix}`, slug: `acceptance-${suffix}`, isActive: true } });
const catalogA = await createSellerCatalog(sellerA, 'A', 1, category.id);
const catalogB = await createSellerCatalog(sellerB, 'B', 2, category.id);
const address = await api('/addresses', { token: customer.accessToken, method: 'POST', body: { receiverName: 'Acceptance Customer', phoneNumber: '0901234567', province: 'Thành phố Hồ Chí Minh', district: 'Quận 1', ward: 'Phường Bến Nghé', streetAddress: '1 Đường Marketplace', isDefault: true } });
const methods = await api('/payments/methods', { token: customer.accessToken });
const cod = methods.find((method) => method.methodCode === 'COD');

for (const catalog of [catalogA, catalogB]) {
  await api('/cart/items', { token: customer.accessToken, method: 'POST', body: { productVariantId: catalog.variant.id, quantity: 2 } });
}
const cart = await api('/cart', { token: customer.accessToken });
const selectedCartItemIds = cart.items.map((item) => item.id);
await api('/orders/checkout-preview', { token: customer.accessToken, method: 'POST', body: { addressId: address.id, paymentMethodId: cod.id, selectedCartItemIds } });
const order = await api('/orders', { token: customer.accessToken, method: 'POST', body: { addressId: address.id, paymentMethodId: cod.id, selectedCartItemIds } });
if (order.shopOrders.length !== 2) throw new Error('Expected two shop orders');

for (const catalog of [catalogA, catalogB]) {
  const orders = await api('/seller/orders', { token: catalog.seller.accessToken });
  const shopOrder = orders.find((item) => item.orderId === order.id);
  await api(`/seller/orders/${shopOrder.id}/confirm`, { token: catalog.seller.accessToken, method: 'PATCH', body: {} });
  await api(`/seller/orders/${shopOrder.id}/prepare`, { token: catalog.seller.accessToken, method: 'PATCH', body: {} });
  const shipment = await api(`/seller/orders/${shopOrder.id}/shipments`, {
    token: catalog.seller.accessToken,
    method: 'POST',
    body: { handoverMethod: 'Pickup' },
  });
  if (!shipment.carrierOrderCode || shipment.trackingNumber !== shipment.carrierOrderCode) {
    throw new Error('Expected a carrier-issued GHN tracking number');
  }
  await api(`/seller/orders/${shopOrder.id}/shipments/${shipment.id}/sync`, {
    token: catalog.seller.accessToken,
    method: 'POST',
  });
}

const shipping = await api(`/orders/${order.id}`, { token: customer.accessToken });
if (shipping.orderStatus !== 'Shipping') {
  throw new Error(`Expected Shipping after GHN acceptance, got ${shipping.orderStatus}`);
}

console.log(JSON.stringify({ ok: true, orderId: order.id, shopOrders: order.shopOrders.length, status: shipping.orderStatus, carrierAuthoritative: true }, null, 2));
