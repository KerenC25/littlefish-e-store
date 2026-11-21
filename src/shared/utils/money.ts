import { USD_TO_ZAR, VAT_RATE } from '../config';

/**
 * All money is handled as integer cents to avoid floating point drift
 * (0.1 + 0.2 !== 0.3). Conversion to a display string happens only at the edge.
 */
export type Cents = number;

const zarFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
});

/** Converts an API price in USD to ZAR cents. */
export const usdToZarCents = (usd: number): Cents => Math.round(usd * USD_TO_ZAR * 100);

export const formatZar = (cents: Cents): string => zarFormatter.format(cents / 100);

/** VAT portion of a VAT-inclusive amount. */
export const vatPortion = (inclusiveCents: Cents): Cents =>
  Math.round(inclusiveCents - inclusiveCents / (1 + VAT_RATE));

/** Original price before a percentage discount was applied. */
export const preDiscountCents = (cents: Cents, discountPercentage: number): Cents =>
  discountPercentage > 0 ? Math.round(cents / (1 - discountPercentage / 100)) : cents;
