import { formatZar, preDiscountCents, usdToZarCents, vatPortion } from './money';

describe('money', () => {
  it('converts USD to ZAR cents with rounding', () => {
    expect(usdToZarCents(10)).toBe(185_00);
    expect(usdToZarCents(9.5)).toBe(175_75);
    expect(Number.isInteger(usdToZarCents(9.99))).toBe(true);
  });

  it('formats cents as Rand', () => {
    // Intl output differs slightly between ICU versions (spaces), so normalise whitespace.
    expect(formatZar(123_456).replace(/\s/g, ' ')).toMatch(/^R\s?1.?234,56$/);
  });

  it('extracts the VAT portion from a VAT-inclusive amount', () => {
    expect(vatPortion(115_00)).toBe(15_00);
  });

  it('reconstructs the pre-discount price', () => {
    expect(preDiscountCents(90_00, 10)).toBe(100_00);
    expect(preDiscountCents(90_00, 0)).toBe(90_00);
  });
});
