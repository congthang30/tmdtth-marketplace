import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type ButtonLinkProps = {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
};

export function ButtonLink({
  to,
  children,
  variant = 'primary',
}: ButtonLinkProps) {
  const className =
    variant === 'primary'
      ? 'inline-flex min-h-11 items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700'
      : 'inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-surface';

  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
