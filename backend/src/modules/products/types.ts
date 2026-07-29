export type ProductListVariantResponse = {
  id: string;
  idString: string;
  sku: string;
  variantName: string;
  price: string;
  compareAtPrice: string | null;
  quantityAvailable: number;
};

export type SellerProductVariantResponse = ProductListVariantResponse & {
  productId: string;
  productIdString: string;
  variantOptionJson: string | null;
  weightGram: number;
  variantStatus: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export type ProductListImageResponse = {
  id: string;
  idString: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isThumbnail: boolean;
};

export type SellerProductImageResponse = ProductListImageResponse & {
  productId: string;
  productIdString: string;
  productVariantId: string | null;
  productVariantIdString: string | null;
  createdAt: Date;
};

export type DeleteProductImageResponse = {
  id: string;
  deleted: true;
};

export type SellerProductInventoryResponse = {
  id: string | null;
  idString: string | null;
  productId: string;
  productIdString: string;
  productVariantId: string;
  productVariantIdString: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityDamaged: number;
  quantityIncoming: number;
  lowStockThreshold: number;
  updatedAt: Date | null;
};

export type InventoryAffectedBucket =
  | 'AVAILABLE'
  | 'ON_HAND'
  | 'RESERVED'
  | 'UNKNOWN';

export type SellerInventoryTransactionResponse = {
  id: string;
  idString: string;
  transactionType: string;
  affectedBucket: InventoryAffectedBucket;
  quantityChange: number;
  quantityAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdBy: { id: string; email: string } | null;
  createdAt: Date;
};

export type ProductListItemResponse = {
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
  thumbnailImage: ProductListImageResponse | null;
  images: ProductListImageResponse[];
  variants: ProductListVariantResponse[];
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
  createdAt: Date;
  updatedAt: Date | null;
};

export type SellerProductListItemResponse = ProductListItemResponse & {
  productStatus: string;
  isViolation: boolean;
  isDeleted: boolean;
};
