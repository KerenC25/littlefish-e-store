export type Role = 'admin' | 'moderator' | 'user';

/**
 * Who issued the session. DummyJSON powers the always-available demo account; Supabase Auth
 * powers real sign-up and email sign-in. Absent (older stored sessions) means DummyJSON.
 */
export type AuthProvider = 'dummyjson' | 'supabase';

/** DummyJSON ids are numbers; Supabase ids are UUID strings. */
export type UserId = number | string;

export interface User {
  id: UserId;
  /** DummyJSON only. Supabase accounts sign in with their email. */
  username?: string;
  email: string;
  firstName: string;
  lastName: string;
  image?: string;
  role?: Role;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse extends User {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface EmailSignInRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  /** Where the confirmation link should land (the app root, including the Pages base path). */
  redirectTo: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/**
 * Sign-up outcome. With email confirmation on (the Supabase default) there is no session
 * until the customer clicks the link; with it off they are signed in straight away.
 */
export type RegisterResult = { kind: 'signed-in'; session: Session } | { kind: 'confirm-email'; email: string };

// ---- Supabase Auth (GoTrue) wire types: only the fields we read -------------------------

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: { first_name?: unknown; last_name?: unknown; avatar_url?: unknown };
  identities?: unknown[];
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: SupabaseUser;
}
