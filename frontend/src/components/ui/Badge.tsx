import type { ReactNode } from 'react';

type BadgeProps = {
  children: ReactNode;
  tone?: 'default' | 'success' | 'danger';
};

const toneClassName = {
  default: 'border-primary-100 bg-primary-50 text-primary-700',
  success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  danger: 'border-red-100 bg-red-50 text-red-700',
};

export function Badge({ children, tone = 'default' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
        toneClassName[tone],
      ].join(' ')}
    >
      {children}
    </span>
  );
}
