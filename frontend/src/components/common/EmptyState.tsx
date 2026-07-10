import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white px-6 py-10 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-primary-50 text-primary-700">
        <Inbox size={20} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
