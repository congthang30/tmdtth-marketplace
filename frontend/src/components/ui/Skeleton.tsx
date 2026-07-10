type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={['animate-pulse rounded-md bg-border/70', className].join(' ')}
      aria-hidden="true"
    />
  );
}
