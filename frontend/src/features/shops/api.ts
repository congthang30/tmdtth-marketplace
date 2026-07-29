import { apiGet } from '@/services/api';

export type ShopCategory = { id: string; idString: string; parentShopCategoryId: string | null; categoryName: string; slug: string; imageUrl: string | null; productCount: number };
export type ShopCatalogProduct = { id: string; idString: string; slug: string; productName: string; priceMin: string; thumbnailImage: { id: string; imageUrl: string; altText: string | null } | null; shop: { id: string; shopName: string; slug: string } };
export type ShopCatalog = { shop: { id: string; idString: string; shopName: string; slug: string; description: string | null; province: string | null; createdAt: string; operationMode: 'Open' | 'PausedUntil' | 'PausedIndefinitely'; pauseStartsAt: string | null; pauseEndsAt: string | null; isAcceptingOrders: boolean }; categories: ShopCategory[]; products: ShopCatalogProduct[]; meta: { page: number; limit: number; total: number; totalPages: number } };

export const shopsApi = {
  getCatalog(slug: string, query: { category?: string; page?: number; search?: string }) {
    return apiGet<ShopCatalog>(`/shops/${slug}`, { params: query });
  },
};
