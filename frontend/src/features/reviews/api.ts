import { apiPost } from '@/services/api';

export type CreateProductReviewRequest = {
  orderItemId: string;
  rating: number;
  reviewTitle?: string;
  reviewContent?: string;
};

export type ProductReviewResponse = {
  id: string;
  idString: string;
  orderItemId: string;
  orderItemIdString: string;
  rating: number;
  reviewTitle: string | null;
  reviewContent: string | null;
  reviewStatus: string;
  createdAt: string;
  updatedAt: string | null;
};

export const reviewsApi = {
  createProductReview(body: CreateProductReviewRequest) {
    return apiPost<ProductReviewResponse, CreateProductReviewRequest>(
      '/reviews/products',
      body,
    );
  },
};
