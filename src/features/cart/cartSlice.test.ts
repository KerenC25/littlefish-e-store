import { product } from '../../test/fixtures';
import {
  calculateTotals,
  cartCleared,
  cartReducer,
  initialCartState,
  itemAdded,
  itemRemoved,
  quantityChanged,
  selectCartCount,
  selectCartItems,
  selectCartTotals,
  type CartState,
} from './cartSlice';

const reduce = (...actions: Parameters<typeof cartReducer>[1][]): CartState =>
  actions.reduce(cartReducer, initialCartState);

describe('cartSlice', () => {
  const tea = product({ id: 1, title: 'Tea', price: 10, stock: 3 });
  const tongs = product({ id: 2, title: 'Tongs', price: 20, stock: 10 });

  it('adds items as normalised entities', () => {
    const state = reduce(itemAdded({ product: tea }), itemAdded({ product: tongs, quantity: 2 }));
    expect(state.ids).toEqual([1, 2]);
    expect(state.entities[2]).toMatchObject({ title: 'Tongs', quantity: 2, unitPriceCents: 370_00 });
  });

  it('merges repeat adds into one line and never exceeds stock', () => {
    const state = reduce(itemAdded({ product: tea }), itemAdded({ product: tea, quantity: 10 }));
    expect(state.ids).toHaveLength(1);
    expect(state.entities[1]?.quantity).toBe(3);
  });

  it('changes quantity, clamping to stock, and removes at zero', () => {
    let state = reduce(itemAdded({ product: tongs }));
    state = cartReducer(state, quantityChanged({ productId: 2, quantity: 50 }));
    expect(state.entities[2]?.quantity).toBe(10);
    state = cartReducer(state, quantityChanged({ productId: 2, quantity: 0 }));
    expect(state.ids).toEqual([]);
  });

  it('ignores quantity changes for unknown items', () => {
    const state = cartReducer(initialCartState, quantityChanged({ productId: 99, quantity: 2 }));
    expect(state).toBe(initialCartState);
  });

  it('removes and clears', () => {
    let state = reduce(itemAdded({ product: tea }), itemAdded({ product: tongs }));
    state = cartReducer(state, itemRemoved(1));
    expect(state.ids).toEqual([2]);
    expect(cartReducer(state, cartCleared())).toEqual(initialCartState);
  });

  describe('selectors', () => {
    it('counts units, not lines', () => {
      const cart = reduce(itemAdded({ product: tea, quantity: 2 }), itemAdded({ product: tongs, quantity: 3 }));
      expect(selectCartCount({ cart })).toBe(5);
    });

    it('memoises derived data', () => {
      const cart = reduce(itemAdded({ product: tea }));
      const state = { cart };
      expect(selectCartItems(state)).toBe(selectCartItems(state));
      expect(selectCartTotals(state)).toBe(selectCartTotals(state));
    });
  });

  describe('calculateTotals', () => {
    it('charges delivery below the free-shipping threshold', () => {
      const items = reduce(itemAdded({ product: tea })); // R185
      const totals = calculateTotals(selectCartItems({ cart: items }));
      expect(totals).toMatchObject({ subtotalCents: 185_00, shippingCents: 99_00, totalCents: 284_00 });
      expect(totals.freeShippingRemainingCents).toBe(815_00);
    });

    it('ships free at or above the threshold, and VAT is included', () => {
      const items = reduce(itemAdded({ product: tongs, quantity: 3 })); // R1110
      const totals = calculateTotals(selectCartItems({ cart: items }));
      expect(totals.shippingCents).toBe(0);
      expect(totals.totalCents).toBe(1_110_00);
      expect(totals.vatCents).toBe(144_78);
    });

    it('charges nothing for an empty cart', () => {
      expect(calculateTotals([]).totalCents).toBe(0);
    });
  });
});
