import { cartAdapter, calculateTotals, type CartItem } from '../cart/cartSlice';
import { couponDiscountCents, findCoupon, normaliseCode, validateCoupon } from './coupons';
import { couponApplied, couponReducer, couponRemoved, initialCouponState } from './couponSlice';

const now = new Date('2026-11-20T12:00:00+02:00');
const line = (unitPriceCents: number, quantity = 1, productId = 1): CartItem => ({
  productId,
  title: `Item ${productId}`,
  thumbnail: '',
  unitPriceCents,
  quantity,
  maxQuantity: 10,
});

describe('validateCoupon', () => {
  it('normalises case and spaces', () => {
    expect(normaliseCode('  lek ker10 ')).toBe('LEKKER10');
    expect(validateCoupon(' lekker10', 100_00, now)).toMatchObject({ ok: true, coupon: { code: 'LEKKER10' } });
  });

  it.each([
    ['', 'empty'],
    ['NOPE', 'unknown'],
    ['BLACKFRIDAY', 'expired'],
  ])('rejects "%s" (%s)', (code, reason) => {
    expect(validateCoupon(code, 100_00, now)).toMatchObject({ ok: false, reason });
  });

  it('enforces minimum spend and says how much more is needed', () => {
    const check = validateCoupon('JOZI100', 700_00, now);
    expect(check).toMatchObject({ ok: false, reason: 'min-spend' });
    expect(check.ok === false && check.message.replace(/\s/g, ' ')).toMatch(/Add R\s?50,00 more/);
    expect(validateCoupon('JOZI100', 750_00, now).ok).toBe(true);
  });

  it('accepts a coupon right up to its expiry', () => {
    expect(validateCoupon('BLACKFRIDAY', 100_00, new Date('2025-11-30T23:59:00+02:00')).ok).toBe(true);
  });
});

describe('couponDiscountCents', () => {
  it('computes percent, fixed and free-shipping discounts, never exceeding the subtotal', () => {
    expect(couponDiscountCents(findCoupon('LEKKER10')!, 333_33)).toBe(33_33);
    expect(couponDiscountCents(findCoupon('JOZI100')!, 80_00)).toBe(80_00);
    expect(couponDiscountCents(findCoupon('FREESHIP')!, 500_00)).toBe(0);
  });
});

describe('calculateTotals with coupons', () => {
  it('takes a percentage off before delivery is added', () => {
    const t = calculateTotals([line(200_00, 2)], 'LEKKER10');
    expect(t).toMatchObject({ subtotalCents: 400_00, discountCents: 40_00, shippingCents: 99_00, totalCents: 459_00, couponCode: 'LEKKER10' });
  });

  it('measures the free-delivery threshold on the discounted subtotal', () => {
    // R1 050 qualifies alone, but R945 after 10% off does not.
    expect(calculateTotals([line(1_050_00)]).shippingCents).toBe(0);
    expect(calculateTotals([line(1_050_00)], 'LEKKER10')).toMatchObject({ shippingCents: 99_00, freeShippingRemainingCents: 55_00 });
  });

  it('FREESHIP removes delivery on any order', () => {
    expect(calculateTotals([line(50_00)], 'FREESHIP')).toMatchObject({ discountCents: 0, shippingCents: 0, totalCents: 50_00, freeShippingRemainingCents: 0 });
  });

  it('stops applying (with a reason) if the cart drops below the minimum', () => {
    const t = calculateTotals([line(500_00)], 'JOZI100');
    expect(t).toMatchObject({ discountCents: 0, couponCode: null });
    expect(t.couponIssue).toMatch(/needs a subtotal/);
  });

  it('ignores unknown codes left in storage', () => {
    expect(calculateTotals([line(100_00)], 'HACKED99')).toMatchObject({ discountCents: 0, couponCode: null });
  });

  it('memoises through the store selector with the coupon slice', () => {
    const cart = cartAdapter.setAll(cartAdapter.getInitialState(), [line(100_00)]);
    expect(calculateTotals(Object.values(cart.entities) as CartItem[], 'LEKKER10').totalCents).toBe(189_00);
  });
});

describe('couponSlice', () => {
  it('stores the normalised code and removes it', () => {
    const applied = couponReducer(initialCouponState, couponApplied(' lekker10 '));
    expect(applied.code).toBe('LEKKER10');
    expect(couponReducer(applied, couponRemoved()).code).toBeNull();
  });
});
