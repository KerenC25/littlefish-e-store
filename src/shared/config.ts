/**
 * Central, framework-agnostic configuration.
 *
 * Kept as plain constants (not `import.meta.env`) so the same module runs unchanged
 * under Vite and Jest. Nothing here is secret: DummyJSON is a public API.
 */
export const API_BASE_URL = 'https://dummyjson.com';

/**
 * DummyJSON prices are in USD. We present the store in Rand using a fixed,
 * illustrative rate so totals are deterministic (and testable). A real store would
 * price in ZAR at source rather than converting on the client.
 */
export const USD_TO_ZAR = 18.5;

/** Orders at or above this amount (in ZAR cents) ship free. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 1_000_00;
export const SHIPPING_FEE_CENTS = 99_00;
/** South African VAT rate. Prices are VAT-inclusive, as is standard for SA retail. */
export const VAT_RATE = 0.15;

export const PAGE_SIZE_OPTIONS = [12, 24, 48, 100] as const;
export const DEFAULT_PAGE_SIZE = 24;

export const STORAGE_KEYS = {
  cart: 'lfm.cart.v1',
  coupon: 'lfm.coupon.v1',
  orders: 'lfm.orders.v1',
  outbox: 'lfm.outbox.v1',
  newsletter: 'lfm.newsletter.v1',
  refreshToken: 'lfm.auth.refresh.v1',
  authProvider: 'lfm.auth.provider.v1',
} as const;
