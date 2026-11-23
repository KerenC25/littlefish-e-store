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

/** Retail "charm" price: keep the whole Rand amount and end it in 99 cents (R462,50 -> R462,99). */
export const toCharmCents = (cents: Cents): Cents => Math.floor(Math.max(0, cents) / 100) * 100 + 99;

/** Converts an API price in USD to a shelf price in ZAR cents, ending in ,99. */
export const usdToZarCents = (usd: number): Cents => toCharmCents(Math.round(usd * USD_TO_ZAR * 100));

export const formatZar = (cents: Cents): string => zarFormatter.format(cents / 100);

/** VAT portion of a VAT-inclusive amount. */
export const vatPortion = (inclusiveCents: Cents): Cents =>
  Math.round(inclusiveCents - inclusiveCents / (1 + VAT_RATE));

/** "Was" price before a percentage discount, also ending in ,99 and always above the current price. */
export const preDiscountCents = (cents: Cents, discountPercentage: number): Cents => {
  if (discountPercentage <= 0) return cents;
  const was = toCharmCents(Math.round(cents / (1 - discountPercentage / 100)));
  return was > cents ? was : cents + 100;
};
