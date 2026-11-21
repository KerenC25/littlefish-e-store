import { makeStore } from '../app/store';
import { credentialsReceived } from '../features/auth/authSlice';
import { authApi } from '../features/auth/authApi';
import { restoreSession } from '../features/auth/authThunks';
import { STORAGE_KEYS } from '../shared/config';
import { loginResponse } from '../test/fixtures';
import { createMemoryStorage } from '../test/memoryStorage';
import { mockFetch, on } from '../test/mockFetch';

const user = { id: 1, username: 'emilys', email: 'e@x.test', firstName: 'Emily', lastName: 'J' };

const signedInStore = (authStorage = createMemoryStorage()) => {
  const store = makeStore({ durableStorage: createMemoryStorage(), authStorage });
  store.dispatch(credentialsReceived({ user, accessToken: 'expired', refreshToken: 'refresh-1' }));
  return store;
};

describe('baseQueryWithReauth', () => {
  it('attaches the bearer token', async () => {
    const { calls } = mockFetch(on('GET', '/auth/me', () => user));
    const store = signedInStore();
    await store.dispatch(authApi.endpoints.me.initiate());
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer expired');
  });

  it('refreshes once on 401 and retries the original request', async () => {
    const { calls } = mockFetch(
      on('POST', '/auth/refresh', () => ({ accessToken: 'fresh', refreshToken: 'refresh-2' })),
      on('GET', '/auth/me', (req) =>
        req.headers.get('Authorization') === 'Bearer fresh' ? user : { status: 401, body: { message: 'Token Expired!' } },
      ),
    );
    const store = signedInStore();

    const result = await store.dispatch(authApi.endpoints.me.initiate());

    expect(result.data).toMatchObject({ username: 'emilys' });
    expect(store.getState().auth).toMatchObject({ accessToken: 'fresh', refreshToken: 'refresh-2' });
    expect(calls.map((c) => `${c.method} ${c.url.pathname}`)).toEqual([
      'GET /auth/me',
      'POST /auth/refresh',
      'GET /auth/me',
    ]);
  });

  it('logs out and clears the stored session when refresh fails', async () => {
    mockFetch(
      on('POST', '/auth/refresh', () => ({ status: 403, body: { message: 'Invalid refresh token' } })),
      on('GET', '/auth/me', () => ({ status: 401, body: {} })),
    );
    const authStorage = createMemoryStorage();
    const store = signedInStore(authStorage);
    expect(authStorage.getItem(STORAGE_KEYS.refreshToken)).not.toBeNull();

    await store.dispatch(authApi.endpoints.me.initiate());

    expect(store.getState().auth.user).toBeNull();
    expect(authStorage.getItem(STORAGE_KEYS.refreshToken)).toBeNull();
  });
});

describe('auth session', () => {
  it('stores the refresh token, never the access token', async () => {
    mockFetch(on('POST', '/auth/login', () => loginResponse));
    const authStorage = createMemoryStorage();
    const store = makeStore({ durableStorage: createMemoryStorage(), authStorage });

    await store.dispatch(authApi.endpoints.login.initiate({ username: ' emilys ', password: 'emilyspass' }));

    expect(store.getState().auth.user).toMatchObject({ firstName: 'Emily' });
    expect(authStorage.getItem(STORAGE_KEYS.refreshToken)).toBe(JSON.stringify('refresh-1'));
    const everything = Array.from({ length: authStorage.length }, (_, i) => authStorage.getItem(authStorage.key(i) ?? ''));
    expect(everything.join()).not.toContain('access-1');
  });

  it('trims the username before sending', async () => {
    const { calls } = mockFetch(on('POST', '/auth/login', () => loginResponse));
    const store = makeStore({ durableStorage: createMemoryStorage(), authStorage: createMemoryStorage() });
    await store.dispatch(authApi.endpoints.login.initiate({ username: ' emilys ', password: 'p' }));
    expect(calls[0]?.body).toMatchObject({ username: 'emilys' });
  });

  it('restores a session from a stored refresh token', async () => {
    mockFetch(
      on('POST', '/auth/refresh', () => ({ accessToken: 'fresh', refreshToken: 'refresh-2' })),
      on('GET', '/auth/me', () => user),
    );
    const authStorage = createMemoryStorage({ [STORAGE_KEYS.refreshToken]: JSON.stringify('refresh-1') });
    const store = makeStore({ durableStorage: createMemoryStorage(), authStorage });

    const result = await store.dispatch(restoreSession());

    expect(result.payload).toBe(true);
    expect(store.getState().auth).toMatchObject({ accessToken: 'fresh', user: expect.objectContaining({ id: 1 }) });
  });
});
