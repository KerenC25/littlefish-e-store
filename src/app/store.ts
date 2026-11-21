import { combineReducers, configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from '../services/api';
import { cartActions, cartReducer } from '../features/cart/cartSlice';
import { loadCart, saveCart } from '../features/cart/cartPersistence';
import { authReducer, credentialsReceived, loggedOut, tokensRefreshed } from '../features/auth/authSlice';
import { loadAuth, saveAuth } from '../features/auth/authPersistence';
import { catalogReducer } from '../features/products/catalogSlice';
import { couponActions, couponReducer } from '../features/coupons/couponSlice';
import { ordersActions, ordersReducer } from '../features/orders/ordersSlice';
import { demoEmailTransport, outboxActions, outboxReducer, type ThunkServices } from '../features/email/outboxSlice';
import type { EmailTransport } from '../features/email/types';
import { newsletterActions, newsletterReducer } from '../features/newsletter/newsletterSlice';
import { safeLocalStorage, safeSessionStorage } from '../shared/utils/storage';
import {
  loadCoupon,
  loadNewsletter,
  loadOrders,
  loadOutbox,
  saveCoupon,
  saveNewsletter,
  saveOrders,
  saveOutbox,
} from './persistence';

const rootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  cart: cartReducer,
  coupon: couponReducer,
  orders: ordersReducer,
  outbox: outboxReducer,
  newsletter: newsletterReducer,
  auth: authReducer,
  catalog: catalogReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export interface StoreOptions {
  preloadedState?: Partial<RootState>;
  /**
   * Durable storage (localStorage by default) for cart, coupon, orders, demo inbox and
   * newsletter. Injected so tests (and SSR) can supply fakes instead of touching real storage.
   */
  durableStorage?: Storage;
  /** Session storage for the auth refresh token. */
  authStorage?: Storage;
  /** Outbound email port. Defaults to the demo transport (in-app inbox). */
  emailTransport?: EmailTransport;
  /** Absolute app root URL, used for links in emails. */
  appUrl?: string;
}

const defaultAppUrl = () => (typeof window === 'undefined' ? 'http://localhost/' : `${window.location.origin}/`);

export const makeStore = ({
  preloadedState,
  durableStorage = safeLocalStorage(),
  authStorage = safeSessionStorage(),
  emailTransport = demoEmailTransport,
  appUrl = defaultAppUrl(),
}: StoreOptions = {}) => {
  // Side effects (persistence) live in listeners, keeping reducers pure.
  const listener = createListenerMiddleware();
  /** Save one slice to durable storage after any of that slice's own actions. */
  const persist = <K extends keyof RootState>(
    actions: Record<string, { match: (action: unknown) => boolean }>,
    key: K,
    save: (storage: Storage | undefined, state: RootState[K]) => void,
  ) => {
    const matchers = Object.values(actions);
    listener.startListening({
      predicate: (action) => matchers.some((m) => m.match(action)),
      effect: (_action, { getState }) => save(durableStorage, (getState() as RootState)[key]),
    });
  };

  persist(cartActions, 'cart', saveCart);
  persist(couponActions, 'coupon', saveCoupon);
  persist(ordersActions, 'orders', saveOrders);
  persist(outboxActions, 'outbox', saveOutbox);
  persist(newsletterActions, 'newsletter', saveNewsletter);

  listener.startListening({
    matcher: isAnyOf(credentialsReceived, tokensRefreshed, loggedOut),
    effect: (_action, { getState }) => saveAuth(authStorage, (getState() as RootState).auth),
  });

  const services: ThunkServices = { emailTransport, appUrl };

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      cart: loadCart(durableStorage),
      coupon: loadCoupon(durableStorage),
      orders: loadOrders(durableStorage),
      outbox: loadOutbox(durableStorage),
      newsletter: loadNewsletter(durableStorage),
      auth: loadAuth(authStorage),
      ...preloadedState,
    },
    middleware: (getDefault) =>
      getDefault({ thunk: { extraArgument: services } })
        .prepend(listener.middleware)
        .concat(api.middleware),
  });

  // Enables refetchOnFocus / refetchOnReconnect behaviour.
  setupListeners(store.dispatch);
  return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
