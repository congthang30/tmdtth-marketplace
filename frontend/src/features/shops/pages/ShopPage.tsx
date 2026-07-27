import { useQuery } from '@tanstack/react-query';
import { Search, Store } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney } from '@/utils/format';
import { shopsApi } from '../api';

export function ShopPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? undefined;
  const page = Number(params.get('page') ?? '1');
  const search = params.get('search') ?? undefined;
  const [searchInput, setSearchInput] = useState(search ?? '');
  const query = useQuery({ queryKey: ['shops', slug, category, page, search], queryFn: () => shopsApi.getCatalog(slug, { category, page, search }), enabled: Boolean(slug) });

  const updateParams = (next: { category?: string; page?: number; search?: string }) => {
    const value = new URLSearchParams(); if (next.category) value.set('category', next.category); if ((next.page ?? 1) > 1) value.set('page', String(next.page)); if (next.search) value.set('search', next.search); setParams(value);
  };
  const submitSearch = (event: FormEvent) => { event.preventDefault(); updateParams({ category, search: searchInput.trim() || undefined }); };

  if (query.isLoading) return <div className="space-y-5"><Skeleton className="h-40 w-full"/><Skeleton className="h-14 w-full"/><div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-72"/>)}</div></div>;
  if (query.isError || !query.data) return <ErrorState title="Không thể mở gian hàng" message="Gian hàng không tồn tại, chưa được duyệt hoặc đang tạm ngừng hoạt động."/>;
  const { shop, categories, products, meta } = query.data;

  return <div className="space-y-6">
    <header className="overflow-hidden rounded-xl border border-border bg-white shadow-panel">
      <div className="bg-gradient-to-r from-primary-700 to-primary-500 p-6 text-white sm:p-8"><div className="flex items-start gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-white/15"><Store size={30} aria-hidden="true"/></div><div><p className="text-sm font-medium text-white/80">Gian hàng đã được duyệt</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{shop.shopName}</h1><p className="mt-2 max-w-2xl text-sm text-white/85">{shop.description ?? 'Khám phá các sản phẩm đang được gian hàng cung cấp.'}</p></div></div></div>
      <form onSubmit={submitSearch} className="flex gap-2 p-4"><label className="relative flex-1"><span className="sr-only">Tìm trong gian hàng</span><Search className="absolute left-3 top-3.5 text-muted" size={18}/><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="h-11 w-full rounded-md border border-border pl-10 pr-3 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100" placeholder="Tìm trong gian hàng"/></label><Button type="submit">Tìm kiếm</Button></form>
    </header>
    <nav aria-label="Danh mục của gian hàng" className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-white p-2 shadow-panel"><button type="button" onClick={() => updateParams({ search })} className={`min-h-11 shrink-0 rounded-md px-4 text-sm font-medium ${!category ? 'bg-primary-600 text-white' : 'text-ink hover:bg-surface'}`}>Tất cả sản phẩm</button>{categories.map((item) => <button key={item.id} type="button" onClick={() => updateParams({ category: item.slug, search })} className={`min-h-11 shrink-0 rounded-md px-4 text-sm font-medium ${category === item.slug ? 'bg-primary-600 text-white' : 'text-ink hover:bg-surface'}`}>{item.categoryName} <span className="opacity-70">({item.productCount})</span></button>)}</nav>
    <section><div className="mb-4 flex items-end justify-between"><div><p className="text-sm text-muted">{meta.total} sản phẩm</p><h2 className="text-xl font-semibold text-ink">{category ? categories.find((item) => item.slug === category)?.categoryName : 'Tất cả sản phẩm'}</h2></div></div>{products.length === 0 ? <EmptyState title="Chưa có sản phẩm phù hợp" description="Hãy chọn danh mục khác hoặc thay đổi từ khóa tìm kiếm."/> : <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{products.map((product) => <article key={product.id} className="overflow-hidden rounded-lg border border-border bg-white shadow-panel transition hover:-translate-y-0.5 hover:shadow-lg"><Link to={`/products/${product.slug}`}><div className="aspect-square bg-surface">{product.thumbnailImage ? <img src={product.thumbnailImage.imageUrl} alt={product.thumbnailImage.altText ?? product.productName} className="h-full w-full object-cover" loading="lazy"/> : <div className="grid h-full place-items-center text-sm text-muted">Chưa có ảnh</div>}</div><div className="p-3"><h3 className="line-clamp-2 min-h-10 text-sm font-medium text-ink">{product.productName}</h3><p className="mt-2 font-semibold text-primary-700">{formatMoney(product.priceMin)}</p></div></Link></article>)}</div>}</section>
    {meta.totalPages > 1 ? <nav aria-label="Phân trang" className="flex justify-center gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => updateParams({ category, search, page: page - 1 })}>Trang trước</Button><span className="grid min-h-11 place-items-center px-3 text-sm text-muted">{page}/{meta.totalPages}</span><Button variant="secondary" disabled={page >= meta.totalPages} onClick={() => updateParams({ category, search, page: page + 1 })}>Trang sau</Button></nav> : null}
  </div>;
}
