import { createEntityAdapter, createSelector, createSlice, type EntityState, type PayloadAction } from '@reduxjs/toolkit';
import { normaliseEmail } from '../../shared/utils/validation';
import type { UserId } from '../auth/types';
import type { Order } from './types';

/** Newest first. Keyed by order reference. */
export const ordersAdapter = createEntityAdapter({
  selectId: (order: Order) => order.reference,
  sortComparer: (a: Order, b: Order) => b.placedAt.localeCompare(a.placedAt),
});

export type OrdersState = EntityState<Order, string>;
export const initialOrdersState: OrdersState = ordersAdapter.getInitialState();

/** Keep local history bounded; a real store would page this from the server. */
export const MAX_STORED_ORDERS = 50;

const ordersSlice = createSlice({
  name: 'orders',
  initialState: initialOrdersState,
  reducers: {
    orderPlaced(state, action: PayloadAction<Order>) {
      ordersAdapter.addOne(state, action.payload);
      const overflow = state.ids.slice(MAX_STORED_ORDERS);
      if (overflow.length > 0) ordersAdapter.removeMany(state, overflow);
    },
  },
});

export const { orderPlaced } = ordersSlice.actions;
export const ordersActions = ordersSlice.actions;
export const ordersReducer = ordersSlice.reducer;

type StateWithOrders = { orders: OrdersState };
const selectors = ordersAdapter.getSelectors<StateWithOrders>((s) => s.orders);

export const selectAllOrders = selectors.selectAll;
export const selectOrderByReference = (state: StateWithOrders, reference: string): Order | undefined =>
  selectors.selectById(state, reference.trim().toUpperCase());

export const selectOrdersForUser = createSelector(
  [selectAllOrders, (_state: StateWithOrders, userId: UserId | null | undefined) => userId],
  (orders, userId) => (userId == null ? [] : orders.filter((o) => o.userId === userId)),
);

/**
 * Lookup used by "Track an order". Reference *and* email must match, and a miss returns
 * `undefined` either way, so the form cannot be used to discover which references exist.
 */
export const findOrderForLookup = (
  orders: readonly Order[],
  reference: string,
  email: string,
): Order | undefined => {
  const ref = reference.trim().toUpperCase();
  const mail = normaliseEmail(email);
  return orders.find((o) => o.reference === ref && normaliseEmail(o.email) === mail);
};
