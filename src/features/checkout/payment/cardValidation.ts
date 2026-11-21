/** Pure, framework-free card helpers. Easy to unit test and reuse. */

export const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/** Luhn checksum (ISO/IEC 7812). Catches most single-digit typos. */
export const passesLuhn = (cardNumber: string): boolean => {
  const digits = digitsOnly(cardNumber);
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
};

export const detectBrand = (cardNumber: string): string => {
  const d = digitsOnly(cardNumber);
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'American Express';
  return 'Card';
};

/** Groups digits in fours for display while typing: "4242 4242 4242 4242". */
export const formatCardNumber = (value: string): string =>
  digitsOnly(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

export const formatExpiry = (value: string): string => {
  const d = digitsOnly(value).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

/** True when MM/YY is a real month that has not yet ended. */
export const isValidExpiry = (expiry: string, now: Date = new Date()): boolean => {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  // First day of the month *after* expiry.
  const endOfValidity = new Date(year, month, 1);
  return endOfValidity > now;
};

export const isValidCvc = (cvc: string, cardNumber: string): boolean => {
  const expected = detectBrand(cardNumber) === 'American Express' ? 4 : 3;
  return new RegExp(`^\\d{${expected}}$`).test(cvc);
};
