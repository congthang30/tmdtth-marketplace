import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <section className="rounded-lg border border-border bg-white p-6 shadow-panel sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
        {eyebrow}
      </p>
      <div className="mt-3 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
          {description}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-panel hover:bg-primary-700"
        >
          Open catalog
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-surface"
        >
          Open workspace
        </Link>
      </div>
    </section>
  );
}
