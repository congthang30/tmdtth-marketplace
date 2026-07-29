import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { useMemo } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { catalogApi, categoriesApi } from "../api";
import type { ProductListQuery } from "../types";
import { ProductCard } from "../components/ProductCard";

type CatalogFilters = {
  q: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  sortBy: NonNullable<ProductListQuery["sortBy"]>;
  sortOrder: NonNullable<ProductListQuery["sortOrder"]>;
};

const defaultFilters: CatalogFilters = {
  q: "",
  categoryId: "",
  minPrice: "",
  maxPrice: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

const sortByOptions: CatalogFilters["sortBy"][] = [
  "createdAt",
  "basePrice",
  "soldCount",
  "viewCount",
  "productName",
];

const sortOrderOptions: CatalogFilters["sortOrder"][] = ["desc", "asc"];

const getPage = (searchParams: URLSearchParams) => {
  const page = Number(searchParams.get("page"));
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const getFiltersFromParams = (
  searchParams: URLSearchParams,
): CatalogFilters => {
  const sortByParam = searchParams.get("sortBy") as CatalogFilters["sortBy"];
  const sortOrderParam = searchParams.get(
    "sortOrder",
  ) as CatalogFilters["sortOrder"];

  return {
    q: searchParams.get("q") ?? "",
    categoryId: searchParams.get("categoryId") ?? "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    sortBy: sortByOptions.includes(sortByParam)
      ? sortByParam
      : defaultFilters.sortBy,
    sortOrder: sortOrderOptions.includes(sortOrderParam)
      ? sortOrderParam
      : defaultFilters.sortOrder,
  };
};



export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isHomepage = location.pathname === "/";
  const page = getPage(searchParams);

  const query = useMemo<ProductListQuery>(
    () => ({
      page,
      limit: 12,
      ...getFiltersFromParams(searchParams),
    }),
    [page, searchParams],
  );

  const categoriesQuery = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: categoriesApi.list,
  });

  const productsQuery = useQuery({
    queryKey: ["catalog", "products", query],
    queryFn: () => catalogApi.listProducts(query),
  });

  const topSearchedQuery = useQuery({
    queryKey: ["catalog", "top-searched"],
    queryFn: () => catalogApi.listTopSearched(6),
    enabled: isHomepage,
    staleTime: 60_000,
  });

  const products = productsQuery.data?.items ?? [];
  const meta = productsQuery.data?.meta;
  const selectedCategoryId = searchParams.get("categoryId") ?? "";

  const resetFilters = () => {
    setSearchParams({ page: "1" });
  };

  const changePage = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(nextPage));
    setSearchParams(nextParams);
  };

  return (
    <div className="space-y-6">
      {!isHomepage ? <header className="rounded-lg border border-border bg-white px-5 py-4 shadow-panel"><h1 className="text-xl font-semibold text-ink">{searchParams.get("q") ? `Kết quả tìm kiếm cho “${searchParams.get("q")}”` : "Tất cả sản phẩm"}</h1>{meta?.total !== undefined ? <p className="mt-1 text-sm text-muted">Tìm thấy {meta.total.toLocaleString("vi-VN")} sản phẩm</p> : null}</header> : null}
      {isHomepage && categoriesQuery.isError ? (
        <Alert tone="danger">
          Không thể tải danh mục, nhưng bạn vẫn có thể xem sản phẩm.
        </Alert>
      ) : null}

      {isHomepage && categoriesQuery.isLoading ? (
        <section aria-label="Đang tải danh mục" className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <Skeleton className="h-6 w-32" />
          <div className="mt-5 grid grid-flow-col grid-rows-2 gap-x-4 gap-y-5 overflow-hidden">
            {Array.from({ length: 12 }, (_, index) => <div key={index} className="w-24"><Skeleton className="mx-auto h-16 w-16 rounded-full"/><Skeleton className="mx-auto mt-2 h-8 w-20"/></div>)}
          </div>
        </section>
      ) : null}

      {isHomepage && !categoriesQuery.isLoading && !categoriesQuery.isError && (categoriesQuery.data?.length ?? 0) > 0 ? (
        <section aria-labelledby="homepage-category-heading" className="overflow-hidden rounded-lg border border-border bg-white shadow-panel">
          <div className="border-b border-border px-5 py-4"><h2 id="homepage-category-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">Danh mục</h2></div>
          <div className="grid auto-cols-[6.5rem] grid-flow-col grid-rows-2 gap-x-3 gap-y-5 overflow-x-auto px-4 py-5 sm:auto-cols-[7.5rem] lg:grid-flow-row lg:grid-cols-8 lg:overflow-visible xl:grid-cols-10">
            {(categoriesQuery.data ?? []).flatMap((category) => [category, ...category.children]).map((category) => {
              const selected = selectedCategoryId === category.id;
              return <button key={category.id} type="button" aria-pressed={selected} onClick={() => navigate(`/products?categoryId=${encodeURIComponent(category.id)}&page=1`)} className={`group flex min-h-28 flex-col items-center rounded-lg px-2 py-2 text-center transition focus:outline-none focus:ring-2 focus:ring-primary-600 ${selected ? "bg-primary-50 text-primary-700" : "text-ink hover:bg-surface"}`}>
                <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-border bg-surface sm:h-18 sm:w-18">{category.imageUrl ? <img src={category.imageUrl} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-105" loading="lazy"/> : <span className="px-2 text-xs font-semibold text-muted" aria-hidden="true">{category.categoryName.slice(0, 2).toLocaleUpperCase("vi")}</span>}</span>
                <span className="mt-2 line-clamp-2 text-xs leading-4 sm:text-sm">{category.categoryName}</span>
              </button>;
            })}
          </div>
        </section>
      ) : null}

      {isHomepage && topSearchedQuery.isLoading ? <section aria-label="Đang tải tìm kiếm hàng đầu" className="rounded-lg border border-border bg-white p-5 shadow-panel"><Skeleton className="h-6 w-44"/><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-48"/>)}</div></section> : null}
      {isHomepage && topSearchedQuery.isError ? <Alert tone="danger">Không thể tải tìm kiếm hàng đầu. Bạn vẫn có thể tiếp tục xem sản phẩm.</Alert> : null}
      {isHomepage && (topSearchedQuery.data?.length ?? 0) > 0 ? <section aria-labelledby="top-searched-heading" className="overflow-hidden rounded-lg border border-border bg-white shadow-panel"><div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 id="top-searched-heading" className="text-sm font-semibold uppercase tracking-wide text-primary-700">Tìm kiếm hàng đầu</h2><Link to="/products" className="rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-600">Xem tất cả</Link></div><div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-6">{topSearchedQuery.data?.map(({ product, searchCount }, index) => <Link key={product.id} to={`/products/${product.slug}`} className="group relative bg-white p-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-600"><span className="absolute left-3 top-3 z-10 rounded-r-md bg-primary-600 px-2 py-1 text-[10px] font-bold text-white">TOP {index + 1}</span><div className="aspect-square overflow-hidden rounded-md bg-surface">{product.thumbnailImage ? <img src={product.thumbnailImage.imageUrl} alt={product.thumbnailImage.altText ?? product.productName} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" loading="lazy"/> : <div className="grid h-full place-items-center px-3 text-center text-xs text-muted">Chưa có ảnh</div>}</div><p className="mt-3 line-clamp-2 min-h-10 text-sm font-medium text-ink">{product.productName}</p><p className="mt-1 text-xs text-muted">{Number(searchCount).toLocaleString("vi-VN")} lượt tìm kiếm</p></Link>)}</div></section> : null}

      {productsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-80 w-full" />
          ))}
        </div>
      ) : null}

      {productsQuery.isError ? (
        <ErrorState
          title="Không thể tải sản phẩm"
          message="Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại sau."
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
            title="Không tìm thấy sản phẩm"
            description="Hãy thay đổi điều kiện lọc hoặc đặt lại bộ lọc."
            action={
              <Button type="button" variant="secondary" onClick={resetFilters}>
                <Filter size={16} aria-hidden="true" />
                Đặt lại bộ lọc
              </Button>
            }
          />
        )
      ) : null}
    </div>
  );
}
