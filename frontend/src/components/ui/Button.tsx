import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'border border-border bg-white text-ink hover:bg-surface',
    danger: 'bg-danger text-white hover:brightness-95',
  }[variant];

  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60',
        variantClass,
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
