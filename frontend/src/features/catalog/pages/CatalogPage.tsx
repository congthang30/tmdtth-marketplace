import { useQuery } from '@tanstack/react-query';
import { Filter, RotateCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { SelectInput } from '@/components/ui/SelectInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextInput } from '@/components/ui/TextInput';
import { catalogApi, categoriesApi } from '../api';
import type { ProductListQuery } from '../types';
import { flattenCategories } from '../utils';
import { ProductCard } from '../components/ProductCard';

type CatalogFilters = {
  q: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  sortBy: NonNullable<ProductListQuery['sortBy']>;
  sortOrder: NonNullable<ProductListQuery['sortOrder']>;
};

const defaultFilters: CatalogFilters = {
  q: '',
  categoryId: '',
  minPrice: '',
  maxPrice: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const sortByOptions: CatalogFilters['sortBy'][] = [
  'createdAt',
  'basePrice',
  'soldCount',
  'viewCount',
  'productName',
];

const sortOrderOptions: CatalogFilters['sortOrder'][] = ['desc', 'asc'];

const getPage = (searchParams: URLSearchParams) => {
  const page = Number(searchParams.get('page'));
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const getFiltersFromParams = (
  searchParams: URLSearchParams,
): CatalogFilters => {
  const sortByParam = searchParams.get('sortBy') as CatalogFilters['sortBy'];
  const sortOrderParam = searchParams.get(
    'sortOrder',
  ) as CatalogFilters['sortOrder'];

  return {
    q: searchParams.get('q') ?? '',
    categoryId: searchParams.get('categoryId') ?? '',
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    sortBy: sortByOptions.includes(sortByParam)
      ? sortByParam
      : defaultFilters.sortBy,
    sortOrder: sortOrderOptions.includes(sortOrderParam)
      ? sortOrderParam
      : defaultFilters.sortOrder,
  };
};

const setParam = (params: URLSearchParams, key: string, value: string) => {
  if (value) {
    params.set(key, value);
    return;
  }

  params.delete(key);
};

const getSortLabel = (sortBy: CatalogFilters['sortBy']) =>
  ({
    createdAt: 'Newest',
    basePrice: 'Price',
    soldCount: 'Sold count',
    viewCount: 'Views',
    productName: 'Name',
  })[sortBy];

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() =>
    getFiltersFromParams(searchParams),
  );
  const page = getPage(searchParams);

  useEffect(() => {
    setFilters(getFiltersFromParams(searchParams));
  }, [searchParams]);

  const query = useMemo<ProductListQuery>(
    () => ({
      page,
      limit: 12,
      ...getFiltersFromParams(searchParams),
    }),
    [page, searchParams],
  );

  const categoriesQuery = useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: categoriesApi.list,
  });

  const productsQuery = useQuery({
    queryKey: ['catalog', 'products', query],
    queryFn: () => catalogApi.listProducts(query),
  });

  const categoryOptions = useMemo(
    () => flattenCategories(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const products = productsQuery.data?.items ?? [];
  const meta = productsQuery.data?.meta;

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', '1');
    setParam(nextParams, 'q', filters.q.trim());
    setParam(nextParams, 'categoryId', filters.categoryId);
    setParam(nextParams, 'minPrice', filters.minPrice);
    setParam(nextParams, 'maxPrice', filters.maxPrice);
    nextParams.set('sortBy', filters.sortBy);
    nextParams.set('sortOrder', filters.sortOrder);
    setSearchParams(nextParams);
  };

  const resetFilters = () => {
    setSearchParams({ page: '1' });
  };

  const changePage = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(nextPage));
    setSearchParams(nextParams);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Public catalog
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">
              Browse marketplace products
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Live data from the NestJS API with category, price, sorting and
              pagination.
            </p>
          </div>
          {meta ? (
            <div className="rounded-md border border-border px-4 py-3 text-sm text-muted">
              <span className="font-semibold text-ink">{meta.total}</span>{' '}
              products
            </div>
          ) : null}
        </div>

        <form
          className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.9fr_0.6fr_0.6fr_0.7fr_0.7fr_auto]"
          onSubmit={applyFilters}
        >
          <TextInput
            label="Search"
            value={filters.q}
            placeholder="Name, brand or description"
            onChange={(event) =>
              setFilters((current) => ({ ...current, q: event.target.value }))
            }
          />
          <SelectInput
            label="Category"
            value={filters.categoryId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                categoryId: event.target.value,
              }))
            }
          >
            <option value="">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="Min price"
            inputMode="numeric"
            value={filters.minPrice}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                minPrice: event.target.value,
              }))
            }
          />
          <TextInput
            label="Max price"
            inputMode="numeric"
            value={filters.maxPrice}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                maxPrice: event.target.value,
              }))
            }
          />
          <SelectInput
            label="Sort by"
            value={filters.sortBy}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                sortBy: event.target.value as CatalogFilters['sortBy'],
              }))
            }
          >
            {sortByOptions.map((option) => (
              <option key={option} value={option}>
                {getSortLabel(option)}
              </option>
            ))}
          </SelectInput>
          <SelectInput
            label="Order"
            value={filters.sortOrder}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                sortOrder: event.target.value as CatalogFilters['sortOrder'],
              }))
            }
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </SelectInput>
          <div className="flex items-end gap-2">
            <Button type="submit" className="h-10">
              <Search size={16} aria-hidden="true" />
              Apply
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-10"
              onClick={resetFilters}
            >
              <RotateCcw size={16} aria-hidden="true" />
            </Button>
          </div>
        </form>

        {categoriesQuery.isError ? (
          <Alert tone="danger" className="mt-4">
            Categories could not be loaded, but products can still be browsed.
          </Alert>
        ) : null}
      </section>

      {productsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-80 w-full" />
          ))}
        </div>
      ) : null}

      {productsQuery.isError ? (
        <ErrorState
          title="Cannot load products"
          message="Check that the backend API is running on port 3100 and try again."
        />
      ) : null}

      {!productsQuery.isLoading && !productsQuery.isError ? (
        products.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Pagination
              page={meta?.page ?? page}
              totalPages={meta?.totalPages ?? 1}
              onPageChange={changePage}
            />
          </>
        ) : (
          <EmptyState
            title="No products found"
            description="Adjust filters or reset the catalog query."
            action={
              <Button type="button" variant="secondary" onClick={resetFilters}>
                <Filter size={16} aria-hidden="true" />
                Reset filters
              </Button>
            }
          />
        )
      ) : null}
    </div>
  );
}
