import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '../app/AppProviders';
import { routerFuture } from '../app/routerFuture';
import { makeStore, type RootState } from '../app/store';
import { createMockPaymentGateway } from '../features/checkout/payment/mockPaymentGateway';
import type { PaymentGateway } from '../features/checkout/payment/PaymentGateway';
import { createMemoryStorage } from './memoryStorage';

interface Options {
  route?: string;
  preloadedState?: Partial<RootState>;
  cartStorage?: Storage;
  authStorage?: Storage;
  paymentGateway?: PaymentGateway;
}

/** Renders with the real store, theme, contexts and router: integration, not shallow. */
export const renderWithProviders = (
  ui: ReactElement,
  {
    route = '/',
    preloadedState,
    cartStorage = createMemoryStorage(),
    authStorage = createMemoryStorage(),
    paymentGateway = createMockPaymentGateway({ latencyMs: 0 }),
  }: Options = {},
) => {
  const store = makeStore({ preloadedState, cartStorage, authStorage });
  const user = userEvent.setup();
  const result = render(
    <AppProviders store={store} paymentGateway={paymentGateway}>
      <MemoryRouter initialEntries={[route]} future={routerFuture}>
        {ui}
      </MemoryRouter>
    </AppProviders>,
  );
  return { ...result, store, user, cartStorage, authStorage };
};
