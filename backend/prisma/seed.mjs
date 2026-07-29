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
  ...Array.from({ length: 9 }, (_, index) => ({ email: `seller${index + 2}@example.com`, phoneNumber: `09100000${String(index + 2).padStart(2, '0')}`, fullName: `Seller Demo ${index + 2}` })),
];

const categoryCatalog = [
  ['Thời trang nam', 'thoi-trang-nam', 'mens-fashion-shirt'],
  ['Điện thoại & phụ kiện', 'dien-thoai-phu-kien', 'smartphone-accessories'],
  ['Thiết bị điện tử', 'thiet-bi-dien-tu', 'television-electronics'],
  ['Máy tính & laptop', 'may-tinh-laptop', 'laptop-computer'],
  ['Máy ảnh & máy quay phim', 'may-anh-may-quay', 'camera-photography'],
  ['Đồng hồ', 'dong-ho', 'wrist-watch'],
  ['Giày dép nam', 'giay-dep-nam', 'mens-shoes-sneakers'],
  ['Thiết bị điện gia dụng', 'thiet-bi-dien-gia-dung', 'home-appliance-kettle'],
  ['Thể thao & du lịch', 'the-thao-du-lich', 'sports-football'],
  ['Ô tô & xe máy & xe đạp', 'o-to-xe-may-xe-dap', 'motorcycle-bicycle'],
  ['Thời trang nữ', 'thoi-trang-nu', 'womens-fashion-dress'],
  ['Mẹ & bé', 'me-va-be', 'baby-products'],
  ['Nhà cửa & đời sống', 'nha-cua-doi-song', 'cookware-home'],
  ['Sắc đẹp', 'sac-dep', 'makeup-cosmetics'],
  ['Sức khỏe', 'suc-khoe', 'health-supplements'],
  ['Giày dép nữ', 'giay-dep-nu', 'womens-high-heels'],
  ['Túi ví nữ', 'tui-vi-nu', 'womens-handbag'],
  ['Phụ kiện & trang sức nữ', 'phu-kien-trang-suc-nu', 'womens-jewelry'],
  ['Bách hóa online', 'bach-hoa-online', 'groceries-food'],
  ['Nhà sách online', 'nha-sach-online', 'books-stationery'],
  ['Balo & túi ví nam', 'balo-tui-vi-nam', 'mens-backpack'],
  ['Đồ chơi', 'do-choi', 'teddy-bear-toys'],
  ['Chăm sóc thú cưng', 'cham-soc-thu-cung', 'pet-food-bowl'],
  ['Dụng cụ & thiết bị tiện ích', 'dung-cu-thiet-bi-tien-ich', 'home-tools'],
  ['Thời trang trẻ em', 'thoi-trang-tre-em', 'kids-clothing'],
  ['Giặt giũ & chăm sóc nhà cửa', 'giat-giu-cham-soc-nha-cua', 'laundry-detergent'],
  ['Voucher & dịch vụ', 'voucher-dich-vu', 'gift-voucher'],
];
const imageUrl = (keyword, index) => `https://loremflickr.com/640/640/${keyword}?lock=${index + 100}`;
const categoryTree = categoryCatalog.map(([name, slug, keyword], index) => ({
  name, slug, imageUrl: imageUrl(keyword, index), sortOrder: (index + 1) * 10, children: [],
}));
const attributeSeeds = [];

const productSeeds = Array.from({ length: 200 }, (_, index) => {
  const categoryIndex = index % categoryCatalog.length;
  const [categoryName, categorySlug, keyword] = categoryCatalog[categoryIndex];
  const number = String(index + 1).padStart(3, '0');
  const price = 79000 + (index % 20) * 35000;
  const productName = `${categoryName} cao cấp ${number}`;
  return {
    categorySlug,
    productName,
    slug: `${categorySlug}-san-pham-${number}`,
    description: `${productName} là sản phẩm demo thuộc danh mục ${categoryName}, có thông tin và tồn kho đầy đủ.`,
    brand: ['Nova', 'Lumi', 'An Gia', 'Mộc Việt', 'VinaHome'][index % 5],
    basePrice: String(price), compareAtPrice: String(Math.round(price * 1.15)),
    warrantyMonths: index % 3 === 0 ? 12 : 6, weightGram: 300 + (index % 15) * 100,
    images: [{ imageUrl: imageUrl(keyword, index + 1000), altText: productName, sortOrder: 1, isThumbnail: true }],
    variants: [{ sku: `DEMO-${number}`, variantName: 'Tiêu chuẩn', variantOptionJson: JSON.stringify({ version: 'standard' }), price: String(price), compareAtPrice: String(Math.round(price * 1.15)), weightGram: 300 + (index % 15) * 100, stock: 20 + (index % 81), attributes: {} }],
  };
});

const shippingCompanySeeds = [{ provider: 'GHN', companyName: 'Giao Hàng Nhanh (GHN)', slug: 'ghn', email: 'api@ghn.vn', phoneNumber: '19001234', taxCode: null, addressText: null, services: [{ serviceCode: 'GHN_STANDARD', serviceName: 'GHN Chuẩn', carrierServiceCode: '2', estimatedMinDays: 2, estimatedMaxDays: 4 }, { serviceCode: 'GHN_EXPRESS', serviceName: 'GHN Nhanh', carrierServiceCode: '5', estimatedMinDays: 1, estimatedMaxDays: 2 }] }];
const voucherSeeds = [{ voucherCode: 'SAN10', voucherName: 'Ưu đãi toàn hệ thống 10%', scope: 'Platform', discountTarget: 'Product', discountType: 'Percentage', discountValue: '10', maxDiscountAmount: '50000', minOrderAmount: '200000', usageLimit: 1000 }];

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

async function upsertCategory({ name, slug, imageUrl, sortOrder, parentCategoryId = null }) {
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
  const sellers = ['seller@example.com', ...Array.from({ length: 9 }, (_, index) => `seller${index + 2}@example.com`)];
  const shops = [];
  for (const [index, email] of sellers.entries()) {
    const number = index + 1;
    shops.push(await prisma.shop.upsert({
      where: { slug: `gian-hang-demo-${number}` },
      update: { ownerUserId: seededUsers[email].id, shopName: `Gian Hàng Việt ${number}`, email, phoneNumber: `09110000${String(number).padStart(2, '0')}`, province: 'Thành phố Hồ Chí Minh', ward: 'Phường Bến Nghé', streetAddress: `${number} Đường Marketplace`, taxCode: `SHOPDEMO${String(number).padStart(3, '0')}`, shopStatus: 'Approved', approvedByUserId: admin.id, approvedAt: now(), isDeleted: false, deletedAt: null, updatedAt: now() },
      create: { ownerUserId: seededUsers[email].id, shopName: `Gian Hàng Việt ${number}`, slug: `gian-hang-demo-${number}`, description: `Gian hàng demo số ${number} trên TMDTTH Marketplace.`, email, phoneNumber: `09110000${String(number).padStart(2, '0')}`, province: 'Thành phố Hồ Chí Minh', ward: 'Phường Bến Nghé', streetAddress: `${number} Đường Marketplace`, taxCode: `SHOPDEMO${String(number).padStart(3, '0')}`, shopStatus: 'Approved', approvedByUserId: admin.id, approvedAt: now() },
    }));
  }
  return shops;
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
  shops,
}) {
  for (const [productIndex, productSeed] of productSeeds.entries()) {
    const shop = shops[productIndex % shops.length];
    const seller = seededUsers[productIndex % shops.length === 0 ? 'seller@example.com' : `seller${(productIndex % shops.length) + 1}@example.com`];
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

async function seedVouchers(shop, categoryBySlug) {
  const timestamp = now();
  const startAt = new Date(timestamp);
  startAt.setDate(startAt.getDate() - 1);
  const endAt = new Date(timestamp);
  endAt.setFullYear(endAt.getFullYear() + 1);

  for (const voucherSeed of voucherSeeds) {
    const shopId = voucherSeed.scope === 'Shop' ? shop.id : null;

    const voucher = await prisma.voucher.upsert({
      where: { voucherCode: voucherSeed.voucherCode },
      update: {
        voucherName: voucherSeed.voucherName,
        shopId,
        discountType: voucherSeed.discountType,
        discountTarget: voucherSeed.discountTarget,
        discountValue: voucherSeed.discountValue,
        maxDiscountAmount: voucherSeed.maxDiscountAmount,
        minOrderAmount: voucherSeed.minOrderAmount,
        usageLimit: voucherSeed.usageLimit,
        usedCount: 0,
        startAt,
        endAt,
        voucherStatus: 'Active',
      },
      create: {
        voucherCode: voucherSeed.voucherCode,
        voucherName: voucherSeed.voucherName,
        shopId,
        discountType: voucherSeed.discountType,
        discountTarget: voucherSeed.discountTarget,
        discountValue: voucherSeed.discountValue,
        maxDiscountAmount: voucherSeed.maxDiscountAmount,
        minOrderAmount: voucherSeed.minOrderAmount,
        usageLimit: voucherSeed.usageLimit,
        startAt,
        endAt,
        voucherStatus: 'Active',
      },
    });

    await prisma.voucherCategory.deleteMany({ where: { voucherId: voucher.id } });
    for (const categorySlug of voucherSeed.categorySlugs ?? []) {
      const category = categoryBySlug[categorySlug];
      if (!category) throw new Error(`Category not found: ${categorySlug}`);
      await prisma.voucherCategory.create({
        data: { voucherId: voucher.id, categoryId: category.id },
      });
    }
  }
}

async function main() {
  const seededUsers = await seedUsers();
  await seedPaymentMethods();
  const categoryBySlug = await seedCategories();
  const attributeByCategoryAndName = await seedAttributes(categoryBySlug);
  await seedShipping();
  const shops = await seedDemoShops(seededUsers);
  await seedSellerVerification({ seededUsers, shop: shops[0] });
  await seedVouchers(shops[0], categoryBySlug);
  await seedProducts({
    categoryBySlug,
    attributeByCategoryAndName,
    seededUsers,
    shops,
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
