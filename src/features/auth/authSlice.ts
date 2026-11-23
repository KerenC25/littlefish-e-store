import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthProvider, User } from './types';

/**
 * Token strategy (see README "Security"):
 * - The short-lived access token lives in memory only (Redux), so it never touches storage
 *   that an injected script could trivially exfiltrate across sessions.
 * - The refresh token is kept in sessionStorage so a page reload can silently restore the
 *   session; it is cleared when the tab closes or on logout. In production this belongs in
 *   an httpOnly, Secure, SameSite cookie set by the server.
 * - `provider` records who issued the tokens, so they are only ever sent back to that issuer.
 */
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Absent means DummyJSON (sessions stored before sign-up existed). */
  provider?: AuthProvider;
}

export const initialAuthState: AuthState = { user: null, accessToken: null, refreshToken: null };

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    credentialsReceived(
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string; provider?: AuthProvider }>,
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.provider = action.payload.provider ?? 'dummyjson';
    },
    tokensRefreshed(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    userLoaded(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    loggedOut() {
      return initialAuthState;
    },
  },
  selectors: {
    selectCurrentUser: (state) => state.user,
    selectIsAuthenticated: (state) => state.user !== null && state.accessToken !== null,
    selectHasSession: (state) => state.refreshToken !== null,
    selectAuthProvider: (state): AuthProvider => state.provider ?? 'dummyjson',
  },
});

export const { credentialsReceived, tokensRefreshed, userLoaded, loggedOut } = authSlice.actions;
export const { selectCurrentUser, selectIsAuthenticated, selectHasSession, selectAuthProvider } = authSlice.selectors;
export const authReducer = authSlice.reducer;
export const authSliceName = authSlice.name;
