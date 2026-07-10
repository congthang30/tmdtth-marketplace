import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { addressesApi } from "../api";
import type { Address, AddressRequest } from "../types";

const addressSchema = z.object({
  receiverName: z
    .string()
    .trim()
    .min(2, "Tên người nhận phải có ít nhất 2 ký tự")
    .max(150, "Tên người nhận quá dài"),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9+()\s-]{8,20}$/, "Vui lòng nhập số điện thoại hợp lệ"),
  province: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập tỉnh/thành phố")
    .max(100, "Tên tỉnh/thành phố quá dài"),
  district: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập quận/huyện")
    .max(100, "Tên quận/huyện quá dài"),
  ward: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập phường/xã")
    .max(100, "Tên phường/xã quá dài"),
  streetAddress: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập địa chỉ đường/phố")
    .max(255, "Địa chỉ đường/phố quá dài"),
  fullAddress: z.string().trim().max(600, "Địa chỉ đầy đủ quá dài").optional(),
  isDefault: z.boolean().optional(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

type AddressFormModalProps = {
  open: boolean;
  address: Address | null;
  onClose: () => void;
};

const addressQueryKey = ["account", "addresses"];

const toAddressRequest = (
  values: AddressFormValues,
  includeDefault: boolean,
): AddressRequest => ({
  receiverName: values.receiverName.trim(),
  phoneNumber: values.phoneNumber.trim(),
  province: values.province.trim(),
  district: values.district.trim(),
  ward: values.ward.trim(),
  streetAddress: values.streetAddress.trim(),
  fullAddress: values.fullAddress?.trim() || null,
  ...(includeDefault ? { isDefault: Boolean(values.isDefault) } : {}),
});

function AddressFormModal({ open, address, onClose }: AddressFormModalProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      receiverName: "",
      phoneNumber: "",
      province: "",
      district: "",
      ward: "",
      streetAddress: "",
      fullAddress: "",
      isDefault: false,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      receiverName: address?.receiverName ?? "",
      phoneNumber: address?.phoneNumber ?? "",
      province: address?.province ?? "",
      district: address?.district ?? "",
      ward: address?.ward ?? "",
      streetAddress: address?.streetAddress ?? "",
      fullAddress: address?.fullAddress ?? "",
      isDefault: address?.isDefault ?? false,
    });
  }, [address, form, open]);

  const mutation = useMutation({
    mutationFn: (values: AddressFormValues) =>
      address
        ? addressesApi.update(address.id, toAddressRequest(values, false))
        : addressesApi.create(toAddressRequest(values, true)),
    onSuccess: async (savedAddress) => {
      await queryClient.invalidateQueries({ queryKey: addressQueryKey });
      pushToast({
        tone: "success",
        title: address ? "Đã cập nhật địa chỉ" : "Đã tạo địa chỉ",
        description: savedAddress.fullAddress ?? savedAddress.streetAddress,
      });
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      title={address ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ"}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            form="address-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Đang lưu..." : "Lưu địa chỉ"}
          </Button>
        </>
      }
    >
      {mutation.isError ? (
        <Alert tone="danger" className="mb-4">
          {getErrorMessage(mutation.error)}
        </Alert>
      ) : null}

      <form
        id="address-form"
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <TextInput
          label="Người nhận"
          error={form.formState.errors.receiverName?.message}
          {...form.register("receiverName")}
        />
        <TextInput
          label="Số điện thoại"
          error={form.formState.errors.phoneNumber?.message}
          {...form.register("phoneNumber")}
        />
        <TextInput
          label="Tỉnh/Thành phố"
          error={form.formState.errors.province?.message}
          {...form.register("province")}
        />
        <TextInput
          label="Quận/Huyện"
          error={form.formState.errors.district?.message}
          {...form.register("district")}
        />
        <TextInput
          label="Phường/Xã"
          error={form.formState.errors.ward?.message}
          {...form.register("ward")}
        />
        <TextInput
          label="Địa chỉ đường/phố"
          error={form.formState.errors.streetAddress?.message}
          {...form.register("streetAddress")}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Địa chỉ đầy đủ"
            rows={3}
            error={form.formState.errors.fullAddress?.message}
            {...form.register("fullAddress")}
          />
        </div>
        {!address ? (
          <label className="flex items-center gap-2 text-sm font-medium text-ink sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary-600"
              {...form.register("isDefault")}
            />
            Đặt làm địa chỉ mặc định
          </label>
        ) : null}
      </form>
    </Modal>
  );
}

export function AddressesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const addressesQuery = useQuery({
    queryKey: addressQueryKey,
    queryFn: () => addressesApi.list(),
  });

  const setDefaultMutation = useMutation({
    mutationFn: addressesApi.setDefault,
    onSuccess: async (address) => {
      await queryClient.invalidateQueries({ queryKey: addressQueryKey });
      pushToast({
        tone: "success",
        title: "Đã cập nhật địa chỉ mặc định",
        description: address.fullAddress ?? address.streetAddress,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: addressesApi.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: addressQueryKey });
      pushToast({
        tone: "success",
        title: "Đã xóa địa chỉ",
      });
      setDeletingAddress(null);
    },
  });

  const addresses = addressesQuery.data?.items ?? [];
  const openCreate = () => {
    setEditingAddress(null);
    setIsFormOpen(true);
  };
  const openEdit = (address: Address) => {
    setEditingAddress(address);
    setIsFormOpen(true);
  };
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAddress(null);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Địa chỉ
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Địa chỉ giao hàng</h1>
            <p className="mt-2 text-sm text-muted">
              Quản lý người nhận, số điện thoại và địa chỉ mặc định khi thanh
              toán.
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            Thêm địa chỉ
          </Button>
        </div>
      </section>

      {addressesQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      ) : null}

      {addressesQuery.isError ? (
        <ErrorState
          title="Không thể tải danh sách địa chỉ"
          message="Phiên đăng nhập có thể đã hết hạn hoặc hệ thống đang tạm thời gián đoạn."
        />
      ) : null}

      {!addressesQuery.isLoading && !addressesQuery.isError ? (
        addresses.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="rounded-lg border border-border bg-white p-5 shadow-panel"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-ink">
                        {address.receiverName}
                      </h2>
                      {address.isDefault ? <Badge>Mặc định</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {address.phoneNumber}
                    </p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-50 text-primary-700">
                    <MapPin size={18} aria-hidden="true" />
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-ink">
                  {address.fullAddress ??
                    `${address.streetAddress}, ${address.ward}, ${address.district}, ${address.province}`}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {!address.isDefault ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={setDefaultMutation.isPending}
                      onClick={() => setDefaultMutation.mutate(address.id)}
                    >
                      <Star size={16} aria-hidden="true" />
                      Đặt mặc định
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openEdit(address)}
                  >
                    <Edit size={16} aria-hidden="true" />
                    Chỉnh sửa
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setDeletingAddress(address)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Xóa
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có địa chỉ giao hàng"
            description="Hãy tạo địa chỉ mặc định trước khi thanh toán."
            action={
              <Button type="button" onClick={openCreate}>
                <Plus size={16} aria-hidden="true" />
                Thêm địa chỉ
              </Button>
            }
          />
        )
      ) : null}

      <AddressFormModal
        open={isFormOpen}
        address={editingAddress}
        onClose={closeForm}
      />

      <Modal
        open={Boolean(deletingAddress)}
        title="Xóa địa chỉ"
        onClose={() => setDeletingAddress(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeletingAddress(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deletingAddress) {
                  deleteMutation.mutate(deletingAddress.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </>
        }
      >
        {deleteMutation.isError ? (
          <Alert tone="danger" className="mb-4">
            {getErrorMessage(deleteMutation.error)}
          </Alert>
        ) : null}
        <p className="text-sm leading-6 text-muted">
          Địa chỉ của {deletingAddress?.receiverName} sẽ bị xóa và không còn
          xuất hiện trong các lựa chọn giao hàng khi thanh toán.
        </p>
      </Modal>
    </div>
  );
}
