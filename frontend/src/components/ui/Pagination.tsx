import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

export function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  className = '',
}: PaginationProps) {
  const safePage = Math.max(1, page);
  const safeTotal = Math.max(1, totalPages);
  const canGoPrev = safePage > 1 && !disabled;
  const canGoNext = safePage < safeTotal && !disabled;

  return (
    <div
      className={[
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      ].join(' ')}
    >
      <p className="text-sm text-muted">
        Page <span className="font-medium text-ink">{safePage}</span> of{' '}
        <span className="font-medium text-ink">{safeTotal}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={!canGoPrev}
          onClick={() => onPageChange(safePage - 1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!canGoNext}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
