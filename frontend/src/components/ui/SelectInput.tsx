import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ label, error, id, className = '', children, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <label className="block" htmlFor={inputId}>
        <span className="text-sm font-medium text-ink">{label}</span>
        <select
          ref={ref}
          id={inputId}
          className={[
            'mt-1 block w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
            error ? 'border-danger focus:border-danger focus:ring-red-100' : '',
            className,
          ].join(' ')}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <span className="mt-1 block text-xs text-danger">{error}</span>
        ) : null}
      </label>
    );
  },
);

SelectInput.displayName = 'SelectInput';
