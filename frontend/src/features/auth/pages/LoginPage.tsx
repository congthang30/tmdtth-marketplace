import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { getErrorMessage } from "@/services/errors";
import { useAuthStore } from "@/stores/auth.store";
import { authApi } from "../api";
import { getAuthenticatedHome } from "../navigation";

const loginSchema = z.object({
  email: z.string().trim().email("Vui lòng nhập địa chỉ email hợp lệ"),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LocationState = {
  from?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuth = useAuthStore((state) => state.setAuth);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth({ accessToken: data.accessToken, user: data.user });
      const state = location.state as LocationState | null;
      navigate(state?.from ?? getAuthenticatedHome(data.user), { replace: true });
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
          Đăng nhập
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Chào mừng Bạn trở lại</h1>
        <p className="mt-2 text-sm text-muted">
          Sử dụng tài khoản đã đăng ký để truy cập các chức năng phù hợp với vai
          trò.
        </p>
      </div>

      {mutation.isError ? (
        <Alert tone="danger" className="mt-5">
          {getErrorMessage(mutation.error)}
        </Alert>
      ) : null}

      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />
        <TextInput
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          <LogIn size={16} aria-hidden="true" />
          {mutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Chưa có tài khoản?{" "}
        <Link className="font-medium text-primary-700" to="/register">
          Đăng ký ngay
        </Link>
      </p>
    </div>
  );
}
