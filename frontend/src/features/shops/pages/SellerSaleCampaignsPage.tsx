import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { ManagementSearch } from '@/components/data-display/ManagementSearch';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextInput } from '@/components/ui/TextInput';
import { getErrorMessage } from '@/services/errors';
import { formatMoney } from '@/utils/format';
import { sellerProductsApi } from '@/features/seller/api';
import { sellerSaleCampaignsApi } from '../sale-api';

const statusLabel = { Draft: 'Bản nháp', Scheduled: 'Sắp diễn ra', Active: 'Đang diễn ra', Ended: 'Đã kết thúc', Cancelled: 'Đã hủy' } as const;
const toLocalIso = (value: string) => new Date(value).toISOString();

export function SellerSaleCampaignsPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(''); const [startsAt, setStartsAt] = useState(''); const [endsAt, setEndsAt] = useState('');
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [search, setSearch] = useState(''); const [variantSearch, setVariantSearch] = useState('');
  const queryClient = useQueryClient();
  const campaigns = useQuery({ queryKey: ['seller', 'sale-campaigns'], queryFn: sellerSaleCampaignsApi.list });
  const products = useQuery({ queryKey: ['seller', 'products', 'sale-lookup'], queryFn: () => sellerProductsApi.list(1, 100) });
  const variants = useQuery({
    queryKey: ['seller', 'products', 'all-variants', products.data?.items.map((item) => item.id)],
    enabled: Boolean(products.data),
    queryFn: async () => (await Promise.all((products.data?.items ?? []).map(async (product) => (await sellerProductsApi.listVariants(product.id)).map((variant) => ({ ...variant, productName: product.productName }))))).flat(),
  });
  const create = useMutation({
    mutationFn: (status: 'Draft' | 'Scheduled') => sellerSaleCampaignsApi.create({ campaignName: name, startsAt: toLocalIso(startsAt), endsAt: toLocalIso(endsAt), status, items: Object.entries(selected).filter(([, price]) => price).map(([productVariantId, salePrice]) => ({ productVariantId, salePrice })) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['seller', 'sale-campaigns'] }); setOpen(false); setName(''); setStartsAt(''); setEndsAt(''); setSelected({}); },
  });
  const cancel = useMutation({ mutationFn: sellerSaleCampaignsApi.cancel, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seller', 'sale-campaigns'] }) });
  const normalizedSearch = search.trim().toLocaleLowerCase('vi');
  const filteredCampaigns = (campaigns.data ?? []).filter((campaign) => `${campaign.campaignName} ${statusLabel[campaign.status]} ${campaign.items.map((item) => `${item.productName} ${item.variantName}`).join(' ')}`.toLocaleLowerCase('vi').includes(normalizedSearch));
  const normalizedVariantSearch = variantSearch.trim().toLocaleLowerCase('vi');
  const filteredVariants = (variants.data ?? []).filter((variant) => `${variant.productName} ${variant.variantName} ${variant.sku}`.toLocaleLowerCase('vi').includes(normalizedVariantSearch));
  const canSave = name.trim().length >= 2 && startsAt && endsAt && Object.values(selected).some(Boolean);

  return <div className="space-y-5">
    <section className="rounded-lg border border-border bg-white p-6 shadow-panel"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Giá bán theo lịch</p><h1 className="mt-2 text-2xl font-semibold">Chương trình giảm giá</h1><p className="mt-1 text-sm text-muted">Giá sale tự có hiệu lực và tự kết thúc theo thời gian đã đặt.</p></div><Button onClick={() => setOpen(true)}><Plus size={16}/>Tạo chương trình</Button></div></section>
    <ManagementSearch scope="sale-campaign" value={search} onChange={setSearch} placeholder="Tìm chương trình, sản phẩm, phân loại hoặc trạng thái" resultCount={filteredCampaigns.length}/>
    {campaigns.isLoading ? <Skeleton className="h-64"/> : campaigns.isError ? <Alert tone="danger">Không thể tải chương trình giảm giá.</Alert> : filteredCampaigns.length ? <section className="grid gap-4 lg:grid-cols-2">{filteredCampaigns.map((campaign) => <article key={campaign.id} className="rounded-lg border border-border bg-white p-5 shadow-panel"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{campaign.campaignName}</h2><p className="mt-1 text-sm text-muted">{new Date(campaign.startsAt).toLocaleString('vi-VN')} – {new Date(campaign.endsAt).toLocaleString('vi-VN')}</p></div><Badge>{statusLabel[campaign.status]}</Badge></div><div className="mt-4 space-y-2">{campaign.items.map((item) => <div key={item.id} className="flex justify-between gap-3 rounded-md bg-surface p-3 text-sm"><span>{item.productName} · {item.variantName}</span><span><strong className="text-primary-700">{formatMoney(item.salePrice)}</strong> <span className="text-muted line-through">{formatMoney(item.regularPrice)}</span></span></div>)}</div>{campaign.status !== 'Ended' && campaign.status !== 'Cancelled' ? <Button className="mt-4" variant="secondary" disabled={cancel.isPending} onClick={() => cancel.mutate(campaign.id)}>Hủy chương trình</Button> : null}</article>)}</section> : <Alert>Chưa có chương trình giảm giá nào.</Alert>}
    <Modal open={open} title="Tạo chương trình giảm giá" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><Button disabled={!canSave || create.isPending} onClick={() => create.mutate('Scheduled')}>{create.isPending ? 'Đang lưu...' : 'Lên lịch'}</Button></>}>
      {create.isError ? <Alert tone="danger" className="mb-4">{getErrorMessage(create.error)}</Alert> : null}
      <div className="space-y-4"><TextInput label="Tên chương trình" value={name} onChange={(e) => setName(e.target.value)}/><div className="grid gap-4 sm:grid-cols-2"><TextInput label="Bắt đầu" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}/><TextInput label="Kết thúc" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}/></div><fieldset className="space-y-3"><legend className="text-sm font-semibold">Chọn phân loại và đặt giá sale</legend><ManagementSearch scope="variant" value={variantSearch} onChange={setVariantSearch} placeholder="Tìm sản phẩm, SKU hoặc tên phân loại" resultCount={filteredVariants.length}/>{variants.isLoading ? <Skeleton className="h-32"/> : filteredVariants.map((variant) => <label key={variant.id} className="grid min-h-11 grid-cols-[24px_1fr_130px] items-center gap-3 rounded-md border border-border p-3"><input type="checkbox" checked={variant.id in selected} onChange={(e) => setSelected((current) => e.target.checked ? { ...current, [variant.id]: '' } : Object.fromEntries(Object.entries(current).filter(([id]) => id !== variant.id)))}/><span className="text-sm">{variant.productName} · {variant.variantName}<span className="block text-xs text-muted">Giá thường {formatMoney(variant.price)}</span></span><TextInput label={`Giá sale ${variant.variantName}`} aria-label={`Giá sale ${variant.variantName}`} inputMode="decimal" disabled={!(variant.id in selected)} value={selected[variant.id] ?? ''} onChange={(e) => setSelected((current) => ({ ...current, [variant.id]: e.target.value }))}/></label>)}</fieldset></div>
    </Modal>
  </div>;
}
