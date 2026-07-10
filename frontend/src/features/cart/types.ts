export type CartItemResponse = {
  id: string;
  idString: string;
  quantity: number;
  isSelected: boolean;
  unitPriceSnapshot: string;
  lineTotal: string;
  product: {
    id: string;
    idString: string;
    productName: string;
    slug: string;
    thumbnailImage: {
      imageUrl: string;
      altText: string | null;
    } | null;
  };
  variant: {
    id: string;
    idString: string;
    sku: string;
    variantName: string;
    price: string;
    quantityAvailable: number;
  };
  shop: {
    id: string;
    idString: string;
    shopName: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string | null;
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
  createdAt: string;
  updatedAt: string | null;
};

export type DeleteCartItemResponse = {
  id: string;
  deleted: true;
};
