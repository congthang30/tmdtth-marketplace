import { useQuery } from '@tanstack/react-query';
import { FolderTree, ShieldCheck, Store, Truck } from 'lucide-react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  adminCategoriesApi,
  adminShippingCompaniesApi,
  adminShippingServicesApi,
  adminShopsApi,
} from '../api';

export function AdminDashboardPage() {
  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: adminCategoriesApi.list,
  });
  const shopsQuery = useQuery({
    queryKey: ['admin', 'shops', 1, 'PendingApproval'],
    queryFn: () => adminShopsApi.list(1, 5, 'PendingApproval'),
  });
  const companiesQuery = useQuery({
    queryKey: ['admin', 'shipping-companies', 1],
    queryFn: () => adminShippingCompaniesApi.list(1, 5),
  });
  const servicesQuery = useQuery({
    queryKey: ['admin', 'shipping-services', 1],
    queryFn: () => adminShippingServicesApi.list(1, 5),
  });

  const isLoading =
    categoriesQuery.isLoading ||
    shopsQuery.isLoading ||
    companiesQuery.isLoading ||
    servicesQuery.isLoading;

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const stats = [
    {
      label: 'Categories',
      value: categoriesQuery.data?.length ?? 0,
      icon: FolderTree,
      to: '/admin/categories',
    },
    {
      label: 'Pending shops',
      value: shopsQuery.data?.meta?.total ?? 0,
      icon: Store,
      to: '/admin/shops',
    },
    {
      label: 'Shipping companies',
      value: companiesQuery.data?.meta?.total ?? 0,
      icon: Truck,
      to: '/admin/shipping/companies',
    },
    {
      label: 'Shipping services',
      value: servicesQuery.data?.meta?.total ?? 0,
      icon: ShieldCheck,
      to: '/admin/shipping/services',
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Operations dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          Manage marketplace categories, shop approvals, and shipping setup.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-lg border border-border bg-white p-5 shadow-panel"
          >
            <stat.icon size={18} className="text-primary-700" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
            <div className="mt-4">
              <ButtonLink to={stat.to} variant="secondary">
                Open
              </ButtonLink>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
