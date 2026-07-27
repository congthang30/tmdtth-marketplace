import { createBrowserRouter, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";
import { CatalogPage } from "@/features/catalog/pages/CatalogPage";
import { ProductDetailPage } from "@/features/catalog/pages/ProductDetailPage";
import { ShopPage } from "@/features/shops/pages/ShopPage";
import { AddressesPage } from "@/features/account/pages/AddressesPage";
import { CartPage } from "@/features/cart/pages/CartPage";
import { CheckoutPage } from "@/features/checkout/pages/CheckoutPage";
import { OrderDetailPage } from "@/features/orders/pages/OrderDetailPage";
import { OrdersPage } from "@/features/orders/pages/OrdersPage";
import { VnpayReturnPage } from "@/features/orders/pages/VnpayReturnPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { ProfilePage } from "@/features/auth/pages/ProfilePage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { RoleRoute } from "@/features/auth/components/RoleRoute";
import { SellerDashboardPage } from "@/features/seller/pages/SellerDashboardPage";
import { SellerShopRegisterPage } from "@/features/seller/pages/SellerShopRegisterPage";
import { SellerProductsPage } from "@/features/seller/pages/SellerProductsPage";
import { SellerProductFormPage } from "@/features/seller/pages/SellerProductFormPage";
import { SellerProductVariantsPage } from "@/features/seller/pages/SellerProductVariantsPage";
import { SellerProductImagesPage } from "@/features/seller/pages/SellerProductImagesPage";
import { SellerProductInventoryPage } from "@/features/seller/pages/SellerProductInventoryPage";
import { SellerOrdersPage } from "@/features/seller/pages/SellerOrdersPage";
import { SellerOrderDetailPage } from "@/features/seller/pages/SellerOrderDetailPage";
import { SellerVouchersPage } from "@/features/seller/pages/SellerVouchersPage";
import { SellerShopCategoriesPage } from "@/features/shops/pages/SellerShopCategoriesPage";
import { SellerSaleCampaignsPage } from "@/features/shops/pages/SellerSaleCampaignsPage";
import { AdminDashboardPage } from "@/features/admin/pages/AdminDashboardPage";
import { AdminCategoriesPage } from "@/features/admin/pages/AdminCategoriesPage";
import { AdminShopsPage } from "@/features/admin/pages/AdminShopsPage";
import { AdminShippingProvidersPage } from "@/features/admin/pages/AdminShippingProvidersPage";
import { AdminVouchersPage } from "@/features/admin/pages/AdminVouchersPage";
import { AdminSellerVerificationsPage } from "@/features/admin-seller-verification/pages/AdminSellerVerificationsPage";
import { AdminSellerVerificationDetailPage } from "@/features/admin-seller-verification/pages/AdminSellerVerificationDetailPage";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <CatalogPage />,
      },
      {
        path: "products",
        element: <CatalogPage />,
      },
      {
        path: "products/:slug",
        element: <ProductDetailPage />,
      },
      {
        path: "shops/:slug",
        element: <ShopPage />,
      },
      {
        path: "cart",
        element: (
          <ProtectedRoute>
            <CartPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "checkout",
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "addresses",
        element: (
          <ProtectedRoute>
            <AddressesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders",
        element: (
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders/:id",
        element: (
          <ProtectedRoute>
            <OrderDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "payments/vnpay/return",
        element: <VnpayReturnPage />,
      },
      {
        path: "seller/shop/register",
        element: (
          <ProtectedRoute>
            <SellerShopRegisterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "forbidden",
        element: (
          <PlaceholderPage
            eyebrow="403"
            title="Không có quyền truy cập"
            description="Tài khoản của Bạn không có quyền mở khu vực này."
          />
        ),
      },
    ],
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: (
          <RoleRoute allowedRoles={["Seller", "Admin"]}>
            <PlaceholderPage
              eyebrow="Khu vực làm việc"
              title="Tổng quan"
              description="Nội dung tổng quan được hiển thị theo vai trò của tài khoản."
            />
          </RoleRoute>
        ),
      },
      {
        path: "seller",
        element: (
          <RoleRoute allowedRoles={["Seller"]}>
            <SellerDashboardPage />
          </RoleRoute>
        ),
      },
      {
        path: "seller/products",
        element: (
          <RoleRoute allowedRoles={["Seller"]}>
            <SellerProductsPage />
          </RoleRoute>
        ),
      },
      {
        path: "seller/products/create",
        element: (
          <RoleRoute allowedRoles={["Seller"]}>
            <SellerProductFormPage />
          </RoleRoute>
        ),
      },
      {
        path: "seller/products/:id/edit",
        element: (
          <RoleRoute allowedRoles={["Seller"]}>
            <SellerProductFormPage />
          </RoleRoute>
        ),
      },
      {
        path: "seller/products/:id/variants",
        element: (
          <RoleRoute allowedRoles={["Seller"]}>
            <SellerProductVariantsPage />
          </RoleRoute>
        ),
      },
      {
        path: "seller/products/:id/images",
        element: (
          <RoleRoute allowedRoles={["Seller"]}>
            <SellerProductImagesPage />
          </RoleRoute>
        ),
      },
      {
        path: "seller/products/:id/inventory",
        element: (
          <RoleRoute allowedRoles={["Seller"]}>
            <SellerProductInventoryPage />
          </RoleRoute>
        ),
      },
      {
        path: "seller/orders",
        element: (
          <RoleRoute allowedRoles={["Seller"]}>
            <SellerOrdersPage />
          </RoleRoute>
        ),
      },
      {
        path: "seller/orders/:id",
        element: (
          <RoleRoute allowedRoles={["Seller"]}>
            <SellerOrderDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: "seller/shop-categories",
        element: (
          <RoleRoute allowedRoles={["Seller"]}>
            <SellerShopCategoriesPage />
          </RoleRoute>
        ),
      },
      {
        path: "seller/sale-campaigns",
        element: (
          <RoleRoute allowedRoles={["Seller"]}>
            <SellerSaleCampaignsPage />
          </RoleRoute>
        ),
      },
      {
        path: "seller/vouchers",
        element: (
          <RoleRoute allowedRoles={["Seller"]}>
            <SellerVouchersPage />
          </RoleRoute>
        ),
      },
      {
        path: "admin",
        element: (
          <RoleRoute allowedRoles={["Admin"]}>
            <AdminDashboardPage />
          </RoleRoute>
        ),
      },
      {
        path: "admin/categories",
        element: (
          <RoleRoute allowedRoles={["Admin"]}>
            <AdminCategoriesPage />
          </RoleRoute>
        ),
      },
      {
        path: "admin/shops",
        element: (
          <RoleRoute allowedRoles={["Admin"]}>
            <AdminShopsPage />
          </RoleRoute>
        ),
      },
      {
        path: "admin/shipping/providers",
        element: (
          <RoleRoute allowedRoles={["Admin"]}>
            <AdminShippingProvidersPage />
          </RoleRoute>
        ),
      },
      {
        path: "admin/vouchers",
        element: (
          <RoleRoute allowedRoles={["Admin"]}>
            <AdminVouchersPage />
          </RoleRoute>
        ),
      },
      {
        path: "admin/seller-verifications",
        element: (
          <RoleRoute allowedRoles={["Admin"]}>
            <AdminSellerVerificationsPage />
          </RoleRoute>
        ),
      },
      {
        path: "admin/seller-verifications/:id",
        element: (
          <RoleRoute allowedRoles={["Admin"]}>
            <AdminSellerVerificationDetailPage />
          </RoleRoute>
        ),
      },

    ],
  },
  {
    path: "not-found",
    element: (
      <PlaceholderPage
        eyebrow="404"
        title="Không tìm thấy trang"
        description="Trang Bạn yêu cầu không tồn tại hoặc không còn khả dụng."
      />
    ),
  },
  {
    path: "*",
    element: <Navigate to="/not-found" replace />,
  },
]);
