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
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { formatMoney, formatStatus } from "@/utils/format";
import { adminShippingCompaniesApi, adminShippingServicesApi } from "../api";
import type { ShippingService, ShippingServiceRequest } from "../types";

const moneyPattern = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;

const serviceSchema = z.object({
  shippingCompanyId: z.string().min(1, "Vui lòng chọn đơn vị vận chuyển"),
  serviceCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/, "Mã dịch vụ không hợp lệ"),
  serviceName: z
    .string()
    .trim()
    .min(2, "Tên dịch vụ phải có ít nhất 2 ký tự")
    .max(150, "Tên dịch vụ quá dài"),
  baseFee: z.string().trim().regex(moneyPattern, "Phí cơ bản không hợp lệ"),
  feePerKg: z
    .string()
    .trim()
    .regex(moneyPattern, "Phí theo kg không hợp lệ")
    .or(z.literal(""))
    .optional(),
  estimatedMinDays: z.coerce
    .number()
    .int("Số ngày phải là số nguyên")
    .min(1, "Tối thiểu 1 ngày")
    .max(365, "Tối đa 365 ngày"),
  estimatedMaxDays: z.coerce
    .number()
    .int("Số ngày phải là số nguyên")
    .min(1, "Tối thiểu 1 ngày")
    .max(365, "Tối đa 365 ngày"),
  isActive: z.boolean().optional(),
});

type ServiceFormInput = z.input<typeof serviceSchema>;
type ServiceFormValues = z.output<typeof serviceSchema>;

const defaultValues: ServiceFormInput = {
  shippingCompanyId: "",
  serviceCode: "",
  serviceName: "",
  baseFee: "",
  feePerKg: "",
  estimatedMinDays: 1,
  estimatedMaxDays: 3,
  isActive: true,
};

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
};

const toRequest = (values: ServiceFormValues): ShippingServiceRequest => ({
  shippingCompanyId: values.shippingCompanyId,
  serviceCode: values.serviceCode.trim(),
  serviceName: values.serviceName.trim(),
  baseFee: values.baseFee.trim(),
  feePerKg: optionalString(values.feePerKg),
  estimatedMinDays: values.estimatedMinDays,
  estimatedMaxDays: values.estimatedMaxDays,
  isActive: values.isActive,
});

const toFormValues = (service: ShippingService): ServiceFormInput => ({
  shippingCompanyId: service.shippingCompanyId,
  serviceCode: service.serviceCode,
  serviceName: service.serviceName,
  baseFee: service.baseFee,
  feePerKg: service.feePerKg,
  estimatedMinDays: service.estimatedMinDays,
  estimatedMaxDays: service.estimatedMaxDays,
  isActive: service.isActive,
});

export function AdminShippingServicesPage() {
  const [page, setPage] = useState(1);
  const [companyFilter, setCompanyFilter] = useState("");
  const [editingService, setEditingService] = useState<ShippingService | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShippingService | null>(
    null,
  );
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<ServiceFormInput, unknown, ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues,
  });
  const companiesQuery = useQuery({
    queryKey: ["admin", "shipping-companies", "options"],
    queryFn: () => adminShippingCompaniesApi.list(1, 100),
  });
  const servicesQuery = useQuery({
    queryKey: ["admin", "shipping-services", page, companyFilter],
    queryFn: () =>
      adminShippingServicesApi.list(page, 10, companyFilter || undefined),
  });
  const loadServiceMutation = useMutation({
    mutationFn: (serviceId: string) => adminShippingServicesApi.get(serviceId),
    onSuccess: (service) => setEditingService(service),
    onError: (error) =>
      pushToast({
        tone: "danger",
        title: "Không thể tải dịch vụ vận chuyển",
        description: getErrorMessage(error),
      }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "shipping-services"] });

  const saveMutation = useMutation({
    mutationFn: (values: ServiceFormValues) =>
      editingService
        ? adminShippingServicesApi.update(editingService.id, toRequest(values))
        : adminShippingServicesApi.create(toRequest(values)),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: "success", title: "Đã lưu dịch vụ vận chuyển" });
      setEditingService(null);
      setIsCreateOpen(false);
      form.reset(defaultValues);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (serviceId: string) =>
      adminShippingServicesApi.deactivate(serviceId),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: "success", title: "Đã ngừng dịch vụ vận chuyển" });
      setDeleteTarget(null);
    },
  });

  useEffect(() => {
    if (editingService) {
      form.reset(toFormValues(editingService));
    } else if (isCreateOpen) {
      form.reset(defaultValues);
    }
  }, [editingService, form, isCreateOpen]);

  const companies = companiesQuery.data?.items ?? [];
  const services = servicesQuery.data?.items ?? [];
  const meta = servicesQuery.data?.meta;
  const isModalOpen = isCreateOpen || Boolean(editingService);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Quản trị vận chuyển
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Dịch vụ vận chuyển</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <SelectInput
              label="Đơn vị vận chuyển"
              value={companyFilter}
              onChange={(event) => {
                setCompanyFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả đơn vị</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName}
                </option>
              ))}
            </SelectInput>
            <Button type="button" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              Thêm dịch vụ
            </Button>
          </div>
        </div>
      </section>

      {servicesQuery.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {servicesQuery.isError ? (
        <ErrorState
          title="Không thể tải dịch vụ vận chuyển"
          message="Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại."
        />
      ) : null}
      {!servicesQuery.isLoading && !servicesQuery.isError ? (
        services.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Dịch vụ</TableHeaderCell>
                  <TableHeaderCell>Biểu phí</TableHeaderCell>
                  <TableHeaderCell>Thời gian dự kiến</TableHeaderCell>
                  <TableHeaderCell>Trạng thái</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    Thao tác
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <p className="font-medium">{service.serviceName}</p>
                      <p className="text-xs text-muted">
                        {service.serviceCode}
                      </p>
                    </TableCell>
                    <TableCell>
                      {formatMoney(service.baseFee)} +{" "}
                      {formatMoney(service.feePerKg)}/kg
                    </TableCell>
                    <TableCell>
                      {service.estimatedMinDays}-{service.estimatedMaxDays} ngày
                    </TableCell>
                    <TableCell>
                      <Badge>
                        {formatStatus(service.isActive ? "Active" : "Inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={
                            loadServiceMutation.isPending &&
                            loadServiceMutation.variables === service.id
                          }
                          onClick={() => loadServiceMutation.mutate(service.id)}
                        >
                          <Edit size={15} aria-hidden="true" />
                          {loadServiceMutation.isPending &&
                          loadServiceMutation.variables === service.id
                            ? "Đang tải..."
                            : "Chỉnh sửa"}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => setDeleteTarget(service)}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          Ngừng sử dụng
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
            title="Chưa có dịch vụ"
            description="Hãy tạo dịch vụ vận chuyển đầu tiên."
          />
        )
      ) : null}

      <Modal
        open={isModalOpen}
        title={editingService ? "Chỉnh sửa dịch vụ" : "Tạo dịch vụ"}
        onClose={() => {
          setEditingService(null);
          setIsCreateOpen(false);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingService(null);
                setIsCreateOpen(false);
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="service-form"
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
          id="service-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <SelectInput
            label="Đơn vị vận chuyển"
            error={form.formState.errors.shippingCompanyId?.message}
            {...form.register("shippingCompanyId")}
          >
            <option value="">Chọn đơn vị vận chuyển</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.companyName}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="Mã dịch vụ"
            error={form.formState.errors.serviceCode?.message}
            {...form.register("serviceCode")}
          />
          <TextInput
            label="Tên dịch vụ"
            error={form.formState.errors.serviceName?.message}
            {...form.register("serviceName")}
          />
          <TextInput
            label="Phí cơ bản"
            inputMode="decimal"
            error={form.formState.errors.baseFee?.message}
            {...form.register("baseFee")}
          />
          <TextInput
            label="Phí mỗi kg"
            inputMode="decimal"
            error={form.formState.errors.feePerKg?.message}
            {...form.register("feePerKg")}
          />
          <TextInput
            label="Số ngày tối thiểu"
            type="number"
            min={1}
            error={form.formState.errors.estimatedMinDays?.message}
            {...form.register("estimatedMinDays")}
          />
          <TextInput
            label="Số ngày tối đa"
            type="number"
            min={1}
            error={form.formState.errors.estimatedMaxDays?.message}
            {...form.register("estimatedMaxDays")}
          />
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" {...form.register("isActive")} />
            Đang hoạt động
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Ngừng dịch vụ"
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
              disabled={deactivateMutation.isPending}
              onClick={() =>
                deleteTarget && deactivateMutation.mutate(deleteTarget.id)
              }
            >
              {deactivateMutation.isPending ? "Đang xử lý..." : "Ngừng sử dụng"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {deactivateMutation.isError
            ? getErrorMessage(deactivateMutation.error)
            : `Bạn có muốn ngừng dịch vụ ${deleteTarget?.serviceName ?? "này"} không?`}
        </p>
      </Modal>
    </div>
  );
}
