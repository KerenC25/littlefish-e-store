import { isValidEmail } from '../../shared/utils/validation';

export interface RegisterValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegisterField = keyof RegisterValues;
export type RegisterErrors = Partial<Record<RegisterField, string>>;

export const emptyRegisterValues: RegisterValues = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' };

/** Field order on screen, so focus can jump to the first problem. */
export const REGISTER_FIELD_ORDER: RegisterField[] = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];

export const NAME_MAX = 50;
export const PASSWORD_MIN = 8;
/** Supabase hashes with bcrypt, which ignores anything past 72 bytes. */
export const PASSWORD_MAX = 72;

export const PASSWORD_HINT = `At least ${PASSWORD_MIN} characters, with a letter and a number.`;

/** UTF-8 length in bytes (what bcrypt counts), without needing TextEncoder. */
export const utf8Length = (value: string): number => {
  let bytes = 0;
  for (const char of value) {
    const cp = char.codePointAt(0) ?? 0;
    bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return bytes;
};

export const passwordProblem = (password: string): string | undefined => {
  if (password === '') return 'Choose a password';
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters`;
  if (utf8Length(password) > PASSWORD_MAX) return `Keep it under ${PASSWORD_MAX} characters`;
  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password)) return 'Mix in at least one letter and one number';
  return undefined;
};

const nameProblem = (value: string, label: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed === '') return `Enter your ${label}`;
  if (trimmed.length > NAME_MAX) return `Keep your ${label} under ${NAME_MAX} characters`;
  return undefined;
};

export const validateRegister = (values: RegisterValues): RegisterErrors => {
  const errors: RegisterErrors = {};
  const first = nameProblem(values.firstName, 'first name');
  if (first) errors.firstName = first;
  const last = nameProblem(values.lastName, 'last name');
  if (last) errors.lastName = last;
  if (values.email.trim() === '') errors.email = 'Enter your email address';
  else if (!isValidEmail(values.email)) errors.email = 'That email address does not look right';
  const password = passwordProblem(values.password);
  if (password) errors.password = password;
  if (values.confirmPassword === '') errors.confirmPassword = 'Type your password again';
  else if (values.confirmPassword !== values.password) errors.confirmPassword = 'The passwords do not match';
  return errors;
};
