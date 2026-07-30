import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const inputId = id ?? props.name;
    const errorId = inputId ? `${inputId}-error` : undefined;

    return (
      <label className="block" htmlFor={inputId}>
        <span className="text-sm font-medium text-ink">{label}</span>
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : props['aria-describedby']}
          className={[
            'mt-1 block min-h-28 w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
            error ? 'border-danger focus:border-danger focus:ring-red-100' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {error ? (
          <span id={errorId} className="mt-1 block text-xs text-danger">{error}</span>
        ) : null}
      </label>
    );
  },
);

Textarea.displayName = 'Textarea';
