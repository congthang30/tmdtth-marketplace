import { createPrismaClient } from './prisma-client.mjs';

const apply = process.argv.includes('--apply');
const daysArg = process.argv.find((arg) => arg.startsWith('--days='));
const retentionDays = Number(daysArg?.split('=')[1] ?? 30);

if (!Number.isInteger(retentionDays) || retentionDays < 7 || retentionDays > 3650) {
  throw new Error('--days must be an integer between 7 and 3650.');
}

const prisma = createPrismaClient();
const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

try {
  const drafts = await prisma.shop.findMany({
    where: {
      shopStatus: 'Draft',
      isDeleted: false,
      updatedAt: { lt: cutoff },
      OR: [
        { sellerVerification: null },
        { sellerVerification: { verificationStatus: 'Draft' } },
      ],
    },
    select: {
      id: true,
      ownerUserId: true,
      shopName: true,
      updatedAt: true,
      sellerVerification: { select: { verificationStatus: true } },
      _count: { select: { products: true, shopOrders: true } },
    },
    orderBy: { updatedAt: 'asc' },
  });

  const safeDrafts = drafts.filter((draft) => draft._count.products === 0 && draft._count.shopOrders === 0);
  console.table(safeDrafts.map((draft) => ({
    shopId: draft.id.toString(),
    ownerUserId: draft.ownerUserId.toString(),
    shopName: draft.shopName,
    profileStatus: draft.sellerVerification?.verificationStatus ?? 'None',
    updatedAt: draft.updatedAt?.toISOString() ?? null,
  })));
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', retentionDays, cutoff: cutoff.toISOString(), candidates: safeDrafts.length, excludedWithCommerceData: drafts.length - safeDrafts.length }));

  if (!apply || safeDrafts.length === 0) process.exitCode = 0;
  else {
    const now = new Date();
    const result = await prisma.shop.updateMany({
      where: { id: { in: safeDrafts.map((draft) => draft.id) }, shopStatus: 'Draft', isDeleted: false },
      data: { isDeleted: true, shopStatus: 'Deleted', deletedAt: now, updatedAt: now },
    });
    console.log(`Soft-deleted ${result.count} stale seller onboarding draft(s).`);
  }
} finally {
  await prisma.$disconnect();
}
