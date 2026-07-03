export type ProductReviewResponse = {
  id: string;
  idString: string;
  orderItemId: string;
  orderItemIdString: string;
  product: {
    id: string;
    idString: string;
    productName: string;
    slug: string;
  };
  productVariant: {
    id: string;
    idString: string;
    sku: string;
    variantName: string;
  } | null;
  userId: string;
  userIdString: string;
  rating: number;
  reviewTitle: string | null;
  reviewContent: string | null;
  reviewStatus: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export type PublicProductReviewResponse = {
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
  createdAt: Date;
  updatedAt: Date | null;
};
