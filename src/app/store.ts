import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  isAnyOf,
} from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from '../services/api';
import { cartActions, cartReducer } from '../features/cart/cartSlice';
import { loadCart, saveCart } from '../features/cart/cartPersistence';
import {
  authReducer,
  credentialsReceived,
  loggedOut,
  tokensRefreshed,
} from '../features/auth/authSlice';
import { loadAuth, saveAuth } from '../features/auth/authPersistence';
import { catalogReducer } from '../features/products/catalogSlice';
import { safeLocalStorage, safeSessionStorage } from '../shared/utils/storage';

const rootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  cart: cartReducer,
  auth: authReducer,
  catalog: catalogReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export interface StoreOptions {
  preloadedState?: Partial<RootState>;
  /** Injected so tests (and SSR) can supply fakes instead of touching real storage. */
  cartStorage?: Storage;
  authStorage?: Storage;
}

export const makeStore = ({
  preloadedState,
  cartStorage = safeLocalStorage(),
  authStorage = safeSessionStorage(),
}: StoreOptions = {}) => {
  // Side effects (persistence) live in listeners, keeping reducers pure.
  const listener = createListenerMiddleware();

  listener.startListening({
    matcher: isAnyOf(...Object.values(cartActions)),
    effect: (_action, { getState }) => saveCart(cartStorage, (getState() as RootState).cart),
  });

  listener.startListening({
    matcher: isAnyOf(credentialsReceived, tokensRefreshed, loggedOut),
    effect: (_action, { getState }) => saveAuth(authStorage, (getState() as RootState).auth),
  });

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      cart: loadCart(cartStorage),
      auth: loadAuth(authStorage),
      ...preloadedState,
    },
    middleware: (getDefault) => getDefault().prepend(listener.middleware).concat(api.middleware),
  });

  // Enables refetchOnFocus / refetchOnReconnect behaviour.
  setupListeners(store.dispatch);
  return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
