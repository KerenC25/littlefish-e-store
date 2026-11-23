import { STORAGE_KEYS } from '../../shared/config';
import { readJson, removeItem, writeJson } from '../../shared/utils/storage';
import { initialAuthState, type AuthState } from './authSlice';
import type { AuthProvider } from './types';

const isToken = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length < 4096;
const isProvider = (v: unknown): v is AuthProvider => v === 'dummyjson' || v === 'supabase';

/** Only the refresh token (and who issued it) is persisted; access token and profile are re-fetched. */
export const loadAuth = (storage: Storage | undefined): AuthState | undefined => {
  const refreshToken = readJson(storage, STORAGE_KEYS.refreshToken, isToken);
  if (!refreshToken) return undefined;
  const provider = readJson(storage, STORAGE_KEYS.authProvider, isProvider) ?? 'dummyjson';
  return { ...initialAuthState, refreshToken, provider };
};

export const saveAuth = (storage: Storage | undefined, auth: AuthState): void => {
  if (auth.refreshToken) {
    writeJson(storage, STORAGE_KEYS.refreshToken, auth.refreshToken);
    writeJson(storage, STORAGE_KEYS.authProvider, auth.provider ?? 'dummyjson');
  } else {
    removeItem(storage, STORAGE_KEYS.refreshToken);
    removeItem(storage, STORAGE_KEYS.authProvider);
  }
};
