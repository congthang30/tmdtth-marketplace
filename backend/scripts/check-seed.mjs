import { createPrismaClient } from './prisma-client.mjs';

const prisma = createPrismaClient();

const expectedUserEmails = [
  'admin@example.com',
  'seller@example.com',
  'customer@example.com',
];
const expectedPaymentMethods = ['COD', 'VNPAY'];
const expectedCounts = {
  users: 3,
  categories: 5,
  shops: 1,
  products: 5,
  variants: 10,
  vouchers: 0,
};

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

async function main() {
  const failures = [];
  const [users, totalUserCount] = await Promise.all([
    prisma.user.findMany({
      where: { email: { in: expectedUserEmails } },
      include: { profile: true },
    }),
    prisma.user.count(),
  ]);
  assert(
    users.length === expectedUserEmails.length &&
      totalUserCount === expectedCounts.users,
    `Expected exactly ${expectedCounts.users} demo users, found ${totalUserCount}.`,
    failures,
  );
  assert(
    users.every((user) => user.userStatus === 'Active' && user.profile),
    'Every demo user must be active and have a profile.',
    failures,
  );

  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { methodCode: { in: [...expectedPaymentMethods, 'FAKE_ONLINE'] } },
  });
  assert(
    expectedPaymentMethods.every((code) =>
      paymentMethods.some(
        (method) => method.methodCode === code && method.isActive,
      ),
    ),
    'COD and VNPAY must be active.',
    failures,
  );
  assert(
    paymentMethods.every(
      (method) => method.methodCode !== 'FAKE_ONLINE' || !method.isActive,
    ),
    'FAKE_ONLINE must not be active.',
    failures,
  );

  const [categoryCount, shopCount, productCount, variants, voucherCount] =
    await Promise.all([
      prisma.category.count({ where: { isActive: true } }),
      prisma.shop.count({
        where: { shopStatus: 'Approved', isDeleted: false },
      }),
      prisma.product.count({
        where: { productStatus: 'Published', isDeleted: false },
      }),
      prisma.productVariant.findMany({
        include: { inventoryRecords: true },
      }),
      prisma.voucher.count(),
    ]);
  assert(
    categoryCount === expectedCounts.categories,
    `Expected ${expectedCounts.categories} active categories, found ${categoryCount}.`,
    failures,
  );
  assert(
    shopCount === expectedCounts.shops,
    `Expected ${expectedCounts.shops} approved shops, found ${shopCount}.`,
    failures,
  );
  assert(
    productCount === expectedCounts.products,
    `Expected ${expectedCounts.products} published products, found ${productCount}.`,
    failures,
  );
  assert(
    variants.length === expectedCounts.variants,
    `Expected ${expectedCounts.variants} variants, found ${variants.length}.`,
    failures,
  );
  assert(
    voucherCount === expectedCounts.vouchers,
    `Expected no demo vouchers, found ${voucherCount}.`,
    failures,
  );
  assert(
    variants.every(
      (variant) =>
        variant.attributes &&
        typeof variant.attributes === 'object' &&
        !Array.isArray(variant.attributes) &&
        Object.keys(variant.attributes).length > 0,
    ),
    'Every variant must have a non-empty attributes object.',
    failures,
  );
  assert(
    variants.every(
      (variant) =>
        variant.inventoryRecords.length === 1 &&
        variant.inventoryRecords[0].quantityOnHand >= 0 &&
        variant.inventoryRecords[0].quantityAvailable >= 0 &&
        variant.inventoryRecords[0].quantityReserved === 0,
    ),
    'Every variant must have one valid inventory record.',
    failures,
  );

  const fashionMatrix = variants.filter(
    (variant) =>
      variant.attributes?.['Màu sắc'] && variant.attributes?.['Kích cỡ'],
  );
  const expectedFashionCombinations = new Set(
    ['Đen', 'Đỏ'].flatMap((color) =>
      ['XS', 'XL', 'XXL'].map((size) => `${color}|${size}`),
    ),
  );
  assert(
    fashionMatrix.length === expectedFashionCombinations.size &&
      fashionMatrix.every((variant) =>
        expectedFashionCombinations.has(
          `${variant.attributes['Màu sắc']}|${variant.attributes['Kích cỡ']}`,
        ),
      ),
    'The fashion product must have the complete 2-color x 3-size matrix.',
    failures,
  );
  assert(
    fashionMatrix.some(
      (variant) =>
        variant.attributes['Màu sắc'] === 'Đỏ' &&
        variant.attributes['Kích cỡ'] === 'XL' &&
        variant.inventoryRecords[0]?.quantityAvailable === 0,
    ),
    'The fashion matrix must include the out-of-stock Red/XL selector case.',
    failures,
  );

  const duplicateCombinations = await prisma.$queryRaw`
    SELECT COUNT(*)::integer AS count
    FROM (
      SELECT "ProductID", "Attributes"
      FROM "ProductVariants"
      GROUP BY "ProductID", "Attributes"
      HAVING COUNT(*) > 1
    ) duplicates
  `;
  assert(
    duplicateCombinations[0]?.count === 0,
    'Variant attributes must be unique within each product.',
    failures,
  );

  const shippingCompany = await prisma.shippingCompany.findUnique({
    where: { slug: 'ghn' },
    include: { services: { where: { isActive: true } } },
  });
  assert(
    shippingCompany?.companyStatus === 'Approved' && !shippingCompany.isDeleted,
    'GHN must be approved and active.',
    failures,
  );
  assert(
    shippingCompany?.services.length === 2,
    `Expected 2 active GHN services, found ${shippingCompany?.services.length ?? 0}.`,
    failures,
  );

  const verification = await prisma.sellerVerificationProfile.findFirst({
    where: { verificationStatus: 'Approved' },
  });
  assert(
    Boolean(verification),
    'Expected one approved seller verification.',
    failures,
  );
  assert(
    verification?.identityNumberEncrypted.startsWith('v1.') &&
      verification.taxCodeEncrypted.startsWith('v1.'),
    'Demo sensitive seller data must use versioned encryption payloads.',
    failures,
  );

  const seedInventoryTransactionCount = await prisma.inventoryTransaction.count(
    {
      where: { transactionType: 'SEED_STOCK', referenceType: 'SEED' },
    },
  );
  assert(
    seedInventoryTransactionCount === expectedCounts.variants,
    `Expected ${expectedCounts.variants} seed inventory transactions, found ${seedInventoryTransactionCount}.`,
    failures,
  );

  if (failures.length > 0) {
    console.error('Seed check failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        users: totalUserCount,
        paymentMethods: expectedPaymentMethods.length,
        categories: categoryCount,
        shops: shopCount,
        shippingServices: shippingCompany.services.length,
        products: productCount,
        variants: variants.length,
        vouchers: voucherCount,
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
