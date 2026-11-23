import { formatZar, preDiscountCents, usdToZarCents, vatPortion } from './money';

describe('money', () => {
  it('converts USD to a ZAR shelf price ending in ,99', () => {
    expect(usdToZarCents(10)).toBe(185_99); // R185,00 -> R185,99
    expect(usdToZarCents(9.5)).toBe(175_99); // R175,75 -> R175,99
    expect(usdToZarCents(25)).toBe(462_99); // R462,50 -> R462,99
    expect(usdToZarCents(0.01)).toBe(99);
    expect([1.23, 9.99, 49.95, 1899.5].every((usd) => usdToZarCents(usd) % 100 === 99)).toBe(true);
  });

  it('formats cents as Rand', () => {
    // Intl output differs slightly between ICU versions (spaces), so normalise whitespace.
    expect(formatZar(123_456).replace(/\s/g, ' ')).toMatch(/^R\s?1.?234,56$/);
  });

  it('extracts the VAT portion from a VAT-inclusive amount', () => {
    expect(vatPortion(115_00)).toBe(15_00);
  });

  it('reconstructs the pre-discount price as a ,99 price', () => {
    expect(preDiscountCents(89_99, 10)).toBe(99_99);
    expect(preDiscountCents(462_99, 20)).toBe(578_99);
    expect(preDiscountCents(90_00, 0)).toBe(90_00);
  });

  it('keeps the "was" price above the current price for tiny discounts', () => {
    expect(preDiscountCents(10_99, 0.5)).toBeGreaterThan(10_99);
    expect(preDiscountCents(10_99, 0.5) % 100).toBe(99);
  });
});
