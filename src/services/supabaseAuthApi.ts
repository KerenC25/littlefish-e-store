import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { getSupabaseConfig } from '../shared/supabaseConfig';
import { credentialsReceived } from '../features/auth/authSlice';
import { isSupabaseSession, isSupabaseUser, toRegisterResult, toSession, toUser } from '../features/auth/supabaseMappers';
import type { EmailSignInRequest, RegisterRequest, RegisterResult, Session, User } from '../features/auth/types';

/**
 * Supabase Auth (GoTrue) over plain REST, through RTK Query like every other call in the app.
 *
 * A separate API slice on purpose: it has its own origin and its own credentials, and must
 * never go through the DummyJSON base query (which would attach DummyJSON's bearer token or
 * try DummyJSON's refresh on a 401).
 */
const supabaseBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = (args, api, extraOptions) => {
  const config = getSupabaseConfig();
  if (!config) return { error: { status: 'CUSTOM_ERROR', error: 'not-configured' } };
  const raw = fetchBaseQuery({
    baseUrl: `${config.url}/auth/v1`,
    prepareHeaders: (headers) => {
      headers.set('apikey', config.anonKey);
      return headers;
    },
  });
  return raw(args, api, extraOptions);
};

const invalidResponse: FetchBaseQueryError = { status: 'CUSTOM_ERROR', error: 'invalid-response' };

const toSessionOrError = (data: unknown): { data: Session } | { error: FetchBaseQueryError } =>
  isSupabaseSession(data) ? { data: toSession(data) } : { error: invalidResponse };

const bearer = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

export const supabaseAuthApi = createApi({
  reducerPath: 'supabaseAuth',
  baseQuery: supabaseBaseQuery,
  endpoints: (build) => ({
    signUp: build.mutation<RegisterResult, RegisterRequest>({
      async queryFn({ firstName, lastName, email, password, redirectTo }, _api, _extra, baseQuery) {
        const normalisedEmail = email.trim().toLowerCase();
        const result = await baseQuery({
          url: '/signup',
          method: 'POST',
          params: { redirect_to: redirectTo },
          body: {
            email: normalisedEmail,
            password,
            data: { first_name: firstName.trim(), last_name: lastName.trim() },
          },
        });
        if (result.error) return { error: result.error };
        return { data: toRegisterResult(result.data, normalisedEmail) };
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.kind === 'signed-in') dispatch(credentialsReceived({ ...data.session, provider: 'supabase' }));
        } catch {
          // Surfaced to the form through the mutation result.
        }
      },
    }),

    signInWithEmail: build.mutation<Session, EmailSignInRequest>({
      async queryFn({ email, password }, _api, _extra, baseQuery) {
        const result = await baseQuery({
          url: '/token',
          method: 'POST',
          params: { grant_type: 'password' },
          body: { email: email.trim().toLowerCase(), password },
        });
        return result.error ? { error: result.error } : toSessionOrError(result.data);
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(credentialsReceived({ ...data, provider: 'supabase' }));
        } catch {
          // Surfaced to the form through the mutation result.
        }
      },
    }),

    refreshSupabaseSession: build.mutation<Session, { refreshToken: string }>({
      async queryFn({ refreshToken }, _api, _extra, baseQuery) {
        const result = await baseQuery({
          url: '/token',
          method: 'POST',
          params: { grant_type: 'refresh_token' },
          body: { refresh_token: refreshToken },
        });
        return result.error ? { error: result.error } : toSessionOrError(result.data);
      },
    }),

    /** Used once, after a confirmation link, to turn the tokens in the URL into a profile. */
    getSupabaseUser: build.mutation<User, { accessToken: string }>({
      async queryFn({ accessToken }, _api, _extra, baseQuery) {
        const result = await baseQuery({ url: '/user', headers: bearer(accessToken) });
        if (result.error) return { error: result.error };
        return isSupabaseUser(result.data) ? { data: toUser(result.data) } : { error: invalidResponse };
      },
    }),

    /** Revokes the refresh token server-side, so a copied token stops working after sign-out. */
    signOutSupabase: build.mutation<null, { accessToken: string }>({
      query: ({ accessToken }) => ({ url: '/logout', method: 'POST', headers: bearer(accessToken) }),
      transformResponse: () => null,
    }),
  }),
});

export const { useSignUpMutation, useSignInWithEmailMutation } = supabaseAuthApi;
