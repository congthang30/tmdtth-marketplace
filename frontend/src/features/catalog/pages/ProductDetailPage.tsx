import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Minus, Plus, ShoppingCart, Store } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Skeleton } from '@/components/ui/Skeleton';
import { cartApi } from '@/features/cart/api';
import { getErrorMessage } from '@/services/errors';
import { useAuthStore } from '@/stores/auth.store';
import { useToastStore } from '@/stores/toast.store';
import { formatMoney } from '@/utils/format';
import { catalogApi } from '../api';
import { ProductReviews } from '../components/ProductReviews';
import { ProductVisual } from '../components/ProductVisual';

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
    queryKey: ['catalog', 'product', slug],
    queryFn: () => catalogApi.getProduct(slug ?? ''),
    enabled: Boolean(slug),
  });

  const reviewsQuery = useQuery({
    queryKey: ['catalog', 'product', slug, 'reviews'],
    queryFn: () => catalogApi.listReviews(slug ?? '', 1, 5),
    enabled: Boolean(slug),
  });

  const product = productQuery.data;
  const selectedVariant = useMemo(
    () =>
      product?.variants.find((variant) => variant.id === selectedVariantId) ??
      product?.variants[0] ??
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

    setSelectedVariantId(product.variants[0]?.id ?? null);
    setSelectedImageId(product.thumbnailImage?.id ?? product.images[0]?.id ?? null);
    setQuantity(1);
  }, [product]);

  const addToCartMutation = useMutation({
    mutationFn: cartApi.addItem,
    onSuccess: () => {
      pushToast({
        tone: 'success',
        title: 'Added to cart',
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
        title="Product not found"
        message="This product is unavailable or the API could not return the detail."
        action={
          <ButtonLink to="/products" variant="secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to catalog
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
        Back to catalog
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
                    'h-20 w-24 shrink-0 overflow-hidden rounded-md border bg-white',
                    selectedImage?.id === image.id
                      ? 'border-primary-600 ring-2 ring-primary-100'
                      : 'border-border',
                  ].join(' ')}
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

          <div className="mt-5">
            <p className="text-sm font-medium text-ink">Variant</p>
            {product.variants.length > 0 ? (
              <div className="mt-2 grid gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    className={[
                      'rounded-md border px-3 py-2 text-left text-sm transition',
                      selectedVariant?.id === variant.id
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-border bg-white hover:bg-surface',
                    ].join(' ')}
                    onClick={() => {
                      setSelectedVariantId(variant.id);
                      setQuantity(1);
                    }}
                  >
                    <span className="font-medium">{variant.variantName}</span>
                    <span className="ml-2 text-muted">
                      {variant.quantityAvailable} available
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No purchasable variants"
                description="This product is public but has no active stocked variant."
              />
            )}
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-ink">Quantity</p>
            <div className="mt-2 inline-flex overflow-hidden rounded-md border border-border bg-white">
              <button
                type="button"
                className="grid h-10 w-10 place-items-center hover:bg-surface disabled:opacity-40"
                disabled={quantity <= 1}
                onClick={decrementQuantity}
              >
                <Minus size={15} aria-hidden="true" />
              </button>
              <span className="grid h-10 w-12 place-items-center border-x border-border text-sm font-medium">
                {quantity}
              </span>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center hover:bg-surface disabled:opacity-40"
                disabled={
                  quantity >= (selectedVariant?.quantityAvailable ?? 1)
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
            {accessToken ? (
              <Button
                type="button"
                className="w-full"
                disabled={!selectedVariant || addToCartMutation.isPending}
                onClick={() => {
                  if (!selectedVariant) {
                    return;
                  }

                  addToCartMutation.mutate({
                    productVariantId: selectedVariant.id,
                    quantity,
                  });
                }}
              >
                <ShoppingCart size={16} aria-hidden="true" />
                {addToCartMutation.isPending ? 'Adding...' : 'Add to cart'}
              </Button>
            ) : (
              <ButtonLink to="/login">
                <ShoppingCart size={16} aria-hidden="true" />
                Login to add to cart
              </ButtonLink>
            )}
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Description</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {product.description ?? 'No product description available.'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Product signals</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Available</dt>
              <dd className="font-medium">{product.quantityAvailable}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Sold</dt>
              <dd className="font-medium">{product.soldCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Views</dt>
              <dd className="font-medium">{product.viewCount}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-ink">Customer reviews</h2>
          {reviewsQuery.data?.meta ? (
            <p className="text-sm text-muted">
              {reviewsQuery.data.meta.total} published
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
