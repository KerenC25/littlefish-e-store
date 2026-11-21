/**
 * Thin, failure-tolerant wrapper around Web Storage.
 *
 * Storage can throw (Safari private mode, quota exceeded, disabled cookies) and its
 * contents are user-controlled, so every read is parsed defensively and validated by
 * the caller-supplied type guard before it is trusted.
 */
export const readJson = <T>(
  storage: Storage | undefined,
  key: string,
  isValid: (value: unknown) => value is T,
): T | undefined => {
  try {
    const raw = storage?.getItem(key);
    if (raw == null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const writeJson = (storage: Storage | undefined, key: string, value: unknown): void => {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Persisting is a nice-to-have; never crash the app because storage is unavailable.
  }
};

export const removeItem = (storage: Storage | undefined, key: string): void => {
  try {
    storage?.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const safeLocalStorage = (): Storage | undefined =>
  typeof window === 'undefined' ? undefined : window.localStorage;

export const safeSessionStorage = (): Storage | undefined =>
  typeof window === 'undefined' ? undefined : window.sessionStorage;
