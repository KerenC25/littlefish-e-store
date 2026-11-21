import { createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from './authApi';
import { loggedOut, type AuthState } from './authSlice';

/**
 * Silently restores a session after a page reload: exchange the stored refresh token for a
 * new access token, then load the profile. Any failure ends the session cleanly.
 */
export const restoreSession = createAsyncThunk<boolean, void, { state: { auth: AuthState } }>(
  'auth/restoreSession',
  async (_arg, { getState, dispatch }) => {
    const { refreshToken, accessToken } = getState().auth;
    if (!refreshToken || accessToken) return accessToken !== null;

    try {
      await dispatch(authApi.endpoints.refreshSession.initiate({ refreshToken })).unwrap();
      const profile = dispatch(authApi.endpoints.me.initiate(undefined, { forceRefetch: true }));
      try {
        await profile.unwrap();
      } finally {
        // We only needed the side effect (userLoaded); release the cache subscription.
        profile.unsubscribe();
      }
      return true;
    } catch {
      dispatch(loggedOut());
      return false;
    }
  },
);
