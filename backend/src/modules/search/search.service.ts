import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';

export type SearchSuggestion = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  url: string;
  score: number;
};
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .trim();
const score = (text: string, query: string, popularity = 0) => {
  const source = normalize(text);
  const q = normalize(query);
  if (source === q) return 1000 + popularity;
  if (source.startsWith(q)) return 700 + popularity;
  if (source.split(/\s+/).some((token) => token.startsWith(q)))
    return 450 + popularity;
  if (source.includes(q)) return 250 + popularity;
  return 0;
};
const rank = (items: SearchSuggestion[], limit: number) =>
  items
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'vi'))
    .slice(0, limit)
    .map(({ score: _score, ...item }) => item);

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async customer(query: string, limit: number) {
    const q = query.trim();
    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          productStatus: 'Published',
          isDeleted: false,
          isViolation: false,
          shop: {
            shopStatus: 'Approved',
            isDeleted: false,
            ownerUser: { userStatus: 'Active', isDeleted: false },
            OR: [
              { operationMode: 'Open' },
              {
                operationMode: 'PausedUntil',
                pauseStartsAt: { gt: new Date() },
              },
              {
                operationMode: 'PausedUntil',
                pauseEndsAt: { lte: new Date() },
              },
            ],
          },
          category: { isActive: true },
        },
        orderBy: [{ soldCount: 'desc' }, { viewCount: 'desc' }],
        take: 200,
        select: {
          productName: true,
          category: { select: { categoryName: true } },
        },
      }),
      this.prisma.category.findMany({
        where: { isActive: true },
        take: 100,
        select: { categoryName: true },
      }),
    ]);
    const sources = [
      q,
      ...products.map((item) => item.productName),
      ...categories.map((item) => item.categoryName),
    ];
    const seen = new Set<string>();
    const suggestions = sources.flatMap((title) => {
      const normalizedTitle = normalize(title);
      if (!normalizedTitle || seen.has(normalizedTitle)) return [];
      seen.add(normalizedTitle);
      const relevance =
        normalizedTitle === normalize(q) ? 1100 : score(title, q);
      if (relevance <= 0) return [];
      return [
        {
          id: `keyword-${normalizedTitle}`,
          type: 'keyword',
          title,
          subtitle: '',
          url: `/products?q=${encodeURIComponent(title)}`,
          score: relevance,
        },
      ];
    });
    return rank(suggestions, limit);
  }

  async seller(
    user: AuthenticatedUser,
    query: string,
    limit: number,
    scope:
      | 'all'
      | 'product'
      | 'variant'
      | 'order'
      | 'shop-category'
      | 'sale-campaign',
  ) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerUserId: user.id, isDeleted: false },
      select: { id: true },
    });
    if (!shop)
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Không tìm thấy gian hàng.',
        details: [],
      });
    const q = query.trim();
    const include = (target: typeof scope) =>
      scope === 'all' || scope === target;
    const [products, variants, orders, campaigns, categories] =
      await Promise.all([
        include('product')
          ? this.prisma.product.findMany({
              where: {
                shopId: shop.id,
                isDeleted: false,
                OR: [
                  { productName: { contains: q, mode: 'insensitive' } },
                  {
                    category: {
                      categoryName: { contains: q, mode: 'insensitive' },
                    },
                  },
                  { productStatus: { contains: q, mode: 'insensitive' } },
                ],
              },
              take: 20,
              select: { id: true, productName: true, productStatus: true },
            })
          : [],
        include('variant')
          ? this.prisma.productVariant.findMany({
              where: {
                product: { shopId: shop.id, isDeleted: false },
                OR: [
                  { sku: { contains: q, mode: 'insensitive' } },
                  { variantName: { contains: q, mode: 'insensitive' } },
                  {
                    product: {
                      productName: { contains: q, mode: 'insensitive' },
                    },
                  },
                ],
              },
              take: 20,
              select: {
                id: true,
                sku: true,
                variantName: true,
                productId: true,
                product: { select: { productName: true } },
              },
            })
          : [],
        include('order')
          ? this.prisma.shopOrder.findMany({
              where: {
                shopId: shop.id,
                OR: [
                  { shopOrderCode: { contains: q, mode: 'insensitive' } },
                  { orderStatus: { contains: q, mode: 'insensitive' } },
                  {
                    order: {
                      OR: [
                        { orderCode: { contains: q, mode: 'insensitive' } },
                        { receiverName: { contains: q, mode: 'insensitive' } },
                        { receiverPhone: { contains: q } },
                      ],
                    },
                  },
                ],
              },
              take: 20,
              select: {
                id: true,
                shopOrderCode: true,
                orderStatus: true,
                order: { select: { orderCode: true, receiverName: true } },
              },
            })
          : [],
        include('sale-campaign')
          ? this.prisma.shopSaleCampaign.findMany({
              where: {
                shopId: shop.id,
                OR: [
                  { campaignName: { contains: q, mode: 'insensitive' } },
                  { status: { contains: q, mode: 'insensitive' } },
                ],
              },
              take: 20,
              select: { id: true, campaignName: true, status: true },
            })
          : [],
        include('shop-category')
          ? this.prisma.shopCategory.findMany({
              where: {
                shopId: shop.id,
                OR: [
                  { categoryName: { contains: q, mode: 'insensitive' } },
                  { slug: { contains: q, mode: 'insensitive' } },
                ],
              },
              take: 20,
              select: {
                id: true,
                categoryName: true,
                slug: true,
                isActive: true,
              },
            })
          : [],
      ]);
    return rank(
      [
        ...products.map((x) => ({
          id: x.id.toString(),
          type: 'product',
          title: x.productName,
          subtitle: `Sản phẩm · ${x.productStatus}`,
          url: '/seller/products',
          score: score(`${x.productName} ${x.productStatus}`, q),
        })),
        ...variants.map((x) => ({
          id: x.id.toString(),
          type: 'variant',
          title: `${x.sku} · ${x.variantName}`,
          subtitle: x.product.productName,
          url: `/seller/products/${x.productId}/variants`,
          score: score(`${x.sku} ${x.variantName} ${x.product.productName}`, q),
        })),
        ...orders.map((x) => ({
          id: x.id.toString(),
          type: 'order',
          title: x.shopOrderCode,
          subtitle: `${x.order.receiverName} · ${x.orderStatus}`,
          url: '/seller/orders',
          score: score(
            `${x.shopOrderCode} ${x.order.orderCode} ${x.order.receiverName} ${x.orderStatus}`,
            q,
          ),
        })),
        ...campaigns.map((x) => ({
          id: x.id.toString(),
          type: 'sale-campaign',
          title: x.campaignName,
          subtitle: `Chương trình giảm giá · ${x.status}`,
          url: '/seller/sale-campaigns',
          score: score(`${x.campaignName} ${x.status}`, q),
        })),
        ...categories.map((x) => ({
          id: x.id.toString(),
          type: 'shop-category',
          title: x.categoryName,
          subtitle: `${x.slug} · ${x.isActive ? 'Đang hiển thị' : 'Đang ẩn'}`,
          url: '/seller/shop-categories',
          score: score(`${x.categoryName} ${x.slug}`, q),
        })),
      ],
      limit,
    );
  }

  async admin(query: string, limit: number) {
    const q = query.trim();
    const [shops, categories, products, vouchers, carriers] = await Promise.all(
      [
        this.prisma.shop.findMany({
          where: { shopName: { contains: q, mode: 'insensitive' } },
          take: 15,
          select: { id: true, shopName: true, shopStatus: true },
        }),
        this.prisma.category.findMany({
          where: { categoryName: { contains: q, mode: 'insensitive' } },
          take: 15,
          select: { id: true, categoryName: true, isActive: true },
        }),
        this.prisma.product.findMany({
          where: { productName: { contains: q, mode: 'insensitive' } },
          take: 15,
          select: {
            id: true,
            productName: true,
            productStatus: true,
            shop: { select: { shopName: true } },
          },
        }),
        this.prisma.voucher.findMany({
          where: {
            shopId: null,
            OR: [
              { voucherCode: { contains: q, mode: 'insensitive' } },
              { voucherName: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: 10,
          select: { id: true, voucherCode: true, voucherName: true },
        }),
        this.prisma.shippingCompany.findMany({
          where: { companyName: { contains: q, mode: 'insensitive' } },
          take: 10,
          select: { id: true, companyName: true, companyStatus: true },
        }),
      ],
    );
    return rank(
      [
        ...shops.map((x) => ({
          id: x.id.toString(),
          type: 'shop',
          title: x.shopName,
          subtitle: `Gian hàng · ${x.shopStatus}`,
          url: '/admin/shops',
          score: score(x.shopName, q),
        })),
        ...categories.map((x) => ({
          id: x.id.toString(),
          type: 'category',
          title: x.categoryName,
          subtitle: x.isActive ? 'Danh mục · Hoạt động' : 'Danh mục · Đang ẩn',
          url: '/admin/categories',
          score: score(x.categoryName, q),
        })),
        ...products.map((x) => ({
          id: x.id.toString(),
          type: 'product',
          title: x.productName,
          subtitle: `${x.shop.shopName} · ${x.productStatus}`,
          url: '/admin',
          score: score(`${x.productName} ${x.shop.shopName}`, q),
        })),
        ...vouchers.map((x) => ({
          id: x.id.toString(),
          type: 'voucher',
          title: x.voucherCode,
          subtitle: x.voucherName,
          url: '/admin/vouchers',
          score: score(`${x.voucherCode} ${x.voucherName}`, q),
        })),
        ...carriers.map((x) => ({
          id: x.id.toString(),
          type: 'shipping-company',
          title: x.companyName,
          subtitle: `Đơn vị vận chuyển · ${x.companyStatus}`,
          url: '/admin/shipping-providers',
          score: score(x.companyName, q),
        })),
      ],
      limit,
    );
  }
}
