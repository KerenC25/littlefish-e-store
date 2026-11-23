import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { API_BASE_URL } from '../shared/config';
import { loggedOut, tokensRefreshed, type AuthState } from '../features/auth/authSlice';
import type { RefreshResponse } from '../features/auth/types';

/** Only the slice of state this module needs, so it does not depend on the whole store. */
interface StateWithAuth {
  auth: AuthState;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const { accessToken, provider } = (getState() as StateWithAuth).auth;
    // A Supabase token is meant for Supabase only: never hand it to a third-party API.
    if (accessToken && isDummyJsonSession(provider)) headers.set('Authorization', `Bearer ${accessToken}`);
    return headers;
  },
});

const isDummyJsonSession = (provider: AuthState['provider']): boolean => provider === undefined || provider === 'dummyjson';

const isRefreshResponse = (data: unknown): data is RefreshResponse =>
  typeof data === 'object' &&
  data !== null &&
  typeof (data as RefreshResponse).accessToken === 'string' &&
  typeof (data as RefreshResponse).refreshToken === 'string';

/**
 * Single-flight guard: when several requests 401 at once, only one refresh call is made
 * and the others wait for it, instead of stampeding the auth server.
 */
let refreshInFlight: Promise<boolean> | null = null;

export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  if (refreshInFlight) await refreshInFlight;

  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status !== 401) return result;

  const { refreshToken, provider } = (api.getState() as StateWithAuth).auth;
  if (!refreshToken || !isDummyJsonSession(provider)) return result;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refresh = await rawBaseQuery(
        { url: '/auth/refresh', method: 'POST', body: { refreshToken, expiresInMins: 30 } },
        api,
        extraOptions,
      );
      if (isRefreshResponse(refresh.data)) {
        api.dispatch(
          tokensRefreshed({
            accessToken: refresh.data.accessToken,
            refreshToken: refresh.data.refreshToken,
          }),
        );
        return true;
      }
      // Refresh token is invalid or expired: end the session cleanly.
      api.dispatch(loggedOut());
      return false;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  const refreshed = await refreshInFlight;
  if (refreshed) result = await rawBaseQuery(args, api, extraOptions);
  return result;
};

/** Test hook: resets module-level state between tests. */
export const __resetRefreshLockForTests = (): void => {
  refreshInFlight = null;
};
