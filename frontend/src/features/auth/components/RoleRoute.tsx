import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { useAuthStore } from "@/stores/auth.store";
import type { AppRole } from "@/types/domain";
import { authApi } from "../api";
import { ProtectedRoute } from "./ProtectedRoute";

type RoleRouteProps = {
  allowedRoles: AppRole[];
  children: ReactNode;
};

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);
  const isSessionLoading = useAuthStore((state) => state.isSessionLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const roleToCheck = user?.roles.find((role) => allowedRoles.includes(role));
  const roleCheckQuery = useQuery({
    queryKey: ["auth", "role-check", roleToCheck],
    queryFn: () => authApi.roleCheck(roleToCheck as AppRole),
    enabled: Boolean(roleToCheck) && !isSessionLoading,
    retry: false,
  });

  useEffect(() => {
    if (roleCheckQuery.data?.user) {
      setUser(roleCheckQuery.data.user);
    }
  }, [roleCheckQuery.data?.user, setUser]);

  return (
    <ProtectedRoute>
      {isSessionLoading ||
      roleCheckQuery.isLoading ||
      roleCheckQuery.isFetching ? (
        <LoadingScreen label="Đang kiểm tra quyền truy cập..." />
      ) : !roleToCheck || roleCheckQuery.isError ? (
        <Navigate to="/forbidden" replace />
      ) : (
        children
      )}
    </ProtectedRoute>
  );
}
