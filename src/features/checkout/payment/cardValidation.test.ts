import {
  detectBrand,
  formatCardNumber,
  formatExpiry,
  isValidCvc,
  isValidExpiry,
  passesLuhn,
} from './cardValidation';

describe('cardValidation', () => {
  it.each(['4242 4242 4242 4242', '5555555555554444', '378282246310005'])('accepts valid number %s', (n) => {
    expect(passesLuhn(n)).toBe(true);
  });

  it.each(['4242 4242 4242 4241', '1234', '', 'abcd efgh ijkl mnop'])('rejects invalid number "%s"', (n) => {
    expect(passesLuhn(n)).toBe(false);
  });

  it('detects card brands', () => {
    expect(detectBrand('4242')).toBe('Visa');
    expect(detectBrand('5555')).toBe('Mastercard');
    expect(detectBrand('3782')).toBe('American Express');
    expect(detectBrand('9999')).toBe('Card');
  });

  it('formats as the user types', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('42a4-2')).toBe('4242');
    expect(formatExpiry('1228')).toBe('12/28');
    expect(formatExpiry('1')).toBe('1');
  });

  it('validates expiry against "now"', () => {
    const now = new Date(2026, 10, 20); // 20 Nov 2026
    expect(isValidExpiry('11/26', now)).toBe(true); // valid until end of Nov
    expect(isValidExpiry('10/26', now)).toBe(false);
    expect(isValidExpiry('13/30', now)).toBe(false);
    expect(isValidExpiry('1230', now)).toBe(false);
  });

  it('expects 4-digit CVC for Amex and 3 otherwise', () => {
    expect(isValidCvc('123', '4242')).toBe(true);
    expect(isValidCvc('1234', '4242')).toBe(false);
    expect(isValidCvc('1234', '3782')).toBe(true);
  });
});
