import { formatZar, type Cents } from '../../shared/utils/money';

/**
 * Coupon rules, as pure functions.
 *
 * SECURITY NOTE: in this demo the coupon list ships to the browser, so anyone can read it.
 * In production the server owns the list, validates codes at checkout, and recomputes the
 * total it charges; the client only displays what the server returns.
 */
export type CouponKind = 'percent' | 'fixed' | 'free-shipping';

export interface Coupon {
  code: string;
  kind: CouponKind;
  /** Percent (0-100) for `percent`, cents for `fixed`, unused for `free-shipping`. */
  value: number;
  description: string;
  minSubtotalCents?: Cents;
  /** ISO date-time after which the code stops working. */
  expiresAt?: string;
}

export const COUPONS: readonly Coupon[] = [
  { code: 'LEKKER10', kind: 'percent', value: 10, description: '10% off everything' },
  {
    code: 'JOZI100',
    kind: 'fixed',
    value: 100_00,
    description: 'R100 off orders of R750 or more',
    minSubtotalCents: 750_00,
  },
  { code: 'FREESHIP', kind: 'free-shipping', value: 0, description: 'Free delivery, any order' },
  { code: 'SHOAL15', kind: 'percent', value: 15, description: '15% off for newsletter subscribers' },
  {
    code: 'BLACKFRIDAY',
    kind: 'percent',
    value: 30,
    description: '30% off (Black Friday 2025)',
    expiresAt: '2025-12-01T00:00:00+02:00',
  },
];

/** Code shared in the newsletter welcome email. */
export const NEWSLETTER_COUPON = 'SHOAL15';

export const normaliseCode = (code: string): string => code.trim().toUpperCase().replace(/\s+/g, '');

export const findCoupon = (code: string | null | undefined): Coupon | undefined =>
  code ? COUPONS.find((c) => c.code === normaliseCode(code)) : undefined;

export type CouponCheck =
  | { ok: true; coupon: Coupon }
  | { ok: false; reason: 'empty' | 'unknown' | 'expired' | 'min-spend'; message: string };

/** Validates a code against the current subtotal and time. */
export const validateCoupon = (code: string, subtotalCents: Cents, now: Date = new Date()): CouponCheck => {
  if (!normaliseCode(code)) return { ok: false, reason: 'empty', message: 'Enter a coupon code.' };
  const coupon = findCoupon(code);
  if (!coupon) return { ok: false, reason: 'unknown', message: 'We do not recognise that code. Check for typos?' };
  if (coupon.expiresAt && now >= new Date(coupon.expiresAt)) {
    return { ok: false, reason: 'expired', message: `${coupon.code} has expired. Like milk, but sadder.` };
  }
  if (coupon.minSubtotalCents && subtotalCents < coupon.minSubtotalCents) {
    return {
      ok: false,
      reason: 'min-spend',
      message: `${coupon.code} needs a subtotal of ${formatZar(coupon.minSubtotalCents)}. Add ${formatZar(
        coupon.minSubtotalCents - subtotalCents,
      )} more.`,
    };
  }
  return { ok: true, coupon };
};

/** Money off the subtotal. Never more than the subtotal itself. */
export const couponDiscountCents = (coupon: Coupon, subtotalCents: Cents): Cents => {
  switch (coupon.kind) {
    case 'percent':
      return Math.min(subtotalCents, Math.round((subtotalCents * coupon.value) / 100));
    case 'fixed':
      return Math.min(subtotalCents, coupon.value);
    case 'free-shipping':
      return 0;
  }
};
