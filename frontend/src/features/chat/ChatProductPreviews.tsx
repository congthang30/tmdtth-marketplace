import { ArrowUpRight, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductVisual } from '@/features/catalog/components/ProductVisual';
import { formatMoney } from '@/utils/format';
import type { ChatProductPreview } from './chat.api';

type ChatProductPreviewsProps = {
  products: ChatProductPreview[];
  onNavigate: () => void;
};

function priceLabel(product: ChatProductPreview): string {
  return product.priceMin === product.priceMax
    ? formatMoney(product.priceMin)
    : `${formatMoney(product.priceMin)} – ${formatMoney(product.priceMax)}`;
}

export function ChatProductPreviews({ products, onNavigate }: ChatProductPreviewsProps) {
  return (
    <section aria-label="Sản phẩm trợ lý gợi ý" className="mt-2 space-y-2">
      {products.map((product) => (
        <article
          key={product.id}
          className="group overflow-hidden rounded-xl border border-border bg-white shadow-panel transition hover:border-primary-100 hover:shadow-lg"
        >
          <div className="flex gap-3 p-3">
            <Link
              to={`/products/${product.slug}`}
              onClick={onNavigate}
              aria-label={`Xem ${product.productName}`}
              className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            >
              <ProductVisual
                imageUrl={product.thumbnailImage?.imageUrl}
                altText={product.thumbnailImage?.altText ?? product.productName}
                loading="lazy"
                className="h-full w-full transition duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-ink">
                <Link
                  to={`/products/${product.slug}`}
                  onClick={onNavigate}
                  className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                >
                  {product.productName}
                </Link>
              </h3>
              <p className="mt-1 text-sm font-semibold text-primary-700">
                {priceLabel(product)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted">
                <Store size={13} aria-hidden="true" />
                {product.shopName}
              </p>
              <p className="mt-1 text-xs text-muted">
                {product.quantityAvailable > 0
                  ? `Còn ${product.quantityAvailable} sản phẩm`
                  : 'Tạm hết hàng'}
              </p>
            </div>
          </div>
          <Link
            to={`/products/${product.slug}`}
            onClick={onNavigate}
            className="flex min-h-11 items-center justify-between border-t border-border px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600"
          >
            Xem sản phẩm
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </article>
      ))}
    </section>
  );
}
