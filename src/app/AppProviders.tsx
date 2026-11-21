import { useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { NotificationsProvider } from '../shared/notifications/NotificationsContext';
import { PaymentGatewayProvider } from '../features/checkout/payment/PaymentGatewayContext';
import { createMockPaymentGateway } from '../features/checkout/payment/mockPaymentGateway';
import type { PaymentGateway } from '../features/checkout/payment/PaymentGateway';
import { SessionBootstrap } from '../features/auth/components/SessionBootstrap';
import { makeStore, type AppStore } from './store';
import { theme } from './theme';

interface AppProvidersProps {
  children: ReactNode;
  /** Injectable for tests; production builds its own once. */
  store?: AppStore;
  paymentGateway?: PaymentGateway;
}

/** Composition root: every cross-cutting dependency is wired here and nowhere else. */
export const AppProviders = ({ children, store: injectedStore, paymentGateway }: AppProvidersProps) => {
  const [store] = useState(() => injectedStore ?? makeStore());
  const [gateway] = useState(() => paymentGateway ?? createMockPaymentGateway());

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationsProvider>
          <PaymentGatewayProvider gateway={gateway}>
            <SessionBootstrap />
            {children}
          </PaymentGatewayProvider>
        </NotificationsProvider>
      </ThemeProvider>
    </Provider>
  );
};
