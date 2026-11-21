import {
  createEntityAdapter,
  createSelector,
  createSlice,
  type EntityState,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FEE_CENTS } from '../../shared/config';
import { vatPortion, type Cents } from '../../shared/utils/money';
import type { Product } from '../products/types';

/**
 * A cart line keeps a snapshot of the product fields it needs. That keeps the cart
 * independent of whichever product page happens to be cached, and lets it rehydrate from
 * storage without a network call.
 */
export interface CartItem {
  productId: number;
  title: string;
  thumbnail: string;
  unitPriceCents: Cents;
  quantity: number;
  /** Upper bound for quantity (available stock at the time it was added). */
  maxQuantity: number;
}

export const cartAdapter = createEntityAdapter({
  selectId: (item: CartItem) => item.productId,
});

export type CartState = EntityState<CartItem, number>;

export const initialCartState: CartState = cartAdapter.getInitialState();

/** At least one, never more than stock, and never more than a sane cap. */
const MAX_PER_LINE = 99;
const clampQuantity = (quantity: number, max: number): number =>
  Math.max(1, Math.min(Math.floor(quantity), Math.min(max, MAX_PER_LINE)));

const cartSlice = createSlice({
  name: 'cart',
  initialState: initialCartState,
  reducers: {
    itemAdded(state, action: PayloadAction<{ product: Product; quantity?: number }>) {
      const { product, quantity = 1 } = action.payload;
      const maxQuantity = Math.max(1, product.stock);
      const existing = state.entities[product.id];
      if (existing) {
        existing.quantity = clampQuantity(existing.quantity + quantity, existing.maxQuantity);
        return;
      }
      cartAdapter.addOne(state, {
        productId: product.id,
        title: product.title,
        thumbnail: product.thumbnail,
        unitPriceCents: product.priceCents,
        quantity: clampQuantity(quantity, maxQuantity),
        maxQuantity,
      });
    },
    quantityChanged(state, action: PayloadAction<{ productId: number; quantity: number }>) {
      const { productId, quantity } = action.payload;
      const item = state.entities[productId];
      if (!item) return;
      if (quantity <= 0) {
        cartAdapter.removeOne(state, productId);
        return;
      }
      item.quantity = clampQuantity(quantity, item.maxQuantity);
    },
    itemRemoved(state, action: PayloadAction<number>) {
      cartAdapter.removeOne(state, action.payload);
    },
    cartCleared() {
      return initialCartState;
    },
  },
});

export const { itemAdded, quantityChanged, itemRemoved, cartCleared } = cartSlice.actions;
export const cartReducer = cartSlice.reducer;
export const cartActions = cartSlice.actions;

// ---- Selectors -------------------------------------------------------------------------

type StateWithCart = { cart: CartState };

const adapterSelectors = cartAdapter.getSelectors<StateWithCart>((state) => state.cart);

export const selectCartItems = adapterSelectors.selectAll;
export const selectCartItemById = adapterSelectors.selectById;
export const selectCartLineCount = adapterSelectors.selectTotal;

/** Total units (what the cart badge shows). */
export const selectCartCount = createSelector([selectCartItems], (items) =>
  items.reduce((sum, item) => sum + item.quantity, 0),
);

export const selectQuantityInCart = (state: StateWithCart, productId: number): number =>
  state.cart.entities[productId]?.quantity ?? 0;

export interface CartTotals {
  subtotalCents: Cents;
  shippingCents: Cents;
  totalCents: Cents;
  vatCents: Cents;
  /** How much more to spend for free shipping; 0 once reached. */
  freeShippingRemainingCents: Cents;
}

export const calculateTotals = (items: readonly CartItem[]): CartTotals => {
  const subtotalCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  const qualifies = subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const shippingCents = qualifies ? 0 : SHIPPING_FEE_CENTS;
  const totalCents = subtotalCents + shippingCents;
  return {
    subtotalCents,
    shippingCents,
    totalCents,
    vatCents: vatPortion(totalCents),
    freeShippingRemainingCents: Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents),
  };
};

export const selectCartTotals = createSelector([selectCartItems], calculateTotals);
