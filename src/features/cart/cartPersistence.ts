import type { CartItem, CartState } from './cartSlice';
import { cartAdapter } from './cartSlice';
import { STORAGE_KEYS } from '../../shared/config';
import { readJson, writeJson } from '../../shared/utils/storage';

/** What we persist: a flat list is simpler to validate than the normalised shape. */
interface PersistedCart {
  version: 1;
  items: CartItem[];
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isCartItem = (v: unknown): v is CartItem => {
  if (typeof v !== 'object' || v === null) return false;
  const i = v as Record<string, unknown>;
  return (
    isFiniteNumber(i.productId) &&
    typeof i.title === 'string' &&
    typeof i.thumbnail === 'string' &&
    isFiniteNumber(i.unitPriceCents) &&
    i.unitPriceCents >= 0 &&
    isFiniteNumber(i.quantity) &&
    i.quantity >= 1 &&
    isFiniteNumber(i.maxQuantity) &&
    i.maxQuantity >= 1
  );
};

const isPersistedCart = (v: unknown): v is PersistedCart =>
  typeof v === 'object' &&
  v !== null &&
  (v as PersistedCart).version === 1 &&
  Array.isArray((v as PersistedCart).items) &&
  (v as PersistedCart).items.every(isCartItem);

/** Returns a cart state from storage, or `undefined` if absent or tampered with. */
export const loadCart = (storage: Storage | undefined): CartState | undefined => {
  const persisted = readJson(storage, STORAGE_KEYS.cart, isPersistedCart);
  if (!persisted) return undefined;
  return cartAdapter.setAll(
    cartAdapter.getInitialState(),
    persisted.items.map((item) => ({
      ...item,
      quantity: Math.min(Math.floor(item.quantity), item.maxQuantity),
    })),
  );
};

export const saveCart = (storage: Storage | undefined, cart: CartState): void => {
  const items = cart.ids.map((id) => cart.entities[id]).filter((i): i is CartItem => i !== undefined);
  writeJson(storage, STORAGE_KEYS.cart, { version: 1, items } satisfies PersistedCart);
};
