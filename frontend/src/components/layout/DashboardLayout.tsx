import {
  Boxes,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  MapPin,
  PackagePlus,
  UserRound,
  ShieldCheck,
  Store,
  Truck,
  Warehouse,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { LogoutButton } from '@/features/auth/components/LogoutButton';
import { useAuthStore } from '@/stores/auth.store';
import type { AppRole } from '@/types/domain';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Catalog', icon: Boxes },
  { to: '/addresses', label: 'Addresses', icon: MapPin },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/seller', label: 'Seller home', icon: Store, roles: ['Seller'] },
  {
    to: '/seller/shop/register',
    label: 'Register shop',
    icon: Store,
    roles: ['Seller'],
  },
  {
    to: '/seller/products',
    label: 'Seller products',
    icon: PackagePlus,
    roles: ['Seller'],
  },
  {
    to: '/seller/orders',
    label: 'Seller orders',
    icon: Warehouse,
    roles: ['Seller'],
  },
  { to: '/admin', label: 'Admin home', icon: ShieldCheck, roles: ['Admin'] },
  {
    to: '/admin/categories',
    label: 'Categories',
    icon: FolderTree,
    roles: ['Admin'],
  },
  {
    to: '/admin/shops',
    label: 'Shop approvals',
    icon: Store,
    roles: ['Admin'],
  },
  {
    to: '/admin/shipping/companies',
    label: 'Carriers',
    icon: Truck,
    roles: ['Admin'],
  },
  {
    to: '/admin/shipping/services',
    label: 'Shipping services',
    icon: ClipboardList,
    roles: ['Admin'],
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
  if (roles.includes('Admin')) {
    return 'Admin';
  }

  if (roles.includes('Seller')) {
    return 'Seller';
  }

  return 'Customer';
};

export function DashboardLayout() {
  const user = useAuthStore((state) => state.user);
  const visibleItems = navItems.filter((item) =>
    canViewItem(user?.roles ?? [], item.roles),
  );
  const fullName = user?.profile?.fullName ?? user?.email ?? 'Account';
  const roleLabel = getRoleLabel(user?.roles ?? []);

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
              <p className="text-xs text-muted">Marketplace ops</p>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-muted hover:bg-surface hover:text-ink',
                  ].join(' ')
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
                  Frontend MVP
                </p>
                <h1 className="text-xl font-semibold">{fullName}</h1>
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
