import bcrypt from 'bcryptjs';
import { createCipheriv, createHmac, randomBytes } from 'node:crypto';

import { createPrismaClient } from '../scripts/prisma-client.mjs';

let prisma = createPrismaClient();
const now = () => new Date();
const demoPassword = 'Demo@123456';
const sellerEncryptionPayloadVersion = 'v1';

function sellerEncryptionKey() {
  const activeKeyId = process.env.SELLER_DATA_ACTIVE_KEY_ID?.trim();
  const entries = process.env.SELLER_DATA_ENCRYPTION_KEYS?.split(',') ?? [];
  const keys = new Map(
    entries.map((entry) => {
      const separator = entry.indexOf(':');
      return [
        entry.slice(0, separator).trim(),
        entry.slice(separator + 1).trim(),
      ];
    }),
  );
  const fallback = process.env.SELLER_DATA_ENCRYPTION_KEY?.trim();
  const keyId = activeKeyId || (fallback ? 'legacy' : '');
  const encoded = keys.get(keyId) || fallback;
  const key = encoded ? Buffer.from(encoded, 'base64') : null;
  if (!keyId || !key || key.length !== 32) {
    throw new Error(
      'Seller verification seed requires a valid 32-byte seller encryption key.',
    );
  }
  return { keyId, key };
}

function encryptSellerValue(value) {
  const { keyId, key } = sellerEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(value.trim(), 'utf8'),
    cipher.final(),
  ]);
  return [
    sellerEncryptionPayloadVersion,
    keyId,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

function hashSellerValue(value) {
  const normalized = value
    .trim()
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toUpperCase();
  return createHmac('sha256', sellerEncryptionKey().key)
    .update(normalized)
    .digest('hex');
}

const users = [
  {
    email: 'admin@example.com',
    phoneNumber: '0900000001',
    fullName: 'Admin Demo',
  },
  {
    email: 'seller@example.com',
    phoneNumber: '0900000002',
    fullName: 'Seller Demo',
  },
  {
    email: 'customer@example.com',
    phoneNumber: '0900000003',
    fullName: 'Customer Demo',
  },
];

const categoryCatalog = [
  ['Thời trang nam', 'thoi-trang-nam', 'mens-fashion-shirt'],
  ['Điện thoại & phụ kiện', 'dien-thoai-phu-kien', 'smartphone-accessories'],
  ['Thiết bị điện tử', 'thiet-bi-dien-tu', 'television-electronics'],
  ['Máy tính & laptop', 'may-tinh-laptop', 'laptop-computer'],
  ['Máy ảnh & máy quay phim', 'may-anh-may-quay', 'camera-photography'],
];
const imageUrl = (keyword, index) =>
  `https://loremflickr.com/640/640/${keyword}?lock=${index + 100}`;
const categoryTree = categoryCatalog.map(([name, slug, keyword], index) => ({
  name,
  slug,
  imageUrl: imageUrl(keyword, index),
  sortOrder: (index + 1) * 10,
  children: [],
}));
const productSeeds = Array.from({ length: 5 }, (_, index) => {
  const categoryIndex = index % categoryCatalog.length;
  const [categoryName, categorySlug, keyword] = categoryCatalog[categoryIndex];
  const number = String(index + 1).padStart(3, '0');
  const price = 79000 + (index % 20) * 35000;
  const productName =
    index === 0 ? 'Áo thun nam basic' : `${categoryName} cao cấp ${number}`;
  const defaultVariant = {
    sku: `DEMO-${number}`,
    variantName: 'Tiêu chuẩn',
    price: String(price),
    compareAtPrice: String(Math.round(price * 1.15)),
    weightGram: 300 + (index % 15) * 100,
    stock: 20 + (index % 81),
    attributes: { 'Phiên bản': 'Tiêu chuẩn' },
  };
  const variants =
    index === 0
      ? ['Đen', 'Đỏ'].flatMap((color) =>
          ['XS', 'XL', 'XXL'].map((size, variantIndex) => ({
            sku:
              color === 'Đen' && size === 'XS'
                ? `DEMO-${number}`
                : `DEMO-${number}-${color === 'Đen' ? 'DEN' : 'DO'}-${size}`,
            variantName: `${color} / ${size}`,
            price: String(price),
            compareAtPrice: String(Math.round(price * 1.15)),
            weightGram: 300,
            stock: color === 'Đỏ' && size === 'XL' ? 0 : 12 + variantIndex,
            attributes: { 'Màu sắc': color, 'Kích cỡ': size },
          })),
        )
      : [defaultVariant];
  return {
    categorySlug,
    productName,
    slug: `${categorySlug}-san-pham-${number}`,
    description: `${productName} là sản phẩm demo thuộc danh mục ${categoryName}, có thông tin và tồn kho đầy đủ.`,
    brand: ['Nova', 'Lumi', 'An Gia', 'Mộc Việt', 'VinaHome'][index % 5],
    basePrice: String(price),
    compareAtPrice: String(Math.round(price * 1.15)),
    warrantyMonths: index % 3 === 0 ? 12 : 6,
    weightGram: 300 + (index % 15) * 100,
    images: [
      {
        imageUrl: imageUrl(keyword, index + 1000),
        altText: productName,
        sortOrder: 1,
        isThumbnail: true,
      },
    ],
    variants,
  };
});

const shippingCompanySeeds = [
  {
    provider: 'GHN',
    companyName: 'Giao Hàng Nhanh (GHN)',
    slug: 'ghn',
    email: 'api@ghn.vn',
    phoneNumber: '19001234',
    taxCode: null,
    addressText: null,
    services: [
      {
        serviceCode: 'GHN_STANDARD',
        serviceName: 'GHN Chuẩn',
        carrierServiceCode: '2',
        estimatedMinDays: 2,
        estimatedMaxDays: 4,
      },
      {
        serviceCode: 'GHN_EXPRESS',
        serviceName: 'GHN Nhanh',
        carrierServiceCode: '5',
        estimatedMinDays: 1,
        estimatedMaxDays: 2,
      },
    ],
  },
];

async function resetApplicationData() {
  // ponytail: canonical demo seed resets every public app table; split fixtures if persistent local data becomes necessary.
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE app_tables text;
    BEGIN
      SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
      INTO app_tables
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> '_prisma_migrations';

      IF app_tables IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || app_tables || ' RESTART IDENTITY CASCADE';
      END IF;
    END $$;
  `);
}

async function upsertUser({ email, phoneNumber, fullName }, passwordHash) {
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      phoneNumber,
      passwordHash,
      userStatus: 'Active',
      emailConfirmed: true,
      phoneConfirmed: true,
      isDeleted: false,
      deletedAt: null,
      updatedAt: now(),
    },
    create: {
      email,
      phoneNumber,
      passwordHash,
      userStatus: 'Active',
      emailConfirmed: true,
      phoneConfirmed: true,
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {
      fullName,
      updatedAt: now(),
    },
    create: {
      userId: user.id,
      fullName,
    },
  });

  return user;
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const seededUsers = {};

  for (const userSeed of users) {
    seededUsers[userSeed.email] = await upsertUser(userSeed, passwordHash);
  }

  return seededUsers;
}

async function seedPaymentMethods() {
  await prisma.paymentMethod.upsert({
    where: { methodCode: 'COD' },
    update: {
      methodName: 'Thanh toán khi nhận hàng',
      isOnline: false,
      isActive: true,
    },
    create: {
      methodCode: 'COD',
      methodName: 'Thanh toán khi nhận hàng',
      isOnline: false,
      isActive: true,
    },
  });

  await prisma.paymentMethod.upsert({
    where: { methodCode: 'VNPAY' },
    update: {
      methodName: 'Thanh toán qua VNPay',
      isOnline: true,
      isActive: true,
    },
    create: {
      methodCode: 'VNPAY',
      methodName: 'Thanh toán qua VNPay',
      isOnline: true,
      isActive: true,
    },
  });

  await prisma.paymentMethod.updateMany({
    where: { methodCode: 'FAKE_ONLINE' },
    data: { isActive: false },
  });
}

async function upsertCategory({
  name,
  slug,
  imageUrl,
  sortOrder,
  parentCategoryId = null,
}) {
  return prisma.category.upsert({
    where: { slug },
    update: {
      parentCategoryId,
      categoryName: name,
      imageUrl,
      sortOrder,
      isActive: true,
      updatedAt: now(),
    },
    create: {
      parentCategoryId,
      categoryName: name,
      slug,
      imageUrl,
      sortOrder,
      isActive: true,
    },
  });
}

async function seedCategories() {
  const categoryBySlug = {};

  for (const parent of categoryTree) {
    const parentCategory = await upsertCategory(parent);
    categoryBySlug[parent.slug] = parentCategory;

    for (const child of parent.children) {
      categoryBySlug[child.slug] = await upsertCategory({
        ...child,
        parentCategoryId: parentCategory.id,
      });
    }
  }

  return categoryBySlug;
}

async function seedShipping() {
  const companies = {};

  for (const companySeed of shippingCompanySeeds) {
    const company = await prisma.shippingCompany.upsert({
      where: { slug: companySeed.slug },
      update: {
        provider: companySeed.provider,
        companyName: companySeed.companyName,
        email: companySeed.email,
        phoneNumber: companySeed.phoneNumber,
        taxCode: companySeed.taxCode,
        addressText: companySeed.addressText,
        companyStatus: 'Approved',
        isDeleted: false,
        deletedAt: null,
        updatedAt: now(),
      },
      create: {
        provider: companySeed.provider,
        companyName: companySeed.companyName,
        slug: companySeed.slug,
        email: companySeed.email,
        phoneNumber: companySeed.phoneNumber,
        taxCode: companySeed.taxCode,
        addressText: companySeed.addressText,
        companyStatus: 'Approved',
      },
    });

    for (const serviceSeed of companySeed.services) {
      await prisma.shippingService.upsert({
        where: {
          shippingCompanyId_serviceCode: {
            shippingCompanyId: company.id,
            serviceCode: serviceSeed.serviceCode,
          },
        },
        update: {
          serviceName: serviceSeed.serviceName,
          carrierServiceCode: serviceSeed.carrierServiceCode,
          estimatedMinDays: serviceSeed.estimatedMinDays,
          estimatedMaxDays: serviceSeed.estimatedMaxDays,
          isActive: true,
          updatedAt: now(),
        },
        create: {
          shippingCompanyId: company.id,
          serviceCode: serviceSeed.serviceCode,
          serviceName: serviceSeed.serviceName,
          carrierServiceCode: serviceSeed.carrierServiceCode,
          estimatedMinDays: serviceSeed.estimatedMinDays,
          estimatedMaxDays: serviceSeed.estimatedMaxDays,
          isActive: true,
        },
      });
    }

    companies[companySeed.slug] = company;
  }

  return companies;
}

async function seedDemoShops(seededUsers) {
  const admin = seededUsers['admin@example.com'];
  const seller = seededUsers['seller@example.com'];
  const shop = await prisma.shop.upsert({
    where: { slug: 'gian-hang-demo-1' },
    update: {
      ownerUserId: seller.id,
      shopName: 'Gian Hàng Việt',
      email: seller.email,
      phoneNumber: '0911000001',
      province: 'Thành phố Hồ Chí Minh',
      ward: 'Phường Bến Nghé',
      streetAddress: '1 Đường Marketplace',
      taxCode: 'SHOPDEMO001',
      shopStatus: 'Approved',
      approvedByUserId: admin.id,
      approvedAt: now(),
      isDeleted: false,
      deletedAt: null,
      updatedAt: now(),
    },
    create: {
      ownerUserId: seller.id,
      shopName: 'Gian Hàng Việt',
      slug: 'gian-hang-demo-1',
      description: 'Gian hàng demo trên TMDTTH Marketplace.',
      email: seller.email,
      phoneNumber: '0911000001',
      province: 'Thành phố Hồ Chí Minh',
      ward: 'Phường Bến Nghé',
      streetAddress: '1 Đường Marketplace',
      taxCode: 'SHOPDEMO001',
      shopStatus: 'Approved',
      approvedByUserId: admin.id,
      approvedAt: now(),
    },
  });
  return [shop];
}

async function seedSellerVerification({ seededUsers, shop }) {
  const admin = seededUsers['admin@example.com'];
  const identityNumber = '079203012345';
  const taxCode = '0312345678';
  const timestamp = now();

  const profile = await prisma.sellerVerificationProfile.upsert({
    where: { shopId: shop.id },
    update: {
      sellerType: 'Individual',
      businessType: null,
      legalName: 'Nguyễn Văn Seller',
      identityDocumentType: 'CitizenId',
      identityNumberEncrypted: encryptSellerValue(identityNumber),
      identityNumberHash: hashSellerValue(identityNumber),
      identityNumberLast4: identityNumber.slice(-4),
      identityIssuedAt: new Date('2021-01-10'),
      identityIssuedBy: 'Cục Cảnh sát quản lý hành chính về trật tự xã hội',
      identityExpiresAt: new Date('2036-01-10'),
      taxCodeEncrypted: encryptSellerValue(taxCode),
      taxCodeHash: hashSellerValue(taxCode),
      taxCodeLast4: taxCode.slice(-4),
      businessRegistrationNumberEncrypted: null,
      businessRegistrationNumberHash: null,
      businessRegistrationNumberLast4: null,
      businessRegistrationIssuedAt: null,
      businessRegistrationIssuedBy: null,
      legalRepresentativeName: null,
      registeredAddress: null,
      verificationStatus: 'Approved',
      submittedAt: timestamp,
      reviewedByUserId: admin.id,
      reviewedAt: timestamp,
      updatedAt: timestamp,
    },
    create: {
      shopId: shop.id,
      sellerType: 'Individual',
      legalName: 'Nguyễn Văn Seller',
      identityDocumentType: 'CitizenId',
      identityNumberEncrypted: encryptSellerValue(identityNumber),
      identityNumberHash: hashSellerValue(identityNumber),
      identityNumberLast4: identityNumber.slice(-4),
      identityIssuedAt: new Date('2021-01-10'),
      identityIssuedBy: 'Cục Cảnh sát quản lý hành chính về trật tự xã hội',
      identityExpiresAt: new Date('2036-01-10'),
      taxCodeEncrypted: encryptSellerValue(taxCode),
      taxCodeHash: hashSellerValue(taxCode),
      taxCodeLast4: taxCode.slice(-4),
      verificationStatus: 'Approved',
      submittedAt: timestamp,
      reviewedByUserId: admin.id,
      reviewedAt: timestamp,
    },
  });

  return profile;
}

async function upsertProductImage(productId, imageSeed) {
  const existing = await prisma.productImage.findFirst({
    where: {
      productId,
      imageUrl: imageSeed.imageUrl,
    },
  });

  if (existing) {
    return prisma.productImage.update({
      where: { id: existing.id },
      data: {
        productVariantId: imageSeed.productVariantId ?? null,
        altText: imageSeed.altText,
        sortOrder: imageSeed.sortOrder,
        isThumbnail: imageSeed.isThumbnail,
      },
    });
  }

  return prisma.productImage.create({
    data: {
      productId,
      productVariantId: imageSeed.productVariantId,
      imageUrl: imageSeed.imageUrl,
      altText: imageSeed.altText,
      sortOrder: imageSeed.sortOrder,
      isThumbnail: imageSeed.isThumbnail,
    },
  });
}

async function ensureSeedInventoryTransaction({
  inventory,
  variant,
  stock,
  sellerUserId,
}) {
  const existing = await prisma.inventoryTransaction.findFirst({
    where: {
      productInventoryId: inventory.id,
      transactionType: 'SEED_STOCK',
      referenceType: 'SEED',
      referenceId: variant.id,
    },
  });

  if (existing) {
    return prisma.inventoryTransaction.update({
      where: { id: existing.id },
      data: {
        quantityChange: stock,
        quantityAfter: stock,
        note: `Seed stock for ${variant.sku}`,
      },
    });
  }

  return prisma.inventoryTransaction.create({
    data: {
      productInventoryId: inventory.id,
      transactionType: 'SEED_STOCK',
      quantityChange: stock,
      quantityAfter: stock,
      referenceType: 'SEED',
      referenceId: variant.id,
      note: `Seed stock for ${variant.sku}`,
      createdByUserId: sellerUserId,
    },
  });
}

async function seedProducts({ categoryBySlug, seededUsers, shops }) {
  const seller = seededUsers['seller@example.com'];
  const shop = shops[0];

  for (const productSeed of [...productSeeds].reverse()) {
    const category = categoryBySlug[productSeed.categorySlug];

    if (!category) {
      throw new Error(
        `Missing category for product: ${productSeed.categorySlug}`,
      );
    }

    const product = await prisma.product.upsert({
      where: {
        shopId_slug: {
          shopId: shop.id,
          slug: productSeed.slug,
        },
      },
      update: {
        categoryId: category.id,
        productName: productSeed.productName,
        description: productSeed.description,
        brand: productSeed.brand,
        basePrice: productSeed.basePrice,
        compareAtPrice: productSeed.compareAtPrice,
        warrantyMonths: productSeed.warrantyMonths,
        productStatus: 'Published',
        isViolation: false,
        isDeleted: false,
        deletedAt: null,
        updatedByUserId: seller.id,
        updatedAt: now(),
      },
      create: {
        shopId: shop.id,
        categoryId: category.id,
        productName: productSeed.productName,
        slug: productSeed.slug,
        description: productSeed.description,
        brand: productSeed.brand,
        basePrice: productSeed.basePrice,
        compareAtPrice: productSeed.compareAtPrice,
        warrantyMonths: productSeed.warrantyMonths,
        productStatus: 'Published',
        isViolation: false,
        isDeleted: false,
        createdByUserId: seller.id,
        updatedByUserId: seller.id,
      },
    });

    await prisma.productImage.updateMany({
      where: {
        productId: product.id,
        isThumbnail: true,
      },
      data: { isThumbnail: false },
    });

    for (const imageSeed of productSeed.images) {
      await upsertProductImage(product.id, imageSeed);
    }

    for (const variantSeed of productSeed.variants) {
      const variant = await prisma.productVariant.upsert({
        where: {
          productId_sku: {
            productId: product.id,
            sku: variantSeed.sku,
          },
        },
        update: {
          variantName: variantSeed.variantName,
          attributes: variantSeed.attributes,
          price: variantSeed.price,
          compareAtPrice: variantSeed.compareAtPrice,
          weightGram: variantSeed.weightGram,
          variantStatus: 'Active',
          updatedAt: now(),
        },
        create: {
          productId: product.id,
          sku: variantSeed.sku,
          variantName: variantSeed.variantName,
          attributes: variantSeed.attributes,
          price: variantSeed.price,
          compareAtPrice: variantSeed.compareAtPrice,
          weightGram: variantSeed.weightGram,
          variantStatus: 'Active',
        },
      });

      const inventory = await prisma.productInventory.upsert({
        where: { productVariantId: variant.id },
        update: {
          productId: product.id,
          quantityOnHand: variantSeed.stock,
          quantityReserved: 0,
          quantityAvailable: variantSeed.stock,
          lowStockThreshold: 5,
          updatedAt: now(),
        },
        create: {
          productId: product.id,
          productVariantId: variant.id,
          quantityOnHand: variantSeed.stock,
          quantityReserved: 0,
          quantityAvailable: variantSeed.stock,
          lowStockThreshold: 5,
        },
      });

      await ensureSeedInventoryTransaction({
        inventory,
        variant,
        stock: variantSeed.stock,
        sellerUserId: seller.id,
      });
    }
  }
}

async function main() {
  sellerEncryptionKey();
  const rootClient = prisma;

  await rootClient.$transaction(
    async (tx) => {
      prisma = tx;
      try {
        await resetApplicationData();
        const seededUsers = await seedUsers();
        await seedPaymentMethods();
        const categoryBySlug = await seedCategories();
        await seedShipping();
        const shops = await seedDemoShops(seededUsers);
        await seedSellerVerification({ seededUsers, shop: shops[0] });
        await seedProducts({ categoryBySlug, seededUsers, shops });
      } finally {
        prisma = rootClient;
      }
    },
    { timeout: 60_000 },
  );

  console.log('Seed completed: 3 users, 1 shop, 5 products.');
  console.log(`Demo password for seeded users: ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
