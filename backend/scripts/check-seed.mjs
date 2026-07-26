import { createPrismaClient } from './prisma-client.mjs';

const prisma = createPrismaClient();

const expectedUserEmails = [
  'admin@example.com',
  'seller@example.com',
  'customer@example.com',
  'shipper@example.com',
];

const expectedPaymentMethods = ['COD', 'FAKE_ONLINE'];

const expectedCategorySlugs = [
  'do-nha-bep',
  'noi-chao',
  'may-xay',
  'hop-dung-thuc-pham',
  'do-phong-khach',
  'den-trang-tri',
  'ke-tu',
  'do-phong-ngu',
  'chan-ga-goi',
  'den-ngu',
  'do-ve-sinh',
  'ke-nha-tam',
  'dung-cu-ve-sinh',
  'thiet-bi-gia-dung-nho',
  'may-hut-bui',
  'ban-ui',
  'may-say',
];

const expectedShippingCompanySlugs = [
  'giao-hang-demo',
  'nhanh-express-demo',
];

const expectedAttributes = [
  ['noi-chao', 'Chất liệu'],
  ['noi-chao', 'Đường kính'],
  ['den-trang-tri', 'Màu ánh sáng'],
  ['den-ngu', 'Màu sắc'],
  ['den-ngu', 'Công suất'],
  ['chan-ga-goi', 'Kích thước'],
  ['thiet-bi-gia-dung-nho', 'Công suất'],
];

const expectedVariantStocks = {
  'NOI-INOX-20CM': 50,
  'NOI-INOX-24CM': 30,
  'DEN-NGU-VANG': 100,
};

function assert(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

async function main() {
  const failures = [];

  const users = await prisma.user.findMany({
    where: { email: { in: expectedUserEmails } },
    include: { profile: true },
  });

  assert(
    users.length === expectedUserEmails.length,
    `Expected ${expectedUserEmails.length} demo users, found ${users.length}.`,
    failures,
  );
  assert(
    users.every((user) => user.userStatus === 'Active' && user.profile),
    'Every demo user must be active and have a profile.',
    failures,
  );

  const paymentMethodCount = await prisma.paymentMethod.count({
    where: { methodCode: { in: expectedPaymentMethods }, isActive: true },
  });
  assert(
    paymentMethodCount === expectedPaymentMethods.length,
    `Expected ${expectedPaymentMethods.length} active payment methods, found ${paymentMethodCount}.`,
    failures,
  );

  const categoryCount = await prisma.category.count({
    where: { slug: { in: expectedCategorySlugs }, isActive: true },
  });
  assert(
    categoryCount === expectedCategorySlugs.length,
    `Expected ${expectedCategorySlugs.length} active categories, found ${categoryCount}.`,
    failures,
  );

  const categoriesWithAttributes = await prisma.category.findMany({
    where: {
      slug: { in: expectedAttributes.map(([categorySlug]) => categorySlug) },
    },
    include: { attributes: true },
  });
  const seededAttributeKeys = new Set(
    categoriesWithAttributes.flatMap((category) =>
      category.attributes.map(
        (attribute) => `${category.slug}:${attribute.attributeName}`,
      ),
    ),
  );
  const missingAttributes = expectedAttributes.filter(
    ([categorySlug, attributeName]) =>
      !seededAttributeKeys.has(`${categorySlug}:${attributeName}`),
  );
  assert(
    missingAttributes.length === 0,
    `Missing product attributes: ${missingAttributes
      .map(([categorySlug, attributeName]) => `${categorySlug}:${attributeName}`)
      .join(', ')}`,
    failures,
  );

  const shippingCompanies = await prisma.shippingCompany.findMany({
    where: {
      slug: { in: expectedShippingCompanySlugs },
      companyStatus: 'Approved',
      isDeleted: false,
    },
    include: { services: true },
  });
  assert(
    shippingCompanies.length === expectedShippingCompanySlugs.length,
    `Expected ${expectedShippingCompanySlugs.length} approved shipping companies, found ${shippingCompanies.length}.`,
    failures,
  );

  const serviceCount = shippingCompanies.reduce(
    (total, company) =>
      total + company.services.filter((service) => service.isActive).length,
    0,
  );
  assert(serviceCount >= 3, `Expected at least 3 active shipping services, found ${serviceCount}.`, failures);

  const shop = await prisma.shop.findUnique({
    where: { slug: 'gia-dung-thang-nguyen' },
  });
  assert(Boolean(shop), 'Expected approved demo shop.', failures);
  assert(shop?.shopStatus === 'Approved', 'Demo shop must be Approved.', failures);

  const verification = shop
    ? await prisma.sellerVerificationProfile.findUnique({
        where: { shopId: shop.id },
      })
    : null;
  const payout = shop
    ? await prisma.sellerPayoutAccount.findUnique({ where: { shopId: shop.id } })
    : null;
  assert(
    verification?.verificationStatus === 'Approved',
    'Demo shop seller verification must be Approved.',
    failures,
  );
  assert(
    payout?.payoutStatus === 'Verified' && payout.isActive,
    'Demo shop payout account must be active and Verified.',
    failures,
  );
  assert(
    verification?.identityNumberEncrypted.startsWith('v1.') &&
      verification.taxCodeEncrypted.startsWith('v1.') &&
      payout?.accountNumberEncrypted.startsWith('v1.'),
    'Demo sensitive seller data must use versioned encryption payloads.',
    failures,
  );
  assert(
    !verification?.identityNumberEncrypted.includes('079203012345') &&
      !verification?.taxCodeEncrypted.includes('0312345678') &&
      !payout?.accountNumberEncrypted.includes('123456789012'),
    'Demo sensitive seller data must not contain plaintext values.',
    failures,
  );

  const products = await prisma.product.findMany({
    where: {
      slug: { in: ['noi-inox-3-lop', 'den-ngu-cam-ung'] },
      productStatus: 'Published',
      isDeleted: false,
    },
    include: {
      images: true,
      variants: {
        include: {
          inventoryRecords: true,
        },
      },
    },
  });

  assert(products.length === 2, `Expected 2 published demo products, found ${products.length}.`, failures);
  assert(
    products.every((product) =>
      product.images.some((image) => image.isThumbnail),
    ),
    'Every demo product must have a thumbnail image.',
    failures,
  );

  const variants = products.flatMap((product) => product.variants);
  for (const [sku, expectedStock] of Object.entries(expectedVariantStocks)) {
    const variant = variants.find((item) => item.sku === sku);
    const inventory = variant?.inventoryRecords[0];

    assert(Boolean(variant), `Expected variant ${sku}.`, failures);
    assert(
      inventory?.quantityOnHand === expectedStock &&
        inventory?.quantityAvailable === expectedStock &&
        inventory?.quantityReserved === 0,
      `Expected inventory for ${sku} to be onHand=${expectedStock}, available=${expectedStock}, reserved=0.`,
      failures,
    );
  }

  const seedInventoryTransactionCount =
    await prisma.inventoryTransaction.count({
      where: {
        transactionType: 'SEED_STOCK',
        referenceType: 'SEED',
      },
    });
  assert(
    seedInventoryTransactionCount >= Object.keys(expectedVariantStocks).length,
    'Expected seed inventory transactions for every demo variant.',
    failures,
  );

  if (failures.length > 0) {
    console.error('Seed check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        users: users.length,
        paymentMethods: paymentMethodCount,
        categories: categoryCount,
        productAttributes: expectedAttributes.length,
        shippingCompanies: shippingCompanies.length,
        shippingServices: serviceCount,
        demoProducts: products.length,
        demoVariants: variants.length,
        seedInventoryTransactions: seedInventoryTransactionCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
