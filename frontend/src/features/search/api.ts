import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/services/api';

export type SearchContext = 'customer' | 'seller' | 'admin';
export type SearchScope = 'all' | 'product' | 'variant' | 'order' | 'shop-category' | 'sale-campaign';
export type SearchSuggestion = { id: string; type: string; title: string; subtitle: string; url: string };
const endpoint = { customer: '/search/suggestions', seller: '/seller/search/suggestions', admin: '/admin/search/suggestions' } as const;

export function useSearchSuggestions(context: SearchContext, query: string, scope: SearchScope = 'all') {
  const normalized = query.trim();
  return useQuery({
    queryKey: ['search-suggestions', context, scope, normalized],
    queryFn: ({ signal }) => apiGet<SearchSuggestion[]>(endpoint[context], { params: { q: normalized, limit: 8, scope }, signal }),
    enabled: normalized.length >= 2,
    staleTime: context === 'customer' ? 60_000 : 30_000,
  });
}
