import { useQuery } from "@tanstack/react-query";
import { Activity, ShoppingCart, Store, UserRound } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { systemApi } from "@/services/system";
import { useAuthStore } from "@/stores/auth.store";

const publicLinks = [
  { to: "/products", label: "Sản phẩm" },
  { to: "/dashboard", label: "Khu vực làm việc" },
];

export function PublicLayout() {
  const user = useAuthStore((state) => state.user);
  const healthQuery = useQuery({
    queryKey: ["system", "health"],
    queryFn: systemApi.health,
    refetchInterval: 60_000,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Link to="/" className="flex items-center gap-3 font-semibold">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-600 text-white">
              <Store size={20} aria-hidden="true" />
            </span>
            <span>TMDTTH Marketplace</span>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  [
                    "rounded-md px-3 py-2 text-sm font-medium",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-muted hover:bg-surface hover:text-ink",
                  ].join(" ")
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={healthQuery.isError ? "danger" : "success"}>
              <Activity size={14} aria-hidden="true" />
              {healthQuery.isError ? "API ngoại tuyến" : "API trực tuyến"}
            </Badge>
            <ButtonLink to="/cart" variant="secondary">
              <ShoppingCart size={16} aria-hidden="true" />
              Giỏ hàng
            </ButtonLink>
            {user ? (
              <>
                <ButtonLink to="/profile" variant="secondary">
                  <UserRound size={16} aria-hidden="true" />
                  Hồ sơ
                </ButtonLink>
                <LogoutButton />
              </>
            ) : (
              <ButtonLink to="/login">
                <UserRound size={16} aria-hidden="true" />
                Đăng nhập
              </ButtonLink>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
