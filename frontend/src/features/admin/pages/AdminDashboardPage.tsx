import { useQuery } from "@tanstack/react-query";
import { FolderTree, ShieldCheck, Truck } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  adminCategoriesApi,
  adminShippingProvidersApi,
} from "../api";

export function AdminDashboardPage() {
  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: adminCategoriesApi.list,
  });
  const providersQuery = useQuery({
    queryKey: ["admin", "shipping-providers"],
    queryFn: () => adminShippingProvidersApi.list(),
  });

  const isLoading = categoriesQuery.isLoading || providersQuery.isLoading;

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const configuredProviders =
    providersQuery.data?.filter((provider) => provider.isConfigured).length ??
    0;
  const totalProviders = providersQuery.data?.length ?? 0;

  const stats = [
    {
      label: "Danh mục",
      value: categoriesQuery.data?.length ?? 0,
      icon: FolderTree,
      to: "/admin/categories",
    },
    {
      label: "Đối tác vận chuyển đã kết nối",
      value: `${configuredProviders}/${totalProviders}`,
      icon: Truck,
      to: "/admin/shipping/providers",
    },
    {
      label: "Xác minh người bán",
      value: "Mở hồ sơ",
      icon: ShieldCheck,
      to: "/admin/seller-verifications",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Quản trị
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Tổng quan vận hành</h1>
        <p className="mt-2 text-sm text-muted">
          Quản lý danh mục, phê duyệt gian hàng và cấu hình vận chuyển.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-lg border border-border bg-white p-5 shadow-panel"
          >
            <stat.icon
              size={18}
              className="text-primary-700"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm text-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
            <div className="mt-4">
              <ButtonLink to={stat.to} variant="secondary">
                Mở
              </ButtonLink>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
