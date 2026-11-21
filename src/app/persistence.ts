import { STORAGE_KEYS } from '../shared/config';
import { readJson, writeJson } from '../shared/utils/storage';
import { isFiniteNumber, isNonEmptyString, isRecord } from '../shared/utils/validation';
import type { CouponState } from '../features/coupons/couponSlice';
import { ordersAdapter, MAX_STORED_ORDERS, type OrdersState } from '../features/orders/ordersSlice';
import type { Order } from '../features/orders/types';
import { outboxAdapter, MAX_STORED_EMAILS, type OutboxState } from '../features/email/outboxSlice';
import type { EmailMessage } from '../features/email/types';
import type { NewsletterState, Subscriber } from '../features/newsletter/newsletterSlice';

/**
 * Durable (localStorage) persistence for the slices that should survive a reload.
 * Storage is user-controlled, so everything is schema-checked on the way in; anything
 * malformed is dropped rather than trusted.
 */
interface Versioned<T> {
  version: 1;
  data: T;
}

const versioned =
  <T>(isData: (v: unknown) => v is T) =>
  (v: unknown): v is Versioned<T> =>
    isRecord(v) && v.version === 1 && isData(v.data);

const isArrayOf =
  <T>(guard: (v: unknown) => v is T) =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.every(guard);

const isIsoDate = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

// ---- Coupon ------------------------------------------------------------------------------

const isCouponCode = (v: unknown): v is string | null => v === null || isNonEmptyString(v, 40);

export const loadCoupon = (storage: Storage | undefined): CouponState | undefined => {
  const saved = readJson(storage, STORAGE_KEYS.coupon, versioned(isCouponCode));
  return saved ? { code: saved.data } : undefined;
};
export const saveCoupon = (storage: Storage | undefined, state: CouponState) =>
  writeJson(storage, STORAGE_KEYS.coupon, { version: 1, data: state.code } satisfies Versioned<string | null>);

// ---- Orders ------------------------------------------------------------------------------

const isOrder = (v: unknown): v is Order => {
  if (!isRecord(v)) return false;
  const { address, totals, payment, lines } = v;
  return (
    isNonEmptyString(v.reference, 40) &&
    isIsoDate(v.placedAt) &&
    (v.userId === null || isFiniteNumber(v.userId)) &&
    isNonEmptyString(v.email, 254) &&
    typeof v.customerName === 'string' &&
    typeof v.phone === 'string' &&
    isRecord(address) &&
    ['street', 'city', 'province', 'postalCode'].every((k) => typeof address[k] === 'string') &&
    isRecord(totals) &&
    ['subtotalCents', 'discountCents', 'shippingCents', 'totalCents', 'vatCents'].every((k) => isFiniteNumber(totals[k])) &&
    isRecord(payment) &&
    typeof payment.brand === 'string' &&
    typeof payment.last4 === 'string' &&
    Array.isArray(lines) &&
    lines.every(
      (l) =>
        isRecord(l) &&
        isFiniteNumber(l.productId) &&
        typeof l.title === 'string' &&
        typeof l.thumbnail === 'string' &&
        isFiniteNumber(l.unitPriceCents) &&
        isFiniteNumber(l.quantity),
    )
  );
};

export const loadOrders = (storage: Storage | undefined): OrdersState | undefined => {
  const saved = readJson(storage, STORAGE_KEYS.orders, versioned(isArrayOf(isOrder)));
  return saved ? ordersAdapter.setAll(ordersAdapter.getInitialState(), saved.data.slice(0, MAX_STORED_ORDERS)) : undefined;
};
export const saveOrders = (storage: Storage | undefined, state: OrdersState) =>
  writeJson(storage, STORAGE_KEYS.orders, { version: 1, data: Object.values(state.entities) });

// ---- Outbox (demo inbox) -----------------------------------------------------------------

const isEmail = (v: unknown): v is EmailMessage =>
  isRecord(v) &&
  isNonEmptyString(v.id, 64) &&
  (v.kind === 'order-confirmation' || v.kind === 'newsletter-welcome') &&
  isNonEmptyString(v.to, 254) &&
  isNonEmptyString(v.subject, 300) &&
  typeof v.preview === 'string' &&
  typeof v.body === 'string' &&
  v.body.length < 20_000 &&
  isIsoDate(v.sentAt) &&
  typeof v.read === 'boolean' &&
  (v.action === undefined ||
    (isRecord(v.action) &&
      typeof v.action.label === 'string' &&
      // Only in-app paths: a tampered message must not be able to link off-site.
      typeof v.action.path === 'string' &&
      v.action.path.startsWith('/') &&
      !v.action.path.startsWith('//')));

export const loadOutbox = (storage: Storage | undefined): OutboxState | undefined => {
  const saved = readJson(storage, STORAGE_KEYS.outbox, versioned(isArrayOf(isEmail)));
  return saved ? outboxAdapter.setAll(outboxAdapter.getInitialState(), saved.data.slice(0, MAX_STORED_EMAILS)) : undefined;
};
export const saveOutbox = (storage: Storage | undefined, state: OutboxState) =>
  writeJson(storage, STORAGE_KEYS.outbox, { version: 1, data: Object.values(state.entities) });

// ---- Newsletter --------------------------------------------------------------------------

const isSubscriber = (v: unknown): v is Subscriber =>
  isRecord(v) && isNonEmptyString(v.email, 254) && isIsoDate(v.consentedAt);

export const loadNewsletter = (storage: Storage | undefined): NewsletterState | undefined => {
  const saved = readJson(storage, STORAGE_KEYS.newsletter, versioned(isArrayOf(isSubscriber)));
  return saved ? { subscribers: saved.data } : undefined;
};
export const saveNewsletter = (storage: Storage | undefined, state: NewsletterState) =>
  writeJson(storage, STORAGE_KEYS.newsletter, { version: 1, data: state.subscribers } satisfies Versioned<Subscriber[]>);
