import { STORAGE_KEYS } from '../../shared/config';
import { readJson, removeItem, writeJson } from '../../shared/utils/storage';
import { initialAuthState, type AuthState } from './authSlice';

const isToken = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length < 4096;

/** Only the refresh token is persisted; access token and profile are re-fetched. */
export const loadAuth = (storage: Storage | undefined): AuthState | undefined => {
  const refreshToken = readJson(storage, STORAGE_KEYS.refreshToken, isToken);
  return refreshToken ? { ...initialAuthState, refreshToken } : undefined;
};

export const saveAuth = (storage: Storage | undefined, auth: AuthState): void => {
  if (auth.refreshToken) writeJson(storage, STORAGE_KEYS.refreshToken, auth.refreshToken);
  else removeItem(storage, STORAGE_KEYS.refreshToken);
};
