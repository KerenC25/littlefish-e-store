import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '../app/AppProviders';
import { routerFuture } from '../app/routerFuture';
import { makeStore, type RootState } from '../app/store';
import { createMockPaymentGateway } from '../features/checkout/payment/mockPaymentGateway';
import type { PaymentGateway } from '../features/checkout/payment/PaymentGateway';
import type { EmailTransport } from '../features/email/types';
import { createMemoryStorage } from './memoryStorage';

interface Options {
  route?: string | { pathname: string; state?: unknown };
  preloadedState?: Partial<RootState>;
  durableStorage?: Storage;
  authStorage?: Storage;
  paymentGateway?: PaymentGateway;
  emailTransport?: EmailTransport;
}

export const TEST_APP_URL = 'https://shop.example.test/littlefish-e-store/';

/** Renders with the real store, theme, contexts and router: integration, not shallow. */
export const renderWithProviders = (
  ui: ReactElement,
  {
    route = '/',
    preloadedState,
    durableStorage = createMemoryStorage(),
    authStorage = createMemoryStorage(),
    paymentGateway = createMockPaymentGateway({ latencyMs: 0 }),
    emailTransport,
  }: Options = {},
) => {
  const store = makeStore({ preloadedState, durableStorage, authStorage, emailTransport, appUrl: TEST_APP_URL });
  const user = userEvent.setup();
  const result = render(
    <AppProviders store={store} paymentGateway={paymentGateway}>
      <MemoryRouter initialEntries={[route]} future={routerFuture}>
        {ui}
      </MemoryRouter>
    </AppProviders>,
  );
  return { ...result, store, user, durableStorage, authStorage };
};
