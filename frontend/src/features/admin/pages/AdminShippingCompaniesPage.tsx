import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SelectInput } from "@/components/ui/SelectInput";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { formatStatus } from "@/utils/format";
import { adminShippingCompaniesApi } from "../api";
import type { ShippingCompany, ShippingCompanyRequest } from "../types";

const companySchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Tên đơn vị phải có ít nhất 2 ký tự")
    .max(150, "Tên đơn vị quá dài"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug phải có ít nhất 2 ký tự")
    .max(180, "Slug quá dài")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug chỉ gồm chữ thường, số và dấu gạch ngang",
    ),
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .max(255, "Email quá dài")
    .or(z.literal(""))
    .optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9+().\-\s]{7,20}$/, "Số điện thoại không hợp lệ")
    .or(z.literal(""))
    .optional(),
  taxCode: z.string().trim().max(50, "Mã số thuế quá dài").optional(),
  addressText: z.string().trim().max(500, "Địa chỉ quá dài").optional(),
  companyStatus: z.enum([
    "PendingApproval",
    "Approved",
    "Rejected",
    "Suspended",
    "Inactive",
  ]),
});

type CompanyFormValues = z.infer<typeof companySchema>;

const defaultValues: CompanyFormValues = {
  companyName: "",
  slug: "",
  email: "",
  phoneNumber: "",
  taxCode: "",
  addressText: "",
  companyStatus: "Approved",
};

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
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
  email: company.email ?? "",
  phoneNumber: company.phoneNumber ?? "",
  taxCode: company.taxCode ?? "",
  addressText: company.addressText ?? "",
  companyStatus:
    company.companyStatus === "PendingApproval" ||
    company.companyStatus === "Rejected" ||
    company.companyStatus === "Suspended" ||
    company.companyStatus === "Inactive"
      ? company.companyStatus
      : "Approved",
});

export function AdminShippingCompaniesPage() {
  const [page, setPage] = useState(1);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShippingCompany | null>(
    null,
  );
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues,
  });
  const companiesQuery = useQuery({
    queryKey: ["admin", "shipping-companies", page],
    queryFn: () => adminShippingCompaniesApi.list(page, 10),
  });
  const loadCompanyMutation = useMutation({
    mutationFn: (companyId: string) => adminShippingCompaniesApi.get(companyId),
    onSuccess: (company) => setEditingCompany(company),
    onError: (error) =>
      pushToast({
        tone: "danger",
        title: "Không thể tải đơn vị vận chuyển",
        description: getErrorMessage(error),
      }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["admin", "shipping-companies"],
    });

  const saveMutation = useMutation({
    mutationFn: (values: CompanyFormValues) =>
      editingCompany
        ? adminShippingCompaniesApi.update(editingCompany.id, toRequest(values))
        : adminShippingCompaniesApi.create(toRequest(values)),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: "success", title: "Đã lưu đơn vị vận chuyển" });
      setEditingCompany(null);
      setIsCreateOpen(false);
      form.reset(defaultValues);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (companyId: string) =>
      adminShippingCompaniesApi.delete(companyId),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: "success", title: "Đã xóa đơn vị vận chuyển" });
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
              Quản trị vận chuyển
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Đơn vị vận chuyển</h1>
          </div>
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            Thêm đơn vị
          </Button>
        </div>
      </section>

      {companiesQuery.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {companiesQuery.isError ? (
        <ErrorState
          title="Không thể tải đơn vị vận chuyển"
          message="Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại."
        />
      ) : null}
      {!companiesQuery.isLoading && !companiesQuery.isError ? (
        companies.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Đơn vị</TableHeaderCell>
                  <TableHeaderCell>Trạng thái</TableHeaderCell>
                  <TableHeaderCell>Liên hệ</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    Thao tác
                  </TableHeaderCell>
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
                      <p>{company.email ?? "Chưa có email"}</p>
                      <p className="text-xs text-muted">
                        {company.phoneNumber ?? "Chưa có số điện thoại"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={
                            loadCompanyMutation.isPending &&
                            loadCompanyMutation.variables === company.id
                          }
                          onClick={() => loadCompanyMutation.mutate(company.id)}
                        >
                          <Edit size={15} aria-hidden="true" />
                          {loadCompanyMutation.isPending &&
                          loadCompanyMutation.variables === company.id
                            ? "Đang tải..."
                            : "Chỉnh sửa"}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => setDeleteTarget(company)}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          Xóa
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
          <EmptyState
            title="Chưa có đơn vị vận chuyển"
            description="Hãy tạo đơn vị vận chuyển đầu tiên."
          />
        )
      ) : null}

      <Modal
        open={isModalOpen}
        title={
          editingCompany
            ? "Chỉnh sửa đơn vị vận chuyển"
            : "Tạo đơn vị vận chuyển"
        }
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
              Hủy
            </Button>
            <Button
              type="submit"
              form="company-form"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
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
            label="Tên đơn vị"
            error={form.formState.errors.companyName?.message}
            {...form.register("companyName")}
          />
          <TextInput
            label="Slug"
            error={form.formState.errors.slug?.message}
            {...form.register("slug")}
          />
          <TextInput
            label="Email"
            type="email"
            error={form.formState.errors.email?.message}
            {...form.register("email")}
          />
          <TextInput
            label="Số điện thoại"
            error={form.formState.errors.phoneNumber?.message}
            {...form.register("phoneNumber")}
          />
          <TextInput
            label="Mã số thuế"
            error={form.formState.errors.taxCode?.message}
            {...form.register("taxCode")}
          />
          <SelectInput
            label="Trạng thái"
            error={form.formState.errors.companyStatus?.message}
            {...form.register("companyStatus")}
          >
            <option value="Approved">Đã phê duyệt</option>
            <option value="PendingApproval">Chờ phê duyệt</option>
            <option value="Rejected">Đã từ chối</option>
            <option value="Suspended">Tạm ngưng</option>
            <option value="Inactive">Ngừng hoạt động</option>
          </SelectInput>
          <Textarea
            label="Địa chỉ"
            rows={3}
            error={form.formState.errors.addressText?.message}
            {...form.register("addressText")}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Xóa đơn vị vận chuyển"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {deleteMutation.isError
            ? getErrorMessage(deleteMutation.error)
            : `Bạn có muốn xóa đơn vị ${deleteTarget?.companyName ?? "này"} không?`}
        </p>
      </Modal>
    </div>
  );
}
