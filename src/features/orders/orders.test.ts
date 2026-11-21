import { makeStore } from '../../app/store';
import { STORAGE_KEYS } from '../../shared/config';
import { createMemoryStorage } from '../../test/memoryStorage';
import { order } from '../../test/fixtures';
import { orderConfirmationEmail } from '../email/templates';
import { findOrderForLookup, MAX_STORED_ORDERS, orderPlaced, selectAllOrders, selectOrderByReference, selectOrdersForUser } from './ordersSlice';
import { trackOrder } from './tracking';

const minutes = (n: number) => n * 60_000;

describe('trackOrder', () => {
  const placedAt = new Date('2026-11-20T10:00:00Z');
  const at = (m: number) => trackOrder(placedAt, new Date(placedAt.getTime() + minutes(m)));

  it.each([
    [0, 'placed'],
    [1.9, 'placed'],
    [2, 'packed'],
    [10, 'out-for-delivery'],
    [44, 'out-for-delivery'],
    [45, 'delivered'],
    [60 * 24, 'delivered'],
  ])('after %s minutes the order is %s', (m, status) => {
    expect(at(m).status).toBe(status);
  });

  it('marks earlier steps done, exactly one current, and reports progress', () => {
    const view = at(10);
    expect(view.steps.map((s) => s.done)).toEqual([true, true, true, false]);
    expect(view.steps.filter((s) => s.current).map((s) => s.status)).toEqual(['out-for-delivery']);
    expect(view.progress).toBeCloseTo(10 / 45);
    expect(view.deliveryAt.toISOString()).toBe('2026-11-20T10:45:00.000Z');
  });

  it('treats a clock before the order time as "placed"', () => {
    expect(at(-5)).toMatchObject({ status: 'placed', progress: 0 });
  });
});

describe('orders slice', () => {
  const newStore = (durableStorage = createMemoryStorage()) =>
    makeStore({ durableStorage, authStorage: createMemoryStorage() });

  it('stores orders newest first and looks them up case-insensitively', () => {
    const store = newStore();
    store.dispatch(orderPlaced(order({ reference: 'LFM-OLD00001', placedAt: '2026-11-19T10:00:00Z' })));
    store.dispatch(orderPlaced(order({ reference: 'LFM-NEW00002', placedAt: '2026-11-20T10:00:00Z' })));
    expect(selectAllOrders(store.getState()).map((o) => o.reference)).toEqual(['LFM-NEW00002', 'LFM-OLD00001']);
    expect(selectOrderByReference(store.getState(), ' lfm-old00001 ')?.reference).toBe('LFM-OLD00001');
  });

  it('filters order history by user', () => {
    const store = newStore();
    store.dispatch(orderPlaced(order({ reference: 'LFM-A', userId: 1 })));
    store.dispatch(orderPlaced(order({ reference: 'LFM-B', userId: 2 })));
    expect(selectOrdersForUser(store.getState(), 1).map((o) => o.reference)).toEqual(['LFM-A']);
    expect(selectOrdersForUser(store.getState(), undefined)).toEqual([]);
  });

  it('caps stored history', () => {
    const store = newStore();
    for (let i = 0; i < MAX_STORED_ORDERS + 5; i++) {
      store.dispatch(orderPlaced(order({ reference: `LFM-${i}`, placedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() })));
    }
    expect(selectAllOrders(store.getState())).toHaveLength(MAX_STORED_ORDERS);
    expect(selectOrderByReference(store.getState(), 'LFM-0')).toBeUndefined(); // oldest dropped
  });

  it('persists orders across sessions and drops tampered entries', () => {
    const storage = createMemoryStorage();
    newStore(storage).dispatch(orderPlaced(order({ reference: 'LFM-KEEP' })));
    expect(selectOrderByReference(newStore(storage).getState(), 'LFM-KEEP')).toBeDefined();

    storage.setItem(STORAGE_KEYS.orders, JSON.stringify({ version: 1, data: [{ reference: 'LFM-BAD', totals: 'free' }] }));
    expect(selectAllOrders(newStore(storage).getState())).toEqual([]);
  });

  it('requires both reference and email to match for guest lookup', () => {
    const orders = [order({ reference: 'LFM-ABC', email: 'Thandi@Example.test' })];
    expect(findOrderForLookup(orders, 'lfm-abc', ' thandi@example.test ')?.reference).toBe('LFM-ABC');
    expect(findOrderForLookup(orders, 'LFM-ABC', 'someone@else.test')).toBeUndefined();
    expect(findOrderForLookup(orders, 'LFM-XYZ', 'thandi@example.test')).toBeUndefined();
  });
});

describe('orderConfirmationEmail', () => {
  it('summarises the order with totals, coupon, address and an absolute tracking link', () => {
    const email = orderConfirmationEmail(
      order({
        reference: 'LFM-1A2B3C4D',
        customerName: 'Thandi Nkosi',
        totals: { subtotalCents: 400_00, discountCents: 40_00, shippingCents: 99_00, totalCents: 459_00, vatCents: 59_87, couponCode: 'LEKKER10' },
      }),
      'https://shop.example.test/littlefish-e-store/',
    );
    expect(email).toMatchObject({ kind: 'order-confirmation', to: 'thandi@example.test', action: { path: '/orders/LFM-1A2B3C4D' } });
    expect(email.subject).toContain('LFM-1A2B3C4D');
    expect(email.body).toMatch(/^Howzit Thandi,/);
    expect(email.body.replace(/\s/g, ' ')).toMatch(/Coupon LEKKER10\s+-R\s?40,00/);
    expect(email.body).toContain('https://shop.example.test/littlefish-e-store/orders/LFM-1A2B3C4D');
    expect(email.body).toContain('1 Long Street');
  });
});
