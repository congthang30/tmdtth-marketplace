import {
  FolderTree,
  LayoutDashboard,
  PackagePlus,
  UserRound,
  ShieldCheck,
  Store,
  Ticket,
  Truck,
  Warehouse,
  CalendarClock,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { SuggestionSearch } from "@/features/search/SuggestionSearch";
import { useAuthStore } from "@/stores/auth.store";
import type { AppRole } from "@/types/domain";

const navItems = [
  { to: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  {
    to: "/seller",
    label: "Tổng quan người bán",
    icon: Store,
    roles: ["Seller"],
  },
  {
    to: "/seller/shop/register",
    label: "Đăng ký gian hàng",
    icon: Store,
    roles: ["Seller"],
  },
  {
    to: "/seller/products",
    label: "Sản phẩm của gian hàng",
    icon: PackagePlus,
    roles: ["Seller"],
  },
  {
    to: "/seller/shop-categories",
    label: "Danh mục của gian hàng",
    icon: FolderTree,
    roles: ["Seller"],
  },
  {
    to: "/seller/orders",
    label: "Đơn hàng của gian hàng",
    icon: Warehouse,
    roles: ["Seller"],
  },
  {
    to: "/seller/sale-campaigns",
    label: "Chương trình giảm giá",
    icon: CalendarClock,
    roles: ["Seller"],
  },
  {
    to: "/seller/vouchers",
    label: "Mã giảm giá",
    icon: Ticket,
    roles: ["Seller"],
  },
  {
    to: "/admin",
    label: "Tổng quan quản trị",
    icon: ShieldCheck,
    roles: ["Admin"],
  },
  {
    to: "/admin/categories",
    label: "Danh mục",
    icon: FolderTree,
    roles: ["Admin"],
  },
  {
    to: "/admin/shops",
    label: "Duyệt gian hàng",
    icon: Store,
    roles: ["Admin"],
  },
  {
    to: "/admin/shipping/providers",
    label: "Đối tác vận chuyển",
    icon: Truck,
    roles: ["Admin"],
  },
  {
    to: "/admin/vouchers",
    label: "Mã giảm giá",
    icon: Ticket,
    roles: ["Admin"],
  },
] satisfies Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: AppRole[];
}>;

const canViewItem = (roles: AppRole[], itemRoles?: AppRole[]) => {
  if (!itemRoles) {
    return true;
  }

  return itemRoles.some((role) => roles.includes(role));
};

const getRoleLabel = (roles: AppRole[]) => {
  if (roles.includes("Admin")) {
    return "Quản trị viên";
  }

  if (roles.includes("Seller")) {
    return "Người bán";
  }

  return "Khách hàng";
};

export function DashboardLayout() {
  const user = useAuthStore((state) => state.user);
  const visibleItems = navItems.filter((item) =>
    canViewItem(user?.roles ?? [], item.roles),
  );
  const fullName = user?.profile?.fullName ?? user?.email ?? "Tài khoản";
  const roleLabel = getRoleLabel(user?.roles ?? []);
  const searchContext = user?.roles.includes("Admin") ? "admin" : "seller";

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="grid min-h-screen lg:grid-cols-[264px_1fr]">
        <aside className="border-b border-border bg-white lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-5 py-5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-600 text-white">
              <Store size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">TMDTTH</p>
              <p className="text-xs text-muted">Quản lý sàn thương mại</p>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-muted hover:bg-surface hover:text-ink",
                  ].join(" ")
                }
              >
                <item.icon size={16} aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">
          <header className="border-b border-border bg-white px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Khu vực tài khoản
                </p>
                <h1 className="text-xl font-semibold">{fullName}</h1>
              </div>
              <div className="w-full sm:max-w-md">
                <SuggestionSearch context={searchContext} placeholder={searchContext === "admin" ? "Tìm shop, sản phẩm, danh mục..." : "Tìm sản phẩm, SKU, voucher..."} label="Tìm trong khu vực quản lý" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <NavLink
                  to="/profile"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-muted hover:bg-surface hover:text-ink"
                >
                  <UserRound size={15} aria-hidden="true" />
                  {roleLabel}
                </NavLink>
                <LogoutButton />
              </div>
            </div>
          </header>
          <main className="px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
