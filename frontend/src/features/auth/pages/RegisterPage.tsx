import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { getErrorMessage } from "@/services/errors";
import { useAuthStore } from "@/stores/auth.store";
import { authApi } from "../api";
import { getAuthenticatedHome } from "../navigation";

const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(150, "Họ và tên quá dài"),
  email: z.string().trim().email("Vui lòng nhập địa chỉ email hợp lệ"),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{8,20}$/, "Vui lòng nhập số điện thoại hợp lệ")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuth = useAuthStore((state) => state.setAuth);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth({ accessToken: data.accessToken, user: data.user });
      navigate(getAuthenticatedHome(data.user), { replace: true });
    },
  });

  const user = useAuthStore((state) => state.user);

  if (accessToken && user) {
    return <Navigate to={getAuthenticatedHome(user)} replace />;
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-white p-6 shadow-panel">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Tạo tài khoản
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Bắt đầu mua sắm</h1>
        <p className="mt-2 text-sm text-muted">
          Tài khoản đã đăng ký có thể quản lý giỏ hàng, địa chỉ, đơn hàng và
          đánh giá.
        </p>
      </div>

      {mutation.isError ? (
        <Alert tone="danger" className="mt-5">
          {getErrorMessage(mutation.error)}
        </Alert>
      ) : null}

      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate({
            ...values,
            phoneNumber: values.phoneNumber || undefined,
          }),
        )}
      >
        <TextInput
          label="Họ và tên"
          autoComplete="name"
          error={form.formState.errors.fullName?.message}
          {...form.register("fullName")}
        />
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />
        <TextInput
          label="Số điện thoại"
          autoComplete="tel"
          error={form.formState.errors.phoneNumber?.message}
          {...form.register("phoneNumber")}
        />
        <TextInput
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          <UserPlus size={16} aria-hidden="true" />
          {mutation.isPending ? "Đang tạo tài khoản..." : "Đăng ký"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link className="font-medium text-primary-700" to="/login">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
