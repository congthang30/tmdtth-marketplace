import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';
import { CatalogPage } from '@/features/catalog/pages/CatalogPage';
import { ProductDetailPage } from '@/features/catalog/pages/ProductDetailPage';
import { AddressesPage } from '@/features/account/pages/AddressesPage';
import { CartPage } from '@/features/cart/pages/CartPage';
import { CheckoutPage } from '@/features/checkout/pages/CheckoutPage';
import { OrderDetailPage } from '@/features/orders/pages/OrderDetailPage';
import { OrdersPage } from '@/features/orders/pages/OrdersPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ProfilePage } from '@/features/auth/pages/ProfilePage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { RoleRoute } from '@/features/auth/components/RoleRoute';
import { SellerDashboardPage } from '@/features/seller/pages/SellerDashboardPage';
import { SellerShopRegisterPage } from '@/features/seller/pages/SellerShopRegisterPage';
import { SellerProductsPage } from '@/features/seller/pages/SellerProductsPage';
import { SellerProductFormPage } from '@/features/seller/pages/SellerProductFormPage';
import { SellerProductVariantsPage } from '@/features/seller/pages/SellerProductVariantsPage';
import { SellerProductImagesPage } from '@/features/seller/pages/SellerProductImagesPage';
import { SellerProductInventoryPage } from '@/features/seller/pages/SellerProductInventoryPage';
import { SellerOrdersPage } from '@/features/seller/pages/SellerOrdersPage';
import { SellerOrderDetailPage } from '@/features/seller/pages/SellerOrderDetailPage';
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage';
import { AdminCategoriesPage } from '@/features/admin/pages/AdminCategoriesPage';
import { AdminShopsPage } from '@/features/admin/pages/AdminShopsPage';
import { AdminShippingCompaniesPage } from '@/features/admin/pages/AdminShippingCompaniesPage';
import { AdminShippingServicesPage } from '@/features/admin/pages/AdminShippingServicesPage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <CatalogPage />,
      },
      {
        path: 'products',
        element: <CatalogPage />,
      },
      {
        path: 'products/:slug',
        element: <ProductDetailPage />,
      },
      {
        path: 'cart',
        element: (
          <ProtectedRoute>
            <CartPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'checkout',
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'forbidden',
        element: (
          <PlaceholderPage
            eyebrow="403"
            title="Access denied"
            description="Your account does not have permission to open this area."
          />
        ),
      },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: (
          <PlaceholderPage
            eyebrow="Workspace"
            title="Dashboard"
            description="Role-aware dashboards and navigation are added after auth is wired."
          />
        ),
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'addresses',
        element: <AddressesPage />,
      },
      {
        path: 'orders',
        element: <OrdersPage />,
      },
      {
        path: 'orders/:id',
        element: <OrderDetailPage />,
      },
      {
        path: 'seller',
        element: (
          <RoleRoute allowedRoles={['Seller']}>
            <SellerDashboardPage />
          </RoleRoute>
        ),
      },
      {
        path: 'seller/shop/register',
        element: (
          <RoleRoute allowedRoles={['Seller']}>
            <SellerShopRegisterPage />
          </RoleRoute>
        ),
      },
      {
        path: 'seller/products',
        element: (
          <RoleRoute allowedRoles={['Seller']}>
            <SellerProductsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'seller/products/create',
        element: (
          <RoleRoute allowedRoles={['Seller']}>
            <SellerProductFormPage />
          </RoleRoute>
        ),
      },
      {
        path: 'seller/products/:id/edit',
        element: (
          <RoleRoute allowedRoles={['Seller']}>
            <SellerProductFormPage />
          </RoleRoute>
        ),
      },
      {
        path: 'seller/products/:id/variants',
        element: (
          <RoleRoute allowedRoles={['Seller']}>
            <SellerProductVariantsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'seller/products/:id/images',
        element: (
          <RoleRoute allowedRoles={['Seller']}>
            <SellerProductImagesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'seller/products/:id/inventory',
        element: (
          <RoleRoute allowedRoles={['Seller']}>
            <SellerProductInventoryPage />
          </RoleRoute>
        ),
      },
      {
        path: 'seller/orders',
        element: (
          <RoleRoute allowedRoles={['Seller']}>
            <SellerOrdersPage />
          </RoleRoute>
        ),
      },
      {
        path: 'seller/orders/:id',
        element: (
          <RoleRoute allowedRoles={['Seller']}>
            <SellerOrderDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <RoleRoute allowedRoles={['Admin']}>
            <AdminDashboardPage />
          </RoleRoute>
        ),
      },
      {
        path: 'admin/categories',
        element: (
          <RoleRoute allowedRoles={['Admin']}>
            <AdminCategoriesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'admin/shops',
        element: (
          <RoleRoute allowedRoles={['Admin']}>
            <AdminShopsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'admin/shipping/companies',
        element: (
          <RoleRoute allowedRoles={['Admin']}>
            <AdminShippingCompaniesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'admin/shipping/services',
        element: (
          <RoleRoute allowedRoles={['Admin']}>
            <AdminShippingServicesPage />
          </RoleRoute>
        ),
      },
    ],
  },
  {
    path: 'not-found',
    element: (
      <PlaceholderPage
        eyebrow="404"
        title="Page not found"
        description="The requested screen is not available."
      />
    ),
  },
  {
    path: '*',
    element: <Navigate to="/not-found" replace />,
  },
]);
