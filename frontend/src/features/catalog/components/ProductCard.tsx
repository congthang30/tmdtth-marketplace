import { ArrowRight, Boxes, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import type { ProductListItem } from '../types';
import { getProductPriceLabel } from '../utils';
import { ProductVisual } from './ProductVisual';

type ProductCardProps = {
  product: ProductListItem;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-white shadow-panel">
      <Link to={`/products/${product.slug}`} className="block">
        <ProductVisual
          imageUrl={product.thumbnailImage?.imageUrl}
          altText={product.thumbnailImage?.altText ?? product.productName}
          className="aspect-[4/3]"
        />
      </Link>
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{product.category.categoryName}</Badge>
          {product.quantityAvailable > 0 ? (
            <Badge>{product.quantityAvailable} available</Badge>
          ) : null}
        </div>
        <h2 className="mt-3 line-clamp-2 min-h-12 text-base font-semibold leading-6 text-ink">
          <Link to={`/products/${product.slug}`}>{product.productName}</Link>
        </h2>
        <p className="mt-2 text-lg font-semibold text-primary-700">
          {getProductPriceLabel(product)}
        </p>
        <div className="mt-3 space-y-1 text-sm text-muted">
          <p className="flex items-center gap-2">
            <Store size={14} aria-hidden="true" />
            {product.shop.shopName}
          </p>
          <p className="flex items-center gap-2">
            <Boxes size={14} aria-hidden="true" />
            Sold {product.soldCount}
          </p>
        </div>
        <Link
          to={`/products/${product.slug}`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-600"
        >
          View detail
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
