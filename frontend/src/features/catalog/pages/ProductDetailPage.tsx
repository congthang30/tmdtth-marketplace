import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, ShoppingCart, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Skeleton } from "@/components/ui/Skeleton";
import { cartApi } from "@/features/cart/api";
import { getErrorMessage } from "@/services/errors";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import { formatMoney } from "@/utils/format";
import { catalogApi } from "../api";
import { ProductReviews } from "../components/ProductReviews";
import { ProductVisual } from "../components/ProductVisual";
import {
  canAddVariantToCart,
  getFirstAvailableVariantId,
} from "../purchase-state";

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const accessToken = useAuthStore((state) => state.accessToken);
  const pushToast = useToastStore((state) => state.pushToast);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const productQuery = useQuery({
    queryKey: ["catalog", "product", slug],
    queryFn: () => catalogApi.getProduct(slug ?? ""),
    enabled: Boolean(slug),
  });

  const reviewsQuery = useQuery({
    queryKey: ["catalog", "product", slug, "reviews"],
    queryFn: () => catalogApi.listReviews(slug ?? "", 1, 5),
    enabled: Boolean(slug),
  });

  const product = productQuery.data;
  const selectedVariant = useMemo(
    () =>
      product?.variants.find((variant) => variant.id === selectedVariantId) ??
      null,
    [product?.variants, selectedVariantId],
  );
  const selectedImage = useMemo(
    () =>
      product?.images.find((image) => image.id === selectedImageId) ??
      product?.thumbnailImage ??
      product?.images[0] ??
      null,
    [product?.images, product?.thumbnailImage, selectedImageId],
  );

  useEffect(() => {
    if (!product) {
      return;
    }

    setSelectedVariantId(getFirstAvailableVariantId(product.variants));
    setSelectedImageId(
      product.thumbnailImage?.id ?? product.images[0]?.id ?? null,
    );
    setQuantity(1);
  }, [product]);

  const addToCartMutation = useMutation({
    mutationFn: cartApi.addItem,
    onSuccess: () => {
      pushToast({
        tone: "success",
        title: "Đã thêm vào giỏ hàng",
        description: product?.productName,
      });
    },
  });

  const incrementQuantity = () => {
    const maxQuantity = selectedVariant?.quantityAvailable ?? 1;
    setQuantity((current) => Math.min(maxQuantity, current + 1));
  };

  const decrementQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const canAddToCart = canAddVariantToCart(selectedVariant, quantity);

  if (productQuery.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-40" />
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (productQuery.isError || !product) {
    return (
      <ErrorState
        title="Không tìm thấy sản phẩm"
        message="Sản phẩm không còn khả dụng hoặc hệ thống đang tạm thời gián đoạn."
        action={
          <ButtonLink to="/products" variant="secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            Quay lại danh mục
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <Link
        to="/products"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-600"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Quay lại danh mục
      </Link>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-border bg-white shadow-panel">
            <ProductVisual
              imageUrl={selectedImage?.imageUrl}
              altText={selectedImage?.altText ?? product.productName}
              className="aspect-[4/3]"
            />
          </div>
          {product.images.length > 1 ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {product.images.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  className={[
                    "h-20 w-24 shrink-0 overflow-hidden rounded-md border bg-white",
                    selectedImage?.id === image.id
                      ? "border-primary-600 ring-2 ring-primary-100"
                      : "border-border",
                  ].join(" ")}
                  onClick={() => setSelectedImageId(image.id)}
                >
                  <ProductVisual
                    imageUrl={image.imageUrl}
                    altText={image.altText ?? product.productName}
                    className="h-full w-full"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <div className="flex flex-wrap gap-2">
            <Badge>{product.category.categoryName}</Badge>
            {product.brand ? <Badge>{product.brand}</Badge> : null}
          </div>
          <h1 className="mt-4 text-2xl font-semibold leading-tight text-ink">
            {product.productName}
          </h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Store size={15} aria-hidden="true" />
            {product.shop.shopName}
          </p>

          <div className="mt-5 rounded-lg bg-surface p-4">
            <p className="text-3xl font-semibold text-primary-700">
              {formatMoney(selectedVariant?.price ?? product.priceMin)}
            </p>
            {selectedVariant?.compareAtPrice ? (
              <p className="mt-1 text-sm text-muted line-through">
                {formatMoney(selectedVariant.compareAtPrice)}
              </p>
            ) : null}
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-ink">Phân loại</legend>
            {product.variants.length > 0 ? (
              <div className="mt-2 grid gap-2">
                {product.variants.map((variant) => {
                  const isOutOfStock = variant.quantityAvailable < 1;
                  const isSelected =
                    !isOutOfStock && selectedVariant?.id === variant.id;

                  return (
                    <label
                      key={variant.id}
                      className={[
                        "flex min-h-11 flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition",
                        isOutOfStock
                          ? "cursor-not-allowed border-border bg-surface text-muted"
                          : "cursor-pointer border-border bg-white hover:bg-surface",
                        isSelected
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name={`product-variant-${product.id}`}
                        value={variant.id}
                        className="h-4 w-4 shrink-0 accent-primary-600"
                        checked={isSelected}
                        disabled={isOutOfStock}
                        onChange={() => {
                          setSelectedVariantId(variant.id);
                          setQuantity(1);
                        }}
                      />
                      <span className="font-medium">{variant.variantName}</span>
                      <span className="text-muted">
                        {isOutOfStock
                          ? "Hết hàng"
                          : `Còn ${variant.quantityAvailable} sản phẩm`}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Không có phân loại để mua"
                description="Sản phẩm hiện chưa có phân loại đang bán và còn hàng."
              />
            )}
          </fieldset>

          <div className="mt-5">
            <p className="text-sm font-medium text-ink">Số lượng</p>
            <div className="mt-2 inline-flex overflow-hidden rounded-md border border-border bg-white">
              <button
                type="button"
                className="grid h-11 w-11 place-items-center hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Giảm số lượng"
                disabled={!selectedVariant || quantity <= 1}
                onClick={decrementQuantity}
              >
                <Minus size={15} aria-hidden="true" />
              </button>
              <span className="grid h-11 w-12 place-items-center border-x border-border text-sm font-medium">
                {quantity}
              </span>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Tăng số lượng"
                disabled={
                  !selectedVariant ||
                  selectedVariant.quantityAvailable < 1 ||
                  quantity >= selectedVariant.quantityAvailable
                }
                onClick={incrementQuantity}
              >
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          {addToCartMutation.isError ? (
            <Alert tone="danger" className="mt-5">
              {getErrorMessage(addToCartMutation.error)}
            </Alert>
          ) : null}

          <div className="mt-6">
            {!selectedVariant || selectedVariant.quantityAvailable < 1 ? (
              <Button type="button" className="w-full" disabled>
                <ShoppingCart size={16} aria-hidden="true" />
                Sản phẩm đã hết hàng
              </Button>
            ) : accessToken ? (
              <Button
                type="button"
                className="w-full"
                disabled={!canAddToCart || addToCartMutation.isPending}
                onClick={() => {
                  if (
                    addToCartMutation.isPending ||
                    !canAddVariantToCart(selectedVariant, quantity)
                  ) {
                    return;
                  }

                  addToCartMutation.mutate({
                    productVariantId: selectedVariant.id,
                    quantity,
                  });
                }}
              >
                <ShoppingCart size={16} aria-hidden="true" />
                {addToCartMutation.isPending
                  ? "Đang thêm..."
                  : "Thêm vào giỏ hàng"}
              </Button>
            ) : (
              <ButtonLink to="/login">
                <ShoppingCart size={16} aria-hidden="true" />
                Đăng nhập để thêm vào giỏ hàng
              </ButtonLink>
            )}
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Mô tả</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {product.description ?? "Sản phẩm chưa có mô tả."}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Thông tin sản phẩm</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Còn hàng</dt>
              <dd className="font-medium">{product.quantityAvailable}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Đã bán</dt>
              <dd className="font-medium">{product.soldCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Lượt xem</dt>
              <dd className="font-medium">{product.viewCount}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-ink">
            Đánh giá của khách hàng
          </h2>
          {reviewsQuery.data?.meta ? (
            <p className="text-sm text-muted">
              {reviewsQuery.data.meta.total} đánh giá
            </p>
          ) : null}
        </div>
        <ProductReviews
          reviews={reviewsQuery.data?.items ?? []}
          isLoading={reviewsQuery.isLoading}
          isError={reviewsQuery.isError}
        />
      </section>
    </div>
  );
}
