import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { CreateSaleCampaignDto } from './dto/create-sale-campaign.dto';

@Injectable()
export class SaleCampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const shop = await this.requireShop(user);
    const campaigns = await this.prisma.shopSaleCampaign.findMany({
      where: { shopId: shop.id },
      orderBy: [{ startsAt: 'desc' }],
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: { select: { productName: true } } },
            },
          },
        },
      },
    });
    const now = new Date();
    return campaigns.map((campaign) => ({
      id: campaign.id.toString(),
      campaignName: campaign.campaignName,
      startsAt: campaign.startsAt.toISOString(),
      endsAt: campaign.endsAt.toISOString(),
      status: this.displayStatus(
        campaign.status,
        campaign.startsAt,
        campaign.endsAt,
        now,
      ),
      items: campaign.items.map((item) => ({
        id: item.id.toString(),
        productVariantId: item.productVariantId.toString(),
        productName: item.productVariant.product.productName,
        variantName: item.productVariant.variantName,
        regularPrice: item.productVariant.price.toString(),
        salePrice: item.salePrice.toString(),
      })),
    }));
  }

  async create(user: AuthenticatedUser, dto: CreateSaleCampaignDto) {
    const shop = await this.requireShop(user);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (startsAt >= endsAt)
      throw new BadRequestException({
        code: 'INVALID_SALE_PERIOD',
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu.',
        details: [{ field: 'endsAt' }],
      });
    const ids = dto.items.map((item) => BigInt(item.productVariantId));
    if (new Set(ids.map(String)).size !== ids.length)
      throw new BadRequestException({
        code: 'DUPLICATE_VARIANT',
        message: 'Một phân loại chỉ được thêm một lần.',
        details: [],
      });
    const variants = await this.prisma.productVariant.findMany({
      where: {
        id: { in: ids },
        product: { shopId: shop.id, isDeleted: false },
      },
      select: { id: true, price: true },
    });
    if (variants.length !== ids.length)
      throw new NotFoundException({
        code: 'VARIANT_NOT_FOUND',
        message: 'Có phân loại không thuộc gian hàng.',
        details: [],
      });
    const prices = new Map(
      variants.map((variant) => [variant.id.toString(), variant.price]),
    );
    for (const item of dto.items) {
      const salePrice = new Prisma.Decimal(item.salePrice);
      const regularPrice = prices.get(item.productVariantId)!;
      if (!salePrice.gt(0) || !salePrice.lt(regularPrice))
        throw new BadRequestException({
          code: 'INVALID_SALE_PRICE',
          message: 'Giá sale phải lớn hơn 0 và thấp hơn giá bán thường.',
          details: [
            { field: 'salePrice', productVariantId: item.productVariantId },
          ],
        });
    }
    if (dto.status === 'Scheduled') {
      const overlap = await this.prisma.shopSaleCampaignItem.findFirst({
        where: {
          productVariantId: { in: ids },
          campaign: {
            shopId: shop.id,
            status: 'Scheduled',
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        },
        select: { id: true },
      });
      if (overlap)
        throw new ConflictException({
          code: 'SALE_PERIOD_OVERLAP',
          message: 'Một phân loại đã có chương trình sale trùng thời gian.',
          details: [],
        });
    }
    const created = await this.prisma.shopSaleCampaign.create({
      data: {
        shopId: shop.id,
        campaignName: dto.campaignName,
        startsAt,
        endsAt,
        status: dto.status,
        items: {
          create: dto.items.map((item) => ({
            productVariantId: BigInt(item.productVariantId),
            salePrice: new Prisma.Decimal(item.salePrice),
          })),
        },
      },
      select: { id: true },
    });
    return { id: created.id.toString() };
  }

  async cancel(user: AuthenticatedUser, id: string) {
    const shop = await this.requireShop(user);
    const campaign = await this.prisma.shopSaleCampaign.findFirst({
      where: { id: BigInt(id), shopId: shop.id },
    });
    if (!campaign)
      throw new NotFoundException({
        code: 'SALE_CAMPAIGN_NOT_FOUND',
        message: 'Không tìm thấy chương trình giảm giá.',
        details: [],
      });
    await this.prisma.shopSaleCampaign.update({
      where: { id: campaign.id },
      data: { status: 'Cancelled', updatedAt: new Date() },
    });
    return { id, status: 'Cancelled' };
  }

  private async requireShop(user: AuthenticatedUser) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerUserId: user.id, shopStatus: 'Approved', isDeleted: false },
      select: { id: true },
    });
    if (!shop)
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Không tìm thấy gian hàng.',
        details: [],
      });
    return shop;
  }
  private displayStatus(status: string, start: Date, end: Date, now: Date) {
    if (status === 'Cancelled' || status === 'Draft') return status;
    if (now < start) return 'Scheduled';
    if (now < end) return 'Active';
    return 'Ended';
  }
}
