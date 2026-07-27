import { Search, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchSuggestions } from './api';
import type { SearchContext, SearchScope, SearchSuggestion } from './api';

const typeLabel: Record<string, string> = { keyword: 'Từ khóa', product: 'Sản phẩm', category: 'Danh mục', shop: 'Gian hàng', variant: 'Phân loại', voucher: 'Mã giảm giá', 'sale-campaign': 'Chương trình sale', 'shop-category': 'Danh mục shop', 'shipping-company': 'Đơn vị vận chuyển' };

type SuggestionSearchProps = { context: SearchContext; scope?: SearchScope; value?: string; onValueChange?: (value: string) => void; placeholder?: string; label?: string; onSubmit?: (value: string) => void; embedded?: boolean; onSuggestionSelect?: (suggestion: SearchSuggestion) => void };

export function SuggestionSearch({ context, scope = 'all', value, onValueChange, placeholder = 'Tìm kiếm...', label = 'Tìm kiếm', onSubmit, embedded = false, onSuggestionSelect }: SuggestionSearchProps) {
  const [internalValue, setInternalValue] = useState(''); const query = value ?? internalValue;
  const [debounced, setDebounced] = useState(query); const [open, setOpen] = useState(false); const [active, setActive] = useState(-1);
  const listId = useId(); const navigate = useNavigate();
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(query), 280); return () => window.clearTimeout(timer); }, [query]);
  const suggestions = useSearchSuggestions(context, debounced, scope); const items = suggestions.data ?? [];
  useEffect(() => { setActive(-1); setOpen(query.trim().length >= 2); }, [query]);
  const change = (next: string) => { if (value === undefined) setInternalValue(next); onValueChange?.(next); };
  const choose = (index: number) => { const item = items[index]; if (!item) return; setOpen(false); if (onSuggestionSelect) { onSuggestionSelect(item); return; } navigate(item.url); };
  const submit = () => { setOpen(false); if (onSubmit) onSubmit(query.trim()); else if (context === 'customer') navigate(`/products?q=${encodeURIComponent(query.trim())}`); };
  const input = <label className="relative block"><span className="sr-only">{label}</span><Search className="pointer-events-none absolute left-3 top-3 text-muted" size={18}/>
    <input type="search" role="combobox" aria-expanded={open} aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} aria-autocomplete="list" autoComplete="off" value={query} placeholder={placeholder} onFocus={() => query.trim().length >= 2 && setOpen(true)} onChange={(event) => change(event.target.value)} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((current) => Math.min(current + 1, items.length - 1)); } else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((current) => Math.max(current - 1, 0)); } else if (event.key === 'Enter' && active >= 0) { event.preventDefault(); choose(active); } else if (event.key === 'Escape') setOpen(false); }} className="h-11 w-full rounded-md border border-border bg-white pl-10 pr-10 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100"/>
    {query ? <button type="button" aria-label="Xóa nội dung tìm kiếm" onClick={() => change('')} className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink"><X size={17}/></button> : null}
  </label>;

  return <div className="relative min-w-0 flex-1">
    {embedded ? input : <form role="search" onSubmit={(event) => { event.preventDefault(); submit(); }}>{input}</form>}
    {open ? <div id={listId} role="listbox" className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-lg border border-border bg-white p-1 shadow-lg">
      {suggestions.isFetching ? <p className="p-3 text-sm text-muted">Đang tìm gợi ý...</p> : suggestions.isError ? <p className="p-3 text-sm text-muted">Không thể tải gợi ý lúc này.</p> : items.length ? items.map((item, index) => <button id={`${listId}-${index}`} role="option" aria-selected={active === index} key={`${item.type}-${item.id}`} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(index)} onMouseEnter={() => setActive(index)} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left ${active === index ? 'bg-primary-50' : 'hover:bg-surface'}`}><span className="min-w-0"><span className="block truncate text-sm font-medium text-ink">{item.title}</span>{item.subtitle ? <span className="block truncate text-xs text-muted">{item.subtitle}</span> : null}</span>{context !== 'customer' ? <span className="shrink-0 text-xs font-medium text-primary-700">{typeLabel[item.type] ?? 'Kết quả'}</span> : null}</button>) : <p className="p-3 text-sm text-muted">Không tìm thấy gợi ý phù hợp.</p>}
    </div> : null}
  </div>;
}
