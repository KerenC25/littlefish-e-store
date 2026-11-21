import { api } from '../../services/api';
import { credentialsReceived, tokensRefreshed, userLoaded } from './authSlice';
import type { LoginRequest, LoginResponse, RefreshResponse, User } from './types';

const toUser = ({ id, username, email, firstName, lastName, image, role }: User): User => ({
  id,
  username,
  email,
  firstName,
  lastName,
  image,
  role,
});

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, LoginRequest>({
      query: ({ username, password }) => ({
        url: '/auth/login',
        method: 'POST',
        body: { username: username.trim(), password, expiresInMins: 30 },
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            credentialsReceived({
              // Copy only the fields we need: never keep more personal data than required.
              user: toUser(data),
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            }),
          );
        } catch {
          // Error is surfaced to the caller through the mutation result.
        }
      },
    }),
    refreshSession: build.mutation<RefreshResponse, { refreshToken: string }>({
      query: ({ refreshToken }) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: { refreshToken, expiresInMins: 30 },
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(tokensRefreshed({ accessToken: data.accessToken, refreshToken: data.refreshToken }));
        } catch {
          /* handled by restoreSession */
        }
      },
    }),
    me: build.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userLoaded(toUser(data)));
        } catch {
          /* handled by baseQueryWithReauth (logs out on failed refresh) */
        }
      },
    }),
  }),
});

export const { useLoginMutation, useMeQuery } = authApi;
