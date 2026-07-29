import type { ApiMeta } from '@/types/api';

export type CategoryTreeNode = {
  id: string;
  idString: string;
  parentCategoryId: string | null;
  categoryName: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  children: CategoryTreeNode[];
};

export type ProductImage = {
  id: string;
  idString: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isThumbnail: boolean;
};

export type ProductVariant = {
  id: string;
  idString: string;
  sku: string;
  variantName: string;
  price: string;
  compareAtPrice: string | null;
  quantityAvailable: number;
};

export type ProductListItem = {
  id: string;
  idString: string;
  productName: string;
  slug: string;
  description: string | null;
  brand: string | null;
  basePrice: string;
  compareAtPrice: string | null;
  priceMin: string;
  priceMax: string;
  thumbnailImage: ProductImage | null;
  images: ProductImage[];
  variants: ProductVariant[];
  quantityAvailable: number;
  soldCount: string;
  viewCount: string;
  shop: {
    id: string;
    idString: string;
    shopName: string;
    slug: string;
  };
  category: {
    id: string;
    idString: string;
    categoryName: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string | null;
};

export type ProductListQuery = {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: 'createdAt' | 'basePrice' | 'soldCount' | 'viewCount' | 'productName';
  sortOrder?: 'asc' | 'desc';
};

export type ProductListResponse = {
  items: ProductListItem[];
  meta?: ApiMeta;
};

export type PublicProductReview = {
  id: string;
  idString: string;
  orderItemId: string;
  orderItemIdString: string;
  productVariant: {
    id: string;
    idString: string;
    sku: string;
    variantName: string;
  } | null;
  reviewer: {
    displayName: string;
  };
  rating: number;
  reviewTitle: string | null;
  reviewContent: string | null;
  createdAt: string;
  updatedAt: string | null;
};
