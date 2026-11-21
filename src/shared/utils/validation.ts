/** Pragmatic email check: something@something.tld, no spaces. Real verification is a confirmation email. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

export const isValidEmail = (email: string): boolean => email.length <= 254 && EMAIL_PATTERN.test(email.trim());

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const isNonEmptyString = (v: unknown, max = 500): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
