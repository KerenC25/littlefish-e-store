import type { RegisterResult, Session, SupabaseSession, SupabaseUser, User } from './types';

const str = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, 100) : '');

/**
 * Supabase user -> app user. Only the fields the UI needs are kept (data minimisation).
 * Names come from `user_metadata`, which we set at sign-up.
 */
export const toUser = (u: SupabaseUser): User => {
  const email = u.email ?? '';
  const firstName = str(u.user_metadata?.first_name) || email.split('@')[0] || 'friend';
  const avatar = str(u.user_metadata?.avatar_url);
  return {
    id: u.id,
    email,
    firstName,
    lastName: str(u.user_metadata?.last_name),
    ...(avatar.startsWith('https://') ? { image: avatar } : {}),
  };
};

export const isSupabaseUser = (v: unknown): v is SupabaseUser =>
  typeof v === 'object' && v !== null && typeof (v as SupabaseUser).id === 'string';

export const isSupabaseSession = (v: unknown): v is SupabaseSession =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as SupabaseSession).access_token === 'string' &&
  typeof (v as SupabaseSession).refresh_token === 'string' &&
  isSupabaseUser((v as SupabaseSession).user);

export const toSession = (s: SupabaseSession): Session => ({
  accessToken: s.access_token,
  refreshToken: s.refresh_token,
  user: toUser(s.user),
});

/**
 * `/signup` returns a session when confirmations are off, or just the user when they are on.
 * For an email that is already registered Supabase deliberately returns the same "check your
 * email" shape (no session), so the form cannot be used to find out who has an account.
 */
export const toRegisterResult = (response: unknown, email: string): RegisterResult =>
  isSupabaseSession(response) ? { kind: 'signed-in', session: toSession(response) } : { kind: 'confirm-email', email };

/** Friendly messages for Supabase Auth error codes; raw server text is never shown. */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'That email and password do not match. Try again.',
  email_not_confirmed: 'Please confirm your email first. Check your inbox (and spam) for our link.',
  user_already_exists: 'An account with that email already exists. Try signing in instead.',
  email_exists: 'An account with that email already exists. Try signing in instead.',
  weak_password: 'That password is too easy to guess. Use at least 8 characters with letters and numbers.',
  over_email_send_rate_limit: 'We have sent a lot of emails just now. Please wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a minute and try again.',
  signup_disabled: 'New sign-ups are switched off right now.',
  email_address_invalid: 'That email address does not look right. Please check it.',
  validation_failed: 'Please check your details and try again.',
};

export const NOT_CONFIGURED_MESSAGE =
  'Email accounts are not switched on for this copy of the store. Use the demo account to sign in.';

export const authErrorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  if (typeof error !== 'object' || error === null) return fallback;
  const e = error as { status?: unknown; data?: unknown; error?: unknown };
  if (e.status === 'FETCH_ERROR') return 'We could not reach the sign-in service. Check your connection and try again.';
  if (e.status === 'CUSTOM_ERROR' && e.error === 'not-configured') return NOT_CONFIGURED_MESSAGE;
  const data = (typeof e.data === 'object' && e.data !== null ? e.data : {}) as Record<string, unknown>;
  const code = typeof data.error_code === 'string' ? data.error_code : typeof data.code === 'string' ? data.code : '';
  const known = MESSAGES[code];
  if (known) return known;
  // Older GoTrue versions signal bad passwords as `invalid_grant`.
  if (data.error === 'invalid_grant') return MESSAGES.invalid_credentials ?? fallback;
  return fallback;
};

/**
 * Tokens Supabase puts in the URL fragment after a confirmation link is clicked
 * (`#access_token=...&refresh_token=...&type=signup`), or the error it reports instead.
 */
export type ConfirmationFragment =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'error'; message: string }
  | { kind: 'none' };

export const parseConfirmationFragment = (hash: string): ConfirmationFragment => {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken && accessToken.length < 4096 && refreshToken.length < 4096) {
    return { kind: 'tokens', accessToken, refreshToken };
  }
  if (params.has('error') || params.has('error_code')) {
    return params.get('error_code') === 'otp_expired'
      ? { kind: 'error', message: 'That confirmation link has expired. Sign up again to get a fresh one.' }
      : { kind: 'error', message: 'We could not confirm your email from that link. Please try again.' };
  }
  return { kind: 'none' };
};
