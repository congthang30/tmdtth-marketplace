import { Star } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/utils/format';
import type { PublicProductReview } from '../types';

type ProductReviewsProps = {
  reviews: PublicProductReview[];
  isLoading: boolean;
  isError: boolean;
};

function Rating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-warning" aria-label={`${value} stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={15}
          className={index < value ? 'fill-warning' : ''}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function ProductReviews({
  reviews,
  isLoading,
  isError,
}: ProductReviewsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Cannot load reviews"
        message="Refresh the product page or check the backend service."
      />
    );
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        title="No reviews yet"
        description="Published customer reviews will appear here after orders are completed."
      />
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="rounded-lg border border-border bg-white p-4 shadow-panel"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium text-ink">{review.reviewer.displayName}</p>
              <p className="mt-1 text-xs text-muted">{formatDate(review.createdAt)}</p>
            </div>
            <Rating value={review.rating} />
          </div>
          {review.reviewTitle ? (
            <h3 className="mt-3 text-sm font-semibold text-ink">
              {review.reviewTitle}
            </h3>
          ) : null}
          {review.reviewContent ? (
            <p className="mt-2 text-sm leading-6 text-muted">
              {review.reviewContent}
            </p>
          ) : null}
          {review.productVariant ? (
            <p className="mt-3 text-xs text-muted">
              Variant: {review.productVariant.variantName}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
