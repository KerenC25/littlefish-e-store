import { createAsyncThunk } from '@reduxjs/toolkit';
import { supabaseAuthApi } from '../../services/supabaseAuthApi';
import { authApi } from './authApi';
import { credentialsReceived, loggedOut, type AuthState } from './authSlice';
import { parseConfirmationFragment } from './supabaseMappers';

type ThunkConfig = { state: { auth: AuthState } };

/**
 * Silently restores a session after a page reload: exchange the stored refresh token for a
 * new access token, then load the profile. Any failure ends the session cleanly.
 * Each provider's refresh token goes back to the provider that issued it, and nowhere else.
 */
export const restoreSession = createAsyncThunk<boolean, void, ThunkConfig>(
  'auth/restoreSession',
  async (_arg, { getState, dispatch }) => {
    const { refreshToken, accessToken, provider } = getState().auth;
    if (!refreshToken || accessToken) return accessToken !== null;

    try {
      if (provider === 'supabase') {
        const session = await dispatch(supabaseAuthApi.endpoints.refreshSupabaseSession.initiate({ refreshToken })).unwrap();
        dispatch(credentialsReceived({ ...session, provider: 'supabase' }));
        return true;
      }

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

export type ConfirmationOutcome = { kind: 'signed-in'; firstName: string } | { kind: 'error'; message: string } | { kind: 'none' };

/**
 * Finishes sign-up when the customer lands from the confirmation email. Supabase puts the
 * new session in the URL fragment; we validate it by loading the profile with it, then keep
 * it exactly like a normal sign-in. The caller strips the fragment from the address bar.
 */
export const completeEmailConfirmation = createAsyncThunk<ConfirmationOutcome, string, ThunkConfig>(
  'auth/completeEmailConfirmation',
  async (hash, { dispatch }) => {
    const fragment = parseConfirmationFragment(hash);
    if (fragment.kind !== 'tokens') return fragment;
    try {
      const user = await dispatch(
        supabaseAuthApi.endpoints.getSupabaseUser.initiate({ accessToken: fragment.accessToken }),
      ).unwrap();
      dispatch(
        credentialsReceived({
          user,
          accessToken: fragment.accessToken,
          refreshToken: fragment.refreshToken,
          provider: 'supabase',
        }),
      );
      return { kind: 'signed-in', firstName: user.firstName };
    } catch {
      return { kind: 'error', message: 'We could not confirm your email from that link. Please try signing in.' };
    }
  },
);

/** Ends the session locally straight away; revoking a Supabase session server-side is best effort. */
export const signOut = createAsyncThunk<void, void, ThunkConfig>('auth/signOut', async (_arg, { getState, dispatch }) => {
  const { accessToken, provider } = getState().auth;
  dispatch(loggedOut());
  if (provider === 'supabase' && accessToken) {
    try {
      await dispatch(supabaseAuthApi.endpoints.signOutSupabase.initiate({ accessToken })).unwrap();
    } catch {
      // The local session is already gone; an unreachable server must not block sign-out.
    }
  }
});
