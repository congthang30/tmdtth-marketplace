import { v2 as cloudinary } from 'cloudinary';
import { AuthenticatedUser } from '../auth/types';
import { UploadService } from './upload.service';

jest.mock('cloudinary', () => ({
  v2: { uploader: { destroy: jest.fn() } },
}));

const seller = { id: 7n } as AuthenticatedUser;

function asset(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    ownerUserId: seller.id,
    storagePublicId: 'products/7/asset-1',
    url: 'https://example.com/asset-1.jpg',
    originalName: 'asset-1.jpg',
    mimeType: 'image/jpeg',
    size: 100,
    status: 'Pending',
    createdAt: new Date('2026-07-27T00:00:00.000Z'),
    attachedAt: null,
    ...overrides,
  };
}

describe('UploadService', () => {
  const prisma = {
    uploadAsset: {
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let service: UploadService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (queries: Promise<unknown>[]) => Promise.all(queries),
    );
    service = new UploadService(prisma as never);
  });

  afterEach(() => service.onModuleDestroy());

  it('lists only assets owned by the authenticated seller', async () => {
    prisma.uploadAsset.findMany.mockResolvedValue([asset()]);
    prisma.uploadAsset.count.mockResolvedValue(1);

    const result = await service.listFiles(seller, { page: 1, limit: 10 });

    expect(prisma.uploadAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerUserId: seller.id } }),
    );
    expect(prisma.uploadAsset.count).toHaveBeenCalledWith({
      where: { ownerUserId: seller.id },
    });
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        assetId: '1',
        url: 'https://example.com/asset-1.jpg',
      }),
    );
  });

  it('deletes only stale pending unreferenced assets', async () => {
    prisma.uploadAsset.findMany.mockResolvedValue([
      { id: 1n, storagePublicId: 'products/7/asset-1' },
    ]);
    prisma.uploadAsset.deleteMany.mockResolvedValue({ count: 1 });
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({
      result: 'ok',
    });
    const now = new Date('2026-07-29T12:00:00.000Z');

    await expect(service.cleanupStalePending(now)).resolves.toBe(1);

    expect(prisma.uploadAsset.findMany).toHaveBeenCalledWith({
      where: {
        status: 'Pending',
        createdAt: { lt: new Date('2026-07-28T12:00:00.000Z') },
        productImage: null,
        shopAvatar: null,
      },
      select: { id: true, storagePublicId: true },
    });
    expect(prisma.uploadAsset.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 1n,
        status: 'Pending',
        productImage: null,
        shopAvatar: null,
      },
    });
  });

  it('does not delete provider asset when attach wins the cleanup race', async () => {
    prisma.uploadAsset.findMany.mockResolvedValue([
      { id: 1n, storagePublicId: 'products/7/asset-1' },
    ]);
    prisma.uploadAsset.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.cleanupStalePending()).resolves.toBe(0);
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });

  it('is idempotent after stale assets are claimed', async () => {
    prisma.uploadAsset.findMany
      .mockResolvedValueOnce([
        { id: 1n, storagePublicId: 'products/7/asset-1' },
      ])
      .mockResolvedValueOnce([]);
    prisma.uploadAsset.deleteMany.mockResolvedValue({ count: 1 });
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({
      result: 'ok',
    });

    await expect(service.cleanupStalePending()).resolves.toBe(1);
    await expect(service.cleanupStalePending()).resolves.toBe(0);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(1);
  });
});
