import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductVisual } from "@/features/catalog/components/ProductVisual";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { formatMoney } from "@/utils/format";
import { cartApi, cartQueryKey } from "../api";
import type { CartItemResponse } from "../types";

type CartItemCardProps = {
  item: CartItemResponse;
  onQuantityChange: (item: CartItemResponse, quantity: number) => void;
  onSelectChange: (item: CartItemResponse, isSelected: boolean) => void;
  onDelete: (item: CartItemResponse) => void;
  isMutating: boolean;
};

function CartItemCard({
  item,
  onQuantityChange,
  onSelectChange,
  onDelete,
  isMutating,
}: CartItemCardProps) {
  return (
    <article className={`grid gap-4 rounded-lg border bg-white p-4 shadow-panel sm:grid-cols-[auto_112px_1fr_auto] sm:items-center ${item.availability.isAvailable ? 'border-border' : 'border-danger-200 bg-danger-50/30'}`}>
      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-primary-600"
          checked={item.isSelected}
          disabled={isMutating || !item.availability.isAvailable}
          onChange={(event) => onSelectChange(item, event.target.checked)}
        />
        Chọn
      </label>
      <Link
        to={`/products/${item.product.slug}`}
        className="block overflow-hidden rounded-md border border-border"
      >
        <ProductVisual
          imageUrl={item.product.thumbnailImage?.imageUrl}
          altText={
            item.product.thumbnailImage?.altText ?? item.product.productName
          }
          className="aspect-square"
        />
      </Link>
      <div className="min-w-0">
        <Link
          to={`/products/${item.product.slug}`}
          className="font-semibold text-ink hover:text-primary-700"
        >
          {item.product.productName}
        </Link>
        <p className="mt-1 text-sm text-muted">{item.variant.variantName}</p>
        <p className="mt-1 text-sm text-muted">{item.shop.shopName}</p>
        <p className="mt-3 text-sm font-medium text-primary-700">
          {formatMoney(item.unitPriceSnapshot)}
        </p>
        {!item.availability.isAvailable ? <p className="mt-2 text-sm font-medium text-danger-700" role="status">{item.availability.message ?? 'Sản phẩm hiện không thể mua.'}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <div className="inline-flex overflow-hidden rounded-md border border-border bg-white">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center hover:bg-surface disabled:opacity-40"
            disabled={item.quantity <= 1 || isMutating || !item.availability.isAvailable}
            onClick={() => onQuantityChange(item, item.quantity - 1)}
          >
            <Minus size={14} aria-hidden="true" />
          </button>
          <span className="grid h-9 w-11 place-items-center border-x border-border text-sm font-medium">
            {item.quantity}
          </span>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center hover:bg-surface disabled:opacity-40"
            disabled={
              item.quantity >= item.variant.quantityAvailable || isMutating || !item.availability.isAvailable
            }
            onClick={() => onQuantityChange(item, item.quantity + 1)}
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="min-w-24 text-right text-sm font-semibold">
          {formatMoney(item.lineTotal)}
        </div>
        <Button
          type="button"
          variant="danger"
          disabled={isMutating}
          onClick={() => onDelete(item)}
        >
          <Trash2 size={16} aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

export function CartPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.pushToast);

  const cartQuery = useQuery({
    queryKey: cartQueryKey,
    queryFn: cartApi.getCart,
  });

  const invalidateCart = async () => {
    await queryClient.invalidateQueries({ queryKey: cartQueryKey });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      cartApi.updateItem(id, { quantity }),
    onSuccess: invalidateCart,
  });

  const selectMutation = useMutation({
    mutationFn: ({ id, isSelected }: { id: string; isSelected: boolean }) =>
      cartApi.selectItem(id, isSelected),
    onSuccess: invalidateCart,
  });

  const deleteMutation = useMutation({
    mutationFn: cartApi.deleteItem,
    onSuccess: async () => {
      await invalidateCart();
      pushToast({ tone: "success", title: "Đã xóa sản phẩm khỏi giỏ hàng" });
    },
  });

  const cart = cartQuery.data;
  const items = cart?.items ?? [];
  const isMutating =
    updateMutation.isPending ||
    selectMutation.isPending ||
    deleteMutation.isPending;
  const mutationError =
    updateMutation.error ?? selectMutation.error ?? deleteMutation.error;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Giỏ hàng
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Giỏ hàng của Bạn</h1>
            <p className="mt-2 text-sm text-muted">
              Kiểm tra số lượng và các sản phẩm đã chọn trước khi thanh toán.
            </p>
          </div>
          <Button
            type="button"
            disabled={!cart || cart.selectedItemCount === 0}
            onClick={() => navigate("/checkout")}
          >
            <ShoppingBag size={16} aria-hidden="true" />
            Thanh toán
          </Button>
        </div>
      </section>

      {mutationError ? (
        <Alert tone="danger">{getErrorMessage(mutationError)}</Alert>
      ) : null}

      {cartQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      ) : null}

      {cartQuery.isError ? (
        <ErrorState
          title="Không thể tải giỏ hàng"
          message="Phiên đăng nhập có thể đã hết hạn hoặc hệ thống đang tạm thời gián đoạn."
        />
      ) : null}

      {!cartQuery.isLoading && !cartQuery.isError ? (
        items.length > 0 && cart ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              {items.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  isMutating={isMutating}
                  onQuantityChange={(cartItem, quantity) =>
                    updateMutation.mutate({ id: cartItem.id, quantity })
                  }
                  onSelectChange={(cartItem, isSelected) =>
                    selectMutation.mutate({ id: cartItem.id, isSelected })
                  }
                  onDelete={(cartItem) => deleteMutation.mutate(cartItem.id)}
                />
              ))}
            </div>
            <aside className="h-fit rounded-lg border border-border bg-white p-5 shadow-panel">
              <h2 className="text-lg font-semibold text-ink">Tóm tắt</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Sản phẩm</dt>
                  <dd className="font-medium">{cart.itemCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Đã chọn</dt>
                  <dd className="font-medium">{cart.selectedItemCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Tạm tính</dt>
                  <dd className="font-medium">{formatMoney(cart.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-3">
                  <dt className="font-medium text-ink">Tạm tính mục đã chọn</dt>
                  <dd className="font-semibold text-primary-700">
                    {formatMoney(cart.selectedSubtotal)}
                  </dd>
                </div>
              </dl>
              <Button
                type="button"
                className="mt-5 w-full"
                disabled={cart.selectedItemCount === 0}
                onClick={() => navigate("/checkout")}
              >
                <ShoppingBag size={16} aria-hidden="true" />
                Thanh toán
              </Button>
            </aside>
          </div>
        ) : (
          <EmptyState
            title="Giỏ hàng đang trống"
            description="Hãy chọn sản phẩm còn hàng để bắt đầu mua sắm."
            action={
              <Button type="button" onClick={() => navigate("/products")}>
                <ShoppingBag size={16} aria-hidden="true" />
                Xem sản phẩm
              </Button>
            }
          />
        )
      ) : null}
    </div>
  );
}
