import { BriefcaseBusiness, ChevronDown, MapPin, Store, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogoutButton } from "./LogoutButton";
import { useAuthStore } from "@/stores/auth.store";

export function AccountMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isSeller = user?.roles.includes("Seller") ?? false;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const itemClassName =
    "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600";

  return (
    <div ref={containerRef} className="relative">
      <button
        id="account-menu-button"
        type="button"
        aria-expanded={isOpen}
        aria-controls="account-menu"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
        onClick={() => setIsOpen((current) => !current)}
      >
        <UserRound size={16} aria-hidden="true" />
        Tài khoản
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={isOpen ? "rotate-180 transition-transform" : "transition-transform"}
        />
      </button>

      {isOpen ? (
        <div
          id="account-menu"
          aria-labelledby="account-menu-button"
          className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-white p-2 shadow-panel"
        >
          <Link
            to="/profile"
            className={itemClassName}
            onClick={() => setIsOpen(false)}
          >
            <UserRound size={16} aria-hidden="true" />
            Hồ sơ
          </Link>
          <Link
            to="/addresses"
            className={itemClassName}
            onClick={() => setIsOpen(false)}
          >
            <MapPin size={16} aria-hidden="true" />
            Quản lý địa chỉ
          </Link>
          <Link
            to={isSeller ? "/seller" : "/seller/shop/register"}
            className={itemClassName}
            onClick={() => setIsOpen(false)}
          >
            {isSeller ? (
              <BriefcaseBusiness size={16} aria-hidden="true" />
            ) : (
              <Store size={16} aria-hidden="true" />
            )}
            {isSeller ? "Khu vực người bán" : "Đăng ký bán hàng"}
          </Link>
          <div className="my-1 border-t border-border" />
          <LogoutButton className={itemClassName} />
        </div>
      ) : null}
    </div>
  );
}
