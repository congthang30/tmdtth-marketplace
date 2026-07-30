import { Prisma, SellerLedgerEntryType, SellerLedgerSourceType } from '@prisma/client';
import { createPrismaClient } from './prisma-client.mjs';

const apply = process.argv.includes('--apply');
const HOLD_MS = 7 * 24 * 60 * 60 * 1000;
const ZERO = new Prisma.Decimal(0);
const prisma = createPrismaClient();

function allocatePlatformDiscount(shopOrder, shopOrders, discountAmount) {
  if (discountAmount.isZero() || shopOrders.length === 0) return ZERO;
  const subtotal = shopOrders.reduce(
    (total, item) => total.add(item.subtotalAmount),
    ZERO,
  );
  if (subtotal.isZero()) return ZERO;

  let allocated = ZERO;
  for (const [index, item] of shopOrders.entries()) {
    const share =
      index === shopOrders.length - 1
        ? discountAmount.sub(allocated)
        : item.subtotalAmount
            .mul(discountAmount)
            .div(subtotal)
            .toDecimalPlaces(2);
    allocated = allocated.add(share);
    if (item.id === shopOrder.id) return share;
  }
  throw new Error(`Shop order ${shopOrder.id.toString()} is not in its order.`);
}

function buildEntries(shopOrder) {
  if (!shopOrder.completedAt) {
    throw new Error(
      `Completed shop order ${shopOrder.id.toString()} has no completedAt.`,
    );
  }
  const shopFundedDiscount = shopOrder.voucherUsages.reduce(
    (total, usage) =>
      usage.voucher.shopId === shopOrder.shopId
        ? total.add(usage.discountAmount)
        : total,
    ZERO,
  );
  const orderPlatformDiscount = shopOrder.order.voucherUsages.reduce(
    (total, usage) => total.add(usage.discountAmount),
    ZERO,
  );
  const platformCredit = allocatePlatformDiscount(
    shopOrder,
    shopOrder.order.shopOrders,
    orderPlatformDiscount,
  );
  const saleCredit = shopOrder.subtotalAmount.sub(shopOrder.discountAmount);

  if (
    saleCredit.isNegative() ||
    !shopFundedDiscount.add(platformCredit).equals(shopOrder.discountAmount)
  ) {
    throw new Error(
      `Invalid financial snapshot for shop order ${shopOrder.shopOrderCode}.`,
    );
  }

  const common = {
    shopId: shopOrder.shopId,
    shopOrderId: shopOrder.id,
    sourceType: SellerLedgerSourceType.ShopOrder,
    sourceId: shopOrder.id.toString(),
    availableAt: new Date(shopOrder.completedAt.getTime() + HOLD_MS),
    createdAt: shopOrder.completedAt,
    metadata: {
      shopOrderCode: shopOrder.shopOrderCode,
      subtotalAmount: shopOrder.subtotalAmount.toFixed(2),
      discountAmount: shopOrder.discountAmount.toFixed(2),
      shopFundedDiscount: shopFundedDiscount.toFixed(2),
      platformFundedDiscount: platformCredit.toFixed(2),
      backfilled: true,
    },
  };

  return [
    ...(saleCredit.isZero()
      ? []
      : [
          {
            ...common,
            entryType: SellerLedgerEntryType.SaleCredit,
            amount: saleCredit,
            description: `Doanh thu đơn ${shopOrder.shopOrderCode}`,
          },
        ]),
    ...(platformCredit.isZero()
      ? []
      : [
          {
            ...common,
            entryType: SellerLedgerEntryType.PlatformVoucherCredit,
            amount: platformCredit,
            description: `Sàn bù voucher cho đơn ${shopOrder.shopOrderCode}`,
          },
        ]),
  ];
}

async function getCandidates() {
  return prisma.shopOrder.findMany({
    where: {
      orderStatus: 'Completed',
      completedAt: { not: null },
      ledgerEntries: {
        none: { entryType: SellerLedgerEntryType.SaleCredit },
      },
    },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      shopId: true,
      shopOrderCode: true,
      completedAt: true,
      subtotalAmount: true,
      discountAmount: true,
      voucherUsages: {
        select: {
          discountAmount: true,
          voucher: { select: { shopId: true } },
        },
      },
      order: {
        select: {
          shopOrders: {
            orderBy: { id: 'asc' },
            select: { id: true, subtotalAmount: true },
          },
          voucherUsages: {
            where: { voucher: { shopId: null } },
            select: { discountAmount: true },
          },
        },
      },
    },
  });
}

try {
  const candidates = await getCandidates();
  const entries = candidates.flatMap(buildEntries);
  const total = entries.reduce(
    (sum, entry) => sum.add(entry.amount),
    ZERO,
  );

  console.table(
    candidates.map((shopOrder) => ({
      shopOrderId: shopOrder.id.toString(),
      shopOrderCode: shopOrder.shopOrderCode,
      completedAt: shopOrder.completedAt?.toISOString() ?? null,
      entryCount: buildEntries(shopOrder).length,
      creditAmount: buildEntries(shopOrder)
        .reduce((sum, entry) => sum.add(entry.amount), ZERO)
        .toFixed(2),
    })),
  );
  console.log(
    JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      candidates: candidates.length,
      entries: entries.length,
      creditAmount: total.toFixed(2),
    }),
  );

  if (apply && entries.length > 0) {
    const result = await prisma.sellerLedgerEntry.createMany({
      data: entries,
      skipDuplicates: true,
    });
    const remaining = await getCandidates();
    if (remaining.length > 0) {
      throw new Error(
        `Backfill verification failed: ${remaining.length} shop order(s) remain.`,
      );
    }
    console.log(`Created ${result.count} seller ledger entry/entries.`);
  }
} finally {
  await prisma.$disconnect();
}
