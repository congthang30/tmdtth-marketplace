import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { SelectInput } from '@/components/ui/SelectInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { categoriesApi } from '@/features/catalog/api';
import { flattenCategories } from '@/features/catalog/utils';
import { getErrorMessage } from '@/services/errors';
import { useToastStore } from '@/stores/toast.store';
import { formatStatus } from '@/utils/format';
import { sellerProductsApi, sellerShopApi } from '../api';
import type { ProductRequest, SellerProduct } from '../types';

const moneyPattern = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;
const integerPattern = /^\d*$/;

const productSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  productName: z.string().trim().min(2).max(255),
  description: z.string().trim().max(5000).optional(),
  brand: z.string().trim().max(150).optional(),
  basePrice: z.string().trim().regex(moneyPattern, 'Use a valid money amount'),
  compareAtPrice: z
    .string()
    .trim()
    .regex(moneyPattern, 'Use a valid money amount')
    .or(z.literal(''))
    .optional(),
  warrantyMonths: z.string().regex(integerPattern).optional(),
  weightGram: z.string().regex(integerPattern).optional(),
  productStatus: z.enum(['Draft', 'Published']),
});

type ProductFormValues = z.infer<typeof productSchema>;

const defaultValues: ProductFormValues = {
  categoryId: '',
  productName: '',
  description: '',
  brand: '',
  basePrice: '',
  compareAtPrice: '',
  warrantyMonths: '',
  weightGram: '',
  productStatus: 'Draft',
};

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalNumber = (value: string | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? Number(trimmed) : undefined;
};

function toFormValues(product: SellerProduct): ProductFormValues {
  return {
    categoryId: product.category.id,
    productName: product.productName,
    description: product.description ?? '',
    brand: product.brand ?? '',
    basePrice: product.basePrice,
    compareAtPrice: product.compareAtPrice ?? '',
    warrantyMonths: '',
    weightGram: '',
    productStatus: product.productStatus === 'Published' ? 'Published' : 'Draft',
  };
}

function toRequest(values: ProductFormValues, shopId?: string): ProductRequest {
  return {
    ...(shopId ? { shopId } : {}),
    categoryId: values.categoryId,
    productName: values.productName.trim(),
    description: optionalString(values.description),
    brand: optionalString(values.brand),
    basePrice: values.basePrice.trim(),
    compareAtPrice: optionalString(values.compareAtPrice),
    warrantyMonths: optionalNumber(values.warrantyMonths),
    weightGram: optionalNumber(values.weightGram),
    productStatus: values.productStatus,
  };
}

export function SellerProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  const shopQuery = useQuery({
    queryKey: ['seller', 'shop', 'me'],
    queryFn: sellerShopApi.getMyShop,
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });
  const productsQuery = useQuery({
    queryKey: ['seller', 'products', 'lookup'],
    queryFn: () => sellerProductsApi.list(1, 100),
    enabled: isEdit,
  });

  const product = productsQuery.data?.items.find((item) => item.id === id);
  const categories = flattenCategories(categoriesQuery.data ?? []);

  useEffect(() => {
    if (product) {
      form.reset(toFormValues(product));
    }
  }, [form, product]);

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      isEdit && id
        ? sellerProductsApi.update(id, toRequest(values))
        : sellerProductsApi.create(toRequest(values, shopQuery.data?.id)),
    onSuccess: async (savedProduct) => {
      await queryClient.invalidateQueries({ queryKey: ['seller', 'products'] });
      pushToast({
        tone: 'success',
        title: isEdit ? 'Product updated' : 'Product created',
        description: savedProduct.productName,
      });
      navigate('/seller/products');
    },
  });

  if (shopQuery.isLoading || categoriesQuery.isLoading || productsQuery.isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (shopQuery.isError || categoriesQuery.isError || productsQuery.isError) {
    return (
      <ErrorState
        title="Cannot load product form"
        message="Required seller shop, product, or category data is unavailable."
      />
    );
  }

  if (!shopQuery.data) {
    return (
      <ErrorState
        title="Register a shop first"
        message="A seller shop is required before products can be created."
      />
    );
  }

  if (isEdit && !product) {
    return (
      <ErrorState
        title="Product not found"
        message="The product is not in the current seller product list."
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Seller products
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {isEdit ? 'Edit product' : 'Create product'}
          </h1>
          <span className="text-sm text-muted">
            Shop: {shopQuery.data.shopName} ({formatStatus(shopQuery.data.shopStatus)})
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        {mutation.isError ? (
          <Alert tone="danger" className="mb-5">
            {getErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <TextInput
            label="Product name"
            error={form.formState.errors.productName?.message}
            {...form.register('productName')}
          />
          <SelectInput
            label="Category"
            error={form.formState.errors.categoryId?.message}
            {...form.register('categoryId')}
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="Base price"
            inputMode="decimal"
            error={form.formState.errors.basePrice?.message}
            {...form.register('basePrice')}
          />
          <TextInput
            label="Compare at price"
            inputMode="decimal"
            error={form.formState.errors.compareAtPrice?.message}
            {...form.register('compareAtPrice')}
          />
          <TextInput
            label="Brand"
            error={form.formState.errors.brand?.message}
            {...form.register('brand')}
          />
          <SelectInput
            label="Status"
            error={form.formState.errors.productStatus?.message}
            {...form.register('productStatus')}
          >
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
          </SelectInput>
          <TextInput
            label="Warranty months"
            inputMode="numeric"
            error={form.formState.errors.warrantyMonths?.message}
            {...form.register('warrantyMonths')}
          />
          <TextInput
            label="Weight grams"
            inputMode="numeric"
            error={form.formState.errors.weightGram?.message}
            {...form.register('weightGram')}
          />
          <Textarea
            label="Description"
            rows={5}
            className="md:col-span-2"
            error={form.formState.errors.description?.message}
            {...form.register('description')}
          />
          <div className="md:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              <Save size={16} aria-hidden="true" />
              {mutation.isPending ? 'Saving...' : 'Save product'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
