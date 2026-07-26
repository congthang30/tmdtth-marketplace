import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { useAuthStore } from "@/stores/auth.store";
import { authApi } from "@/features/auth/api";
import { sellerShopApi } from "../api";

const shopSchema = z.object({
  shopName: z
    .string()
    .trim()
    .min(2, "Tên gian hàng phải có ít nhất 2 ký tự")
    .max(150, "Tên gian hàng quá dài"),
  description: z.string().trim().max(1000, "Mô tả quá dài").optional(),
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
  province: z.string().trim().max(100, "Tên tỉnh/thành phố quá dài").optional(),
  district: z.string().trim().max(100, "Tên quận/huyện quá dài").optional(),
  ward: z.string().trim().max(100, "Tên phường/xã quá dài").optional(),
  streetAddress: z
    .string()
    .trim()
    .max(255, "Địa chỉ đường/phố quá dài")
    .optional(),
  taxCode: z.string().trim().max(50, "Mã số thuế quá dài").optional(),
});

type ShopFormValues = z.infer<typeof shopSchema>;

const cleanOptional = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
};

export function SellerShopRegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const setUser = useAuthStore((state) => state.setUser);
  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      shopName: "",
      description: "",
      email: "",
      phoneNumber: "",
      province: "",
      district: "",
      ward: "",
      streetAddress: "",
      taxCode: "",
    },
  });

  const mutation = useMutation({
    mutationFn: sellerShopApi.createShop,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["seller", "shop"] });
      const currentUser = await authApi.me();
      setUser(currentUser);
      pushToast({
        tone: "success",
        title: "Đã gửi đăng ký gian hàng",
        description:
          "Gian hàng cần được quản trị viên phê duyệt trước khi đăng bán sản phẩm.",
      });
      navigate("/seller");
    },
  });

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Người bán
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Đăng ký gian hàng</h1>
        <p className="mt-2 text-sm text-muted">
          Gửi thông tin gian hàng để quản trị viên phê duyệt.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        {mutation.isError ? (
          <Alert tone="danger" className="mb-5">
            {getErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({
              shopName: values.shopName.trim(),
              description: cleanOptional(values.description),
              email: cleanOptional(values.email),
              phoneNumber: cleanOptional(values.phoneNumber),
              province: cleanOptional(values.province),
              district: cleanOptional(values.district),
              ward: cleanOptional(values.ward),
              streetAddress: cleanOptional(values.streetAddress),
              taxCode: cleanOptional(values.taxCode),
            }),
          )}
        >
          <TextInput
            label="Tên gian hàng"
            error={form.formState.errors.shopName?.message}
            {...form.register("shopName")}
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
          <Textarea
            label="Mô tả"
            rows={4}
            className="md:col-span-2"
            error={form.formState.errors.description?.message}
            {...form.register("description")}
          />
          <div className="md:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              <Store size={16} aria-hidden="true" />
              {mutation.isPending ? "Đang gửi..." : "Gửi đăng ký"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
