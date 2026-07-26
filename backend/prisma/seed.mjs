import bcrypt from 'bcryptjs';
import { createCipheriv, createHmac, randomBytes } from 'node:crypto';

import { createPrismaClient } from '../scripts/prisma-client.mjs';

const prisma = createPrismaClient();
const now = () => new Date();
const demoPassword = 'Demo@123456';
const sellerEncryptionPayloadVersion = 'v1';

function sellerEncryptionKey() {
  const activeKeyId = process.env.SELLER_DATA_ACTIVE_KEY_ID?.trim();
  const entries = process.env.SELLER_DATA_ENCRYPTION_KEYS?.split(',') ?? [];
  const keys = new Map(
    entries.map((entry) => {
      const separator = entry.indexOf(':');
      return [entry.slice(0, separator).trim(), entry.slice(separator + 1).trim()];
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
  {
    email: 'shipper@example.com',
    phoneNumber: '0900000004',
    fullName: 'Shipping Owner Demo',
  },
];

const categoryTree = [
  {
    name: 'Đồ nhà bếp',
    slug: 'do-nha-bep',
    sortOrder: 10,
    children: [
      { name: 'Nồi/chảo', slug: 'noi-chao', sortOrder: 11 },
      { name: 'Máy xay', slug: 'may-xay', sortOrder: 12 },
      {
        name: 'Hộp đựng thực phẩm',
        slug: 'hop-dung-thuc-pham',
        sortOrder: 13,
      },
    ],
  },
  {
    name: 'Đồ phòng khách',
    slug: 'do-phong-khach',
    sortOrder: 20,
    children: [
      { name: 'Đèn trang trí', slug: 'den-trang-tri', sortOrder: 21 },
      { name: 'Kệ/tủ', slug: 'ke-tu', sortOrder: 22 },
    ],
  },
  {
    name: 'Đồ phòng ngủ',
    slug: 'do-phong-ngu',
    sortOrder: 30,
    children: [
      { name: 'Chăn ga gối', slug: 'chan-ga-goi', sortOrder: 31 },
      { name: 'Đèn ngủ', slug: 'den-ngu', sortOrder: 32 },
    ],
  },
  {
    name: 'Đồ vệ sinh',
    slug: 'do-ve-sinh',
    sortOrder: 40,
    children: [
      { name: 'Kệ nhà tắm', slug: 'ke-nha-tam', sortOrder: 41 },
      { name: 'Dụng cụ vệ sinh', slug: 'dung-cu-ve-sinh', sortOrder: 42 },
    ],
  },
  {
    name: 'Thiết bị gia dụng nhỏ',
    slug: 'thiet-bi-gia-dung-nho',
    sortOrder: 50,
    children: [
      { name: 'Máy hút bụi', slug: 'may-hut-bui', sortOrder: 51 },
      { name: 'Bàn ủi', slug: 'ban-ui', sortOrder: 52 },
      { name: 'Máy sấy', slug: 'may-say', sortOrder: 53 },
    ],
  },
];

const attributeSeeds = [
  {
    categorySlug: 'noi-chao',
    attributeName: 'Chất liệu',
    dataType: 'text',
    isRequired: true,
  },
  {
    categorySlug: 'noi-chao',
    attributeName: 'Đường kính',
    dataType: 'number',
    unit: 'cm',
  },
  {
    categorySlug: 'den-trang-tri',
    attributeName: 'Màu ánh sáng',
    dataType: 'text',
  },
  {
    categorySlug: 'den-ngu',
    attributeName: 'Màu sắc',
    dataType: 'text',
  },
  {
    categorySlug: 'den-ngu',
    attributeName: 'Công suất',
    dataType: 'number',
    unit: 'W',
  },
  {
    categorySlug: 'chan-ga-goi',
    attributeName: 'Kích thước',
    dataType: 'text',
    isRequired: true,
  },
  {
    categorySlug: 'thiet-bi-gia-dung-nho',
    attributeName: 'Công suất',
    dataType: 'number',
    unit: 'W',
  },
];

const shippingCompanySeeds = [
  {
    companyName: 'Giao Hàng Demo',
    slug: 'giao-hang-demo',
    email: 'contact@giaohangdemo.test',
    phoneNumber: '19001001',
    taxCode: 'GHDEMO001',
    addressText: '1 Đường Demo, Quận 1, TP.HCM',
    services: [
      {
        serviceCode: 'STANDARD',
        serviceName: 'Standard',
        baseFee: '20000',
        feePerKg: '5000',
        estimatedMinDays: 2,
        estimatedMaxDays: 5,
      },
      {
        serviceCode: 'EXPRESS',
        serviceName: 'Express',
        baseFee: '35000',
        feePerKg: '8000',
        estimatedMinDays: 1,
        estimatedMaxDays: 2,
      },
    ],
  },
  {
    companyName: 'Nhanh Express Demo',
    slug: 'nhanh-express-demo',
    email: 'contact@nhanhexpressdemo.test',
    phoneNumber: '19001002',
    taxCode: 'NXDEMO001',
    addressText: '2 Đường Demo, Quận 3, TP.HCM',
    services: [
      {
        serviceCode: 'STANDARD',
        serviceName: 'Standard',
        baseFee: '22000',
        feePerKg: '5500',
        estimatedMinDays: 2,
        estimatedMaxDays: 4,
      },
    ],
  },
];

const productSeeds = [
  {
    categorySlug: 'noi-chao',
    productName: 'Nồi inox 3 lớp',
    slug: 'noi-inox-3-lop',
    description:
      'Nồi inox 3 lớp dùng cho bếp gia đình, đáy truyền nhiệt đều và dễ vệ sinh.',
    brand: 'Gia Dụng Demo',
    basePrice: '299000',
    compareAtPrice: '349000',
    warrantyMonths: 12,
    weightGram: 1500,
    images: [
      {
        imageUrl: 'https://htmediagroup.vn/wp-content/uploads/2026/02/Anh-xoong-noi-1.jpg',
        altText: 'Nồi inox 3 lớp',
        sortOrder: 1,
        isThumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'NOI-INOX-20CM',
        variantName: '20cm',
        variantOptionJson: JSON.stringify({ diameterCm: 20 }),
        price: '299000',
        compareAtPrice: '349000',
        weightGram: 1500,
        stock: 50,
        attributes: {
          'Chất liệu': 'Inox 304',
          'Đường kính': '20',
        },
      },
      {
        sku: 'NOI-INOX-24CM',
        variantName: '24cm',
        variantOptionJson: JSON.stringify({ diameterCm: 24 }),
        price: '399000',
        compareAtPrice: '459000',
        weightGram: 1900,
        stock: 30,
        attributes: {
          'Chất liệu': 'Inox 304',
          'Đường kính': '24',
        },
      },
    ],
  },
  {
    categorySlug: 'den-ngu',
    productName: 'Đèn ngủ cảm ứng',
    slug: 'den-ngu-cam-ung',
    description:
      'Đèn ngủ cảm ứng ánh sáng vàng ấm, phù hợp phòng ngủ và bàn đầu giường.',
    brand: 'Gia Dụng Demo',
    basePrice: '159000',
    compareAtPrice: '199000',
    warrantyMonths: 6,
    weightGram: 450,
    images: [
      {
        imageUrl: 'https://htmediagroup.vn/wp-content/uploads/2026/02/Anh-xoong-noi-1.jpg',
        altText: 'Đèn ngủ cảm ứng',
        sortOrder: 1,
        isThumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'DEN-NGU-VANG',
        variantName: 'Ánh sáng vàng',
        variantOptionJson: JSON.stringify({ lightColor: 'warm-yellow' }),
        price: '159000',
        compareAtPrice: '199000',
        weightGram: 450,
        stock: 100,
        attributes: {
          'Màu sắc': 'Vàng',
          'Công suất': '5',
        },
      },
    ],
  },
];

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
    where: { methodCode: 'FAKE_ONLINE' },
    update: {
      methodName: 'Thanh toán online giả lập',
      isOnline: true,
      isActive: true,
    },
    create: {
      methodCode: 'FAKE_ONLINE',
      methodName: 'Thanh toán online giả lập',
      isOnline: true,
      isActive: true,
    },
  });
}

async function upsertCategory({ name, slug, sortOrder, parentCategoryId = null }) {
  return prisma.category.upsert({
    where: { slug },
    update: {
      parentCategoryId,
      categoryName: name,
      sortOrder,
      isActive: true,
      updatedAt: now(),
    },
    create: {
      parentCategoryId,
      categoryName: name,
      slug,
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

async function upsertAttribute(categoryId, attribute) {
  const existing = await prisma.productAttribute.findFirst({
    where: {
      categoryId,
      attributeName: attribute.attributeName,
    },
  });

  if (existing) {
    return prisma.productAttribute.update({
      where: { id: existing.id },
      data: {
        dataType: attribute.dataType,
        unit: attribute.unit ?? null,
        isRequired: attribute.isRequired ?? false,
      },
    });
  }

  return prisma.productAttribute.create({
    data: {
      categoryId,
      attributeName: attribute.attributeName,
      dataType: attribute.dataType,
      unit: attribute.unit,
      isRequired: attribute.isRequired ?? false,
    },
  });
}

async function seedAttributes(categoryBySlug) {
  const attributeByCategoryAndName = new Map();

  for (const attribute of attributeSeeds) {
    const category = categoryBySlug[attribute.categorySlug];

    if (!category) {
      throw new Error(`Missing category for attribute: ${attribute.categorySlug}`);
    }

    const productAttribute = await upsertAttribute(category.id, attribute);
    attributeByCategoryAndName.set(
      `${attribute.categorySlug}:${attribute.attributeName}`,
      productAttribute,
    );
  }

  return attributeByCategoryAndName;
}

async function seedShipping(seededUsers) {
  const admin = seededUsers['admin@example.com'];
  const shipper = seededUsers['shipper@example.com'];
  const companies = {};

  for (const companySeed of shippingCompanySeeds) {
    const company = await prisma.shippingCompany.upsert({
      where: { slug: companySeed.slug },
      update: {
        ownerUserId: shipper.id,
        companyName: companySeed.companyName,
        email: companySeed.email,
        phoneNumber: companySeed.phoneNumber,
        taxCode: companySeed.taxCode,
        addressText: companySeed.addressText,
        companyStatus: 'Approved',
        approvedByUserId: admin.id,
        approvedAt: now(),
        isDeleted: false,
        deletedAt: null,
        updatedAt: now(),
      },
      create: {
        ownerUserId: shipper.id,
        companyName: companySeed.companyName,
        slug: companySeed.slug,
        email: companySeed.email,
        phoneNumber: companySeed.phoneNumber,
        taxCode: companySeed.taxCode,
        addressText: companySeed.addressText,
        companyStatus: 'Approved',
        approvedByUserId: admin.id,
        approvedAt: now(),
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
          baseFee: serviceSeed.baseFee,
          feePerKg: serviceSeed.feePerKg,
          estimatedMinDays: serviceSeed.estimatedMinDays,
          estimatedMaxDays: serviceSeed.estimatedMaxDays,
          isActive: true,
          updatedAt: now(),
        },
        create: {
          shippingCompanyId: company.id,
          serviceCode: serviceSeed.serviceCode,
          serviceName: serviceSeed.serviceName,
          baseFee: serviceSeed.baseFee,
          feePerKg: serviceSeed.feePerKg,
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

async function seedDemoShop(seededUsers) {
  const admin = seededUsers['admin@example.com'];
  const seller = seededUsers['seller@example.com'];

  return prisma.shop.upsert({
    where: { slug: 'gia-dung-thang-nguyen' },
    update: {
      ownerUserId: seller.id,
      shopName: 'Gia Dụng Thắng Nguyễn',
      description: 'Shop demo cho sàn thương mại điện tử đồ gia dụng.',
      email: 'seller@example.com',
      phoneNumber: '0900000002',
      province: 'TP.HCM',
      district: 'Quận 1',
      ward: 'Phường Bến Nghé',
      streetAddress: '10 Đường Demo',
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
      shopName: 'Gia Dụng Thắng Nguyễn',
      slug: 'gia-dung-thang-nguyen',
      description: 'Shop demo cho sàn thương mại điện tử đồ gia dụng.',
      email: 'seller@example.com',
      phoneNumber: '0900000002',
      province: 'TP.HCM',
      district: 'Quận 1',
      ward: 'Phường Bến Nghé',
      streetAddress: '10 Đường Demo',
      taxCode: 'SHOPDEMO001',
      shopStatus: 'Approved',
      approvedByUserId: admin.id,
      approvedAt: now(),
    },
  });
}

async function seedSellerVerification({ seededUsers, shop }) {
  const admin = seededUsers['admin@example.com'];
  const identityNumber = '079203012345';
  const taxCode = '0312345678';
  const bankAccountNumber = '123456789012';
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

  await prisma.sellerPayoutAccount.upsert({
    where: { shopId: shop.id },
    update: {
      bankCode: 'VCB',
      bankNameSnapshot: 'Ngân hàng TMCP Ngoại thương Việt Nam',
      accountNumberEncrypted: encryptSellerValue(bankAccountNumber),
      accountNumberHash: hashSellerValue(bankAccountNumber),
      accountNumberLast4: bankAccountNumber.slice(-4),
      accountHolderName: 'NGUYEN VAN SELLER',
      payoutStatus: 'Verified',
      verifiedByUserId: admin.id,
      verifiedAt: timestamp,
      isActive: true,
      updatedAt: timestamp,
    },
    create: {
      shopId: shop.id,
      bankCode: 'VCB',
      bankNameSnapshot: 'Ngân hàng TMCP Ngoại thương Việt Nam',
      accountNumberEncrypted: encryptSellerValue(bankAccountNumber),
      accountNumberHash: hashSellerValue(bankAccountNumber),
      accountNumberLast4: bankAccountNumber.slice(-4),
      accountHolderName: 'NGUYEN VAN SELLER',
      payoutStatus: 'Verified',
      verifiedByUserId: admin.id,
      verifiedAt: timestamp,
      isActive: true,
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

async function upsertAttributeValue({
  productId,
  productVariantId,
  productAttributeId,
  valueText,
}) {
  const existing = await prisma.productAttributeValue.findFirst({
    where: {
      productId,
      productVariantId,
      productAttributeId,
    },
  });

  if (existing) {
    return prisma.productAttributeValue.update({
      where: { id: existing.id },
      data: { valueText },
    });
  }

  return prisma.productAttributeValue.create({
    data: {
      productId,
      productVariantId,
      productAttributeId,
      valueText,
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
    return existing;
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

async function seedProducts({
  categoryBySlug,
  attributeByCategoryAndName,
  seededUsers,
  shop,
}) {
  const seller = seededUsers['seller@example.com'];

  for (const productSeed of productSeeds) {
    const category = categoryBySlug[productSeed.categorySlug];

    if (!category) {
      throw new Error(`Missing category for product: ${productSeed.categorySlug}`);
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
        weightGram: productSeed.weightGram,
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
        weightGram: productSeed.weightGram,
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
          variantOptionJson: variantSeed.variantOptionJson,
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
          variantOptionJson: variantSeed.variantOptionJson,
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

      for (const [attributeName, valueText] of Object.entries(
        variantSeed.attributes,
      )) {
        const attribute = attributeByCategoryAndName.get(
          `${productSeed.categorySlug}:${attributeName}`,
        );

        if (!attribute) {
          throw new Error(
            `Missing attribute ${attributeName} for ${productSeed.categorySlug}`,
          );
        }

        await upsertAttributeValue({
          productId: product.id,
          productVariantId: variant.id,
          productAttributeId: attribute.id,
          valueText,
        });
      }
    }
  }
}

async function main() {
  const seededUsers = await seedUsers();
  await seedPaymentMethods();
  const categoryBySlug = await seedCategories();
  const attributeByCategoryAndName = await seedAttributes(categoryBySlug);
  await seedShipping(seededUsers);
  const shop = await seedDemoShop(seededUsers);
  await seedSellerVerification({ seededUsers, shop });
  await seedProducts({
    categoryBySlug,
    attributeByCategoryAndName,
    seededUsers,
    shop,
  });

  console.log('Seed completed.');
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
