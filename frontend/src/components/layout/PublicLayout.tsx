import { ShoppingCart, Store, UserRound } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { AccountMenu } from "@/features/auth/components/AccountMenu";
import { SuggestionSearch } from "@/features/search/SuggestionSearch";
import { useAuthStore } from "@/stores/auth.store";

export function PublicLayout() {
  const user = useAuthStore((state) => state.user);

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

          <div className="order-3 w-full md:order-none md:max-w-md">
            <SuggestionSearch context="customer" placeholder="Tìm sản phẩm, danh mục hoặc gian hàng" label="Tìm kiếm trên sàn" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink to="/cart" variant="secondary">
              <ShoppingCart size={16} aria-hidden="true" />
              Giỏ hàng
            </ButtonLink>
            {user ? (
              <AccountMenu />
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
