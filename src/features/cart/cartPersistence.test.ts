import { makeStore } from '../../app/store';
import { STORAGE_KEYS } from '../../shared/config';
import { createMemoryStorage } from '../../test/memoryStorage';
import { product } from '../../test/fixtures';
import { loadCart } from './cartPersistence';
import { itemAdded, selectCartCount } from './cartSlice';

describe('cart persistence', () => {
  it('saves the cart to storage on every cart action (listener middleware)', () => {
    const durableStorage = createMemoryStorage();
    const store = makeStore({ durableStorage, authStorage: createMemoryStorage() });

    store.dispatch(itemAdded({ product: product({ id: 7, stock: 5 }), quantity: 2 }));

    const saved = JSON.parse(durableStorage.getItem(STORAGE_KEYS.cart) ?? 'null');
    expect(saved.version).toBe(1);
    expect(saved.items).toEqual([expect.objectContaining({ productId: 7, quantity: 2 })]);
  });

  it('rehydrates the cart in a new session', () => {
    const durableStorage = createMemoryStorage();
    makeStore({ durableStorage, authStorage: createMemoryStorage() }).dispatch(
      itemAdded({ product: product({ id: 7, stock: 5 }), quantity: 3 }),
    );

    const nextSession = makeStore({ durableStorage, authStorage: createMemoryStorage() });
    expect(selectCartCount(nextSession.getState())).toBe(3);
  });

  it.each([
    ['invalid JSON', '{not json'],
    ['wrong version', JSON.stringify({ version: 2, items: [] })],
    ['negative price', JSON.stringify({ version: 1, items: [{ productId: 1, title: 'x', thumbnail: '', unitPriceCents: -1, quantity: 1, maxQuantity: 1 }] })],
    ['wrong types', JSON.stringify({ version: 1, items: [{ productId: '1' }] })],
  ])('ignores tampered storage (%s)', (_label, raw) => {
    expect(loadCart(createMemoryStorage({ [STORAGE_KEYS.cart]: raw }))).toBeUndefined();
  });

  it('survives storage that throws', () => {
    const broken = createMemoryStorage();
    broken.getItem = () => {
      throw new Error('SecurityError');
    };
    broken.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const store = makeStore({ durableStorage: broken, authStorage: createMemoryStorage() });
    expect(() => store.dispatch(itemAdded({ product: product() }))).not.toThrow();
  });
});
