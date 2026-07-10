import type { ReactNode } from 'react';

type AlertProps = {
  children: ReactNode;
  tone?: 'danger' | 'info';
  className?: string;
};

export function Alert({ children, tone = 'info', className = '' }: AlertProps) {
  const toneClass =
    tone === 'danger'
      ? 'border-danger/30 bg-red-50 text-danger'
      : 'border-primary-100 bg-primary-50 text-primary-700';

  return (
    <div
      className={[
        'rounded-md border px-4 py-3 text-sm font-medium',
        toneClass,
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
