import type { Cents } from '../../shared/utils/money';

export interface OrderLine {
  productId: number;
  title: string;
  thumbnail: string;
  unitPriceCents: Cents;
  quantity: number;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface OrderTotals {
  subtotalCents: Cents;
  discountCents: Cents;
  shippingCents: Cents;
  totalCents: Cents;
  vatCents: Cents;
  couponCode: string | null;
}

/**
 * A placed order: an immutable snapshot of what was bought, for how much, and where it goes.
 * Prices are copied, never re-derived, so later price changes cannot rewrite history.
 */
export interface Order {
  reference: string;
  /** ISO date-time. */
  placedAt: string;
  userId: number | null;
  customerName: string;
  email: string;
  phone: string;
  address: DeliveryAddress;
  lines: OrderLine[];
  totals: OrderTotals;
  payment: { brand: string; last4: string };
}

/** Everything the checkout knows before payment succeeds. */
export type OrderDraft = Omit<Order, 'reference' | 'placedAt' | 'payment'>;
