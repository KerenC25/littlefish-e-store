import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout';
import { RequireAuth } from '../features/auth/components/RequireAuth';
import { ProductsPage } from '../features/products/ProductsPage';

// The landing page ships in the main bundle; everything else is loaded on demand.
const ProductDetailPage = lazy(() => import('../features/products/ProductDetailPage'));
const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const CheckoutPage = lazy(() => import('../features/checkout/CheckoutPage'));
const OrdersPage = lazy(() => import('../features/orders/OrdersPage'));
const OrderTrackingPage = lazy(() => import('../features/orders/OrderTrackingPage'));
const TrackOrderPage = lazy(() => import('../features/orders/TrackOrderPage'));
const InboxPage = lazy(() => import('../features/email/InboxPage'));
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
      <Route
        path="orders"
        element={
          <RequireAuth>
            <OrdersPage />
          </RequireAuth>
        }
      />
      {/* Not behind RequireAuth: guests reach it via /track; the page checks access itself. */}
      <Route path="orders/:reference" element={<OrderTrackingPage />} />
      <Route path="track" element={<TrackOrderPage />} />
      <Route path="inbox" element={<InboxPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
