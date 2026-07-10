import type { ReactNode } from 'react';

type BadgeProps = {
  children: ReactNode;
};

export function Badge({ children }: BadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
      {children}
    </span>
  );
}
