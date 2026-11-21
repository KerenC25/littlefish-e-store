import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout';
import { RequireAuth } from '../features/auth/components/RequireAuth';
import { ProductsPage } from '../features/products/ProductsPage';

// The landing page ships in the main bundle; everything else is loaded on demand.
const ProductDetailPage = lazy(() => import('../features/products/ProductDetailPage'));
const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const CheckoutPage = lazy(() => import('../features/checkout/CheckoutPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

export const AppRoutes = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<ProductsPage />} />
      <Route path="products/:productId" element={<ProductDetailPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route
        path="checkout"
        element={
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
