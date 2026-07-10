import type {
  HTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';

type ClassNameProp = {
  className?: string;
};

const joinClasses = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(' ');

export function Table({
  className = '',
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-panel">
      <div className="overflow-x-auto">
        <table
          className={joinClasses('min-w-full divide-y divide-border', className)}
          {...props}
        />
      </div>
    </div>
  );
}

export function TableHead({
  className = '',
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={joinClasses('bg-surface text-left', className)} {...props} />
  );
}

export function TableBody({
  className = '',
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={joinClasses('divide-y divide-border', className)} {...props} />;
}

export function TableRow({
  className = '',
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={joinClasses('transition hover:bg-primary-50/50', className)}
      {...props}
    />
  );
}

export function TableHeaderCell({
  className = '',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & ClassNameProp) {
  return (
    <th
      className={joinClasses(
        'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className = '',
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & ClassNameProp) {
  return (
    <td
      className={joinClasses('px-4 py-3 text-sm text-ink', className)}
      {...props}
    />
  );
}
