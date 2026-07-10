import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { SelectInput } from '@/components/ui/SelectInput';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/Table';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/services/errors';
import { useToastStore } from '@/stores/toast.store';
import { formatStatus } from '@/utils/format';
import { adminShippingCompaniesApi } from '../api';
import type { ShippingCompany, ShippingCompanyRequest } from '../types';

const companySchema = z.object({
  companyName: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  email: z.string().trim().email().max(255).or(z.literal('')).optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9+().\-\s]{7,20}$/)
    .or(z.literal(''))
    .optional(),
  taxCode: z.string().trim().max(50).optional(),
  addressText: z.string().trim().max(500).optional(),
  companyStatus: z.enum([
    'PendingApproval',
    'Approved',
    'Rejected',
    'Suspended',
    'Inactive',
  ]),
});

type CompanyFormValues = z.infer<typeof companySchema>;

const defaultValues: CompanyFormValues = {
  companyName: '',
  slug: '',
  email: '',
  phoneNumber: '',
  taxCode: '',
  addressText: '',
  companyStatus: 'Approved',
};

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
};

const toRequest = (values: CompanyFormValues): ShippingCompanyRequest => ({
  companyName: values.companyName.trim(),
  slug: values.slug.trim(),
  email: optionalString(values.email),
  phoneNumber: optionalString(values.phoneNumber),
  taxCode: optionalString(values.taxCode),
  addressText: optionalString(values.addressText),
  companyStatus: values.companyStatus,
});

const toFormValues = (company: ShippingCompany): CompanyFormValues => ({
  companyName: company.companyName,
  slug: company.slug,
  email: company.email ?? '',
  phoneNumber: company.phoneNumber ?? '',
  taxCode: company.taxCode ?? '',
  addressText: company.addressText ?? '',
  companyStatus:
    company.companyStatus === 'PendingApproval' ||
    company.companyStatus === 'Rejected' ||
    company.companyStatus === 'Suspended' ||
    company.companyStatus === 'Inactive'
      ? company.companyStatus
      : 'Approved',
});

export function AdminShippingCompaniesPage() {
  const [page, setPage] = useState(1);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShippingCompany | null>(null);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues,
  });
  const companiesQuery = useQuery({
    queryKey: ['admin', 'shipping-companies', page],
    queryFn: () => adminShippingCompaniesApi.list(page, 10),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-companies'] });

  const saveMutation = useMutation({
    mutationFn: (values: CompanyFormValues) =>
      editingCompany
        ? adminShippingCompaniesApi.update(editingCompany.id, toRequest(values))
        : adminShippingCompaniesApi.create(toRequest(values)),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: 'success', title: 'Shipping company saved' });
      setEditingCompany(null);
      setIsCreateOpen(false);
      form.reset(defaultValues);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (companyId: string) => adminShippingCompaniesApi.delete(companyId),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: 'success', title: 'Shipping company deleted' });
      setDeleteTarget(null);
    },
  });

  useEffect(() => {
    if (editingCompany) {
      form.reset(toFormValues(editingCompany));
    } else if (isCreateOpen) {
      form.reset(defaultValues);
    }
  }, [editingCompany, form, isCreateOpen]);

  const companies = companiesQuery.data?.items ?? [];
  const meta = companiesQuery.data?.meta;
  const isModalOpen = isCreateOpen || Boolean(editingCompany);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Admin shipping
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Companies</h1>
          </div>
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            New company
          </Button>
        </div>
      </section>

      {companiesQuery.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {companiesQuery.isError ? (
        <ErrorState
          title="Cannot load shipping companies"
          message="Admin shipping company API failed."
        />
      ) : null}
      {!companiesQuery.isLoading && !companiesQuery.isError ? (
        companies.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Company</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Contact</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <p className="font-medium">{company.companyName}</p>
                      <p className="text-xs text-muted">{company.slug}</p>
                    </TableCell>
                    <TableCell>
                      <Badge>{formatStatus(company.companyStatus)}</Badge>
                    </TableCell>
                    <TableCell>
                      <p>{company.email ?? 'No email'}</p>
                      <p className="text-xs text-muted">
                        {company.phoneNumber ?? 'No phone'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setEditingCompany(company)}
                        >
                          <Edit size={15} aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => setDeleteTarget(company)}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={meta?.page ?? page}
              totalPages={meta?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        ) : (
          <EmptyState title="No companies" description="Create a shipping company." />
        )
      ) : null}

      <Modal
        open={isModalOpen}
        title={editingCompany ? 'Edit company' : 'Create company'}
        onClose={() => {
          setEditingCompany(null);
          setIsCreateOpen(false);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingCompany(null);
                setIsCreateOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="company-form" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        {saveMutation.isError ? (
          <Alert tone="danger" className="mb-4">
            {getErrorMessage(saveMutation.error)}
          </Alert>
        ) : null}
        <form
          id="company-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <TextInput
            label="Company name"
            error={form.formState.errors.companyName?.message}
            {...form.register('companyName')}
          />
          <TextInput
            label="Slug"
            error={form.formState.errors.slug?.message}
            {...form.register('slug')}
          />
          <TextInput
            label="Email"
            type="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <TextInput
            label="Phone"
            error={form.formState.errors.phoneNumber?.message}
            {...form.register('phoneNumber')}
          />
          <TextInput
            label="Tax code"
            error={form.formState.errors.taxCode?.message}
            {...form.register('taxCode')}
          />
          <SelectInput
            label="Status"
            error={form.formState.errors.companyStatus?.message}
            {...form.register('companyStatus')}
          >
            <option value="Approved">Approved</option>
            <option value="PendingApproval">Pending approval</option>
            <option value="Rejected">Rejected</option>
            <option value="Suspended">Suspended</option>
            <option value="Inactive">Inactive</option>
          </SelectInput>
          <Textarea
            label="Address"
            rows={3}
            error={form.formState.errors.addressText?.message}
            {...form.register('addressText')}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete company"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {deleteMutation.isError
            ? getErrorMessage(deleteMutation.error)
            : `Delete ${deleteTarget?.companyName ?? 'this company'}?`}
        </p>
      </Modal>
    </div>
  );
}
