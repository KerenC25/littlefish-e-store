import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

const isFetchBaseQueryError = (error: unknown): error is FetchBaseQueryError =>
  typeof error === 'object' && error !== null && 'status' in error;

/** Turns any RTK Query / thunk error into a short, user-safe message. */
export const getErrorMessage = (
  error: FetchBaseQueryError | SerializedError | undefined,
  fallback = 'Something went wrong. Please try again.',
): string => {
  if (!error) return fallback;
  if (isFetchBaseQueryError(error)) {
    if (error.status === 'FETCH_ERROR') return 'We could not reach the shop. Check your connection and try again.';
    if (error.status === 'TIMEOUT_ERROR') return 'That took too long. Please try again.';
    const data = error.data as { message?: unknown } | undefined;
    if (typeof data?.message === 'string' && data.message.length < 200) return data.message;
    return fallback;
  }
  return fallback;
};
