export type CartProductSummary = {
  id: string;
  idString: string;
  productName: string;
  slug: string;
  thumbnailImage: {
    imageUrl: string;
    altText: string | null;
  } | null;
};

export type CartVariantSummary = {
  id: string;
  idString: string;
  sku: string;
  variantName: string;
  price: string;
  quantityAvailable: number;
};

export type CartShopSummary = {
  id: string;
  idString: string;
  shopName: string;
  slug: string;
};

export type CartItemResponse = {
  id: string;
  idString: string;
  quantity: number;
  isSelected: boolean;
  unitPriceSnapshot: string;
  lineTotal: string;
  product: CartProductSummary;
  variant: CartVariantSummary;
  shop: CartShopSummary;
  createdAt: Date;
  updatedAt: Date | null;
};

export type CartResponse = {
  id: string;
  idString: string;
  cartStatus: string;
  items: CartItemResponse[];
  itemCount: number;
  selectedItemCount: number;
  subtotal: string;
  selectedSubtotal: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export type DeleteCartItemResponse = {
  id: string;
  deleted: true;
};
