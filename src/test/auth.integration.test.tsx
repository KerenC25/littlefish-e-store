import { screen, waitFor, within } from '@testing-library/react';
import { AppRoutes } from '../app/AppRoutes';
import { makeStore } from '../app/store';
import { restoreSession } from '../features/auth/authThunks';
import { STORAGE_KEYS } from '../shared/config';
import { apiProduct } from './fixtures';
import { createMemoryStorage } from './memoryStorage';
import { mockFetch, on } from './mockFetch';
import { renderWithProviders } from './renderWithProviders';

const supabaseUser = {
  id: '7f0c1f5e-1b7a-4a8e-9d5c-2f1d2b3c4d5e',
  email: 'thandi@example.test',
  user_metadata: { first_name: 'Thandi', last_name: 'Nkosi' },
  identities: [{}],
};

const supabaseSession = (access = 'sb-access-1', refresh = 'sb-refresh-1') => ({
  access_token: access,
  refresh_token: refresh,
  expires_in: 3600,
  token_type: 'bearer',
  user: supabaseUser,
});

const signedInWithSupabase = {
  user: { id: supabaseUser.id, email: supabaseUser.email, firstName: 'Thandi', lastName: 'Nkosi' },
  accessToken: 'sb-access-1',
  refreshToken: 'sb-refresh-1',
  provider: 'supabase' as const,
};

type User = ReturnType<typeof renderWithProviders>['user'];

/** The register card only: the footer has its own email field (newsletter). */
const registerCard = async () => within(await screen.findByRole('region', { name: 'Create an account' }));

const fillRegister = async (user: User, overrides: Partial<Record<'first' | 'last' | 'email' | 'password' | 'confirm', string>> = {}) => {
  const card = await registerCard();
  await user.type(card.getByRole('textbox', { name: /First name/ }), overrides.first ?? 'Thandi');
  await user.type(card.getByRole('textbox', { name: /Last name/ }), overrides.last ?? 'Nkosi');
  await user.type(card.getByRole('textbox', { name: /Email/ }), overrides.email ?? ' Thandi@Example.test ');
  await user.type(card.getByLabelText(/^Password/, { selector: 'input' }), overrides.password ?? 'braai2026');
  await user.type(card.getByLabelText(/^Confirm password/, { selector: 'input' }), overrides.confirm ?? 'braai2026');
};

const setSupabaseGlobals = (url: string, key: string) => {
  const g = globalThis as unknown as Record<string, unknown>;
  g.__LFM_SUPABASE_URL__ = url;
  g.__LFM_SUPABASE_ANON_KEY__ = key;
};

afterEach(() => {
  setSupabaseGlobals('https://test-project.supabase.co', 'test-anon-key');
  window.history.replaceState(null, '', '/');
});

describe('Registration (Supabase Auth)', () => {
  it('creates an account and signs straight in when email confirmation is off', async () => {
    const { calls } = mockFetch(on('POST', '/auth/v1/signup', () => supabaseSession()));
    const authStorage = createMemoryStorage();
    const { user, store } = renderWithProviders(<AppRoutes />, {
      route: { pathname: '/register', state: { from: '/track' } },
      authStorage,
    });

    await fillRegister(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'Track an order' })).toBeInTheDocument();
    const signup = calls.find((c) => c.url.pathname === '/auth/v1/signup');
    expect(signup?.url.origin).toBe('https://test-project.supabase.co');
    expect(signup?.headers.get('apikey')).toBe('test-anon-key');
    expect(signup?.url.searchParams.get('redirect_to')).toBe('http://localhost/');
    expect(signup?.body).toEqual({
      email: 'thandi@example.test',
      password: 'braai2026',
      data: { first_name: 'Thandi', last_name: 'Nkosi' },
    });
    expect(store.getState().auth).toMatchObject({ provider: 'supabase', user: { id: supabaseUser.id, firstName: 'Thandi' } });
    expect(authStorage.getItem(STORAGE_KEYS.authProvider)).toBe(JSON.stringify('supabase'));
    expect(authStorage.getItem(STORAGE_KEYS.refreshToken)).toBe(JSON.stringify('sb-refresh-1'));
  });

  it('asks the customer to check their inbox when confirmation is required', async () => {
    // Supabase returns just the user (no tokens) until the email is confirmed.
    mockFetch(on('POST', '/auth/v1/signup', () => ({ ...supabaseUser, identities: [] })));
    const { user, store } = renderWithProviders(<AppRoutes />, { route: '/register' });

    await fillRegister(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const heading = await screen.findByRole('heading', { name: 'Check your inbox' });
    expect(heading).toHaveFocus();
    expect(screen.getByText('thandi@example.test')).toBeInTheDocument();
    expect(store.getState().auth.user).toBeNull();
  });

  it('validates locally, focuses the first problem and sends nothing', async () => {
    const { calls } = mockFetch();
    const { user } = renderWithProviders(<AppRoutes />, { route: '/register' });

    await fillRegister(user, { first: ' ', password: 'short', confirm: 'other' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('textbox', { name: /First name/ })).toHaveFocus();
    expect(screen.getByText('Enter your first name')).toBeInTheDocument();
    expect(screen.getByText('Use at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('The passwords do not match')).toBeInTheDocument();
    expect(calls.filter((c) => c.url.pathname.startsWith('/auth/'))).toHaveLength(0);
  });

  it('clears errors as they are fixed', async () => {
    mockFetch();
    const { user } = renderWithProviders(<AppRoutes />, { route: '/register' });
    await user.click(await screen.findByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Enter your first name')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /First name/ }), 'T');

    expect(screen.queryByText('Enter your first name')).not.toBeInTheDocument();
  });

  it('shows a friendly server error and clears both passwords', async () => {
    mockFetch(
      on('POST', '/auth/v1/signup', () => ({
        status: 422,
        body: { code: 422, error_code: 'user_already_exists', msg: 'User already registered' },
      })),
    );
    const { user } = renderWithProviders(<AppRoutes />, { route: '/register' });

    await fillRegister(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with that email already exists');
    expect(screen.getByLabelText(/^Password/, { selector: 'input' })).toHaveValue('');
    expect(screen.getByLabelText(/^Confirm password/, { selector: 'input' })).toHaveValue('');
    expect((await registerCard()).getByRole('textbox', { name: /Email/ })).toHaveValue('Thandi@Example.test');
  });

  it('explains when sign-up is not configured for the deployment', async () => {
    setSupabaseGlobals('', '');
    mockFetch();
    renderWithProviders(<AppRoutes />, { route: '/register' });

    expect(await screen.findByText(/Sign-up is not switched on/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in with the demo account' })).toBeInTheDocument();
  });

  it('refuses a non-HTTPS Supabase URL', async () => {
    setSupabaseGlobals('http://insecure.example.test', 'key');
    mockFetch();
    renderWithProviders(<AppRoutes />, { route: '/register' });
    expect(await screen.findByText(/Sign-up is not switched on/)).toBeInTheDocument();
  });

  it('links between sign-in and register', async () => {
    mockFetch();
    const { user } = renderWithProviders(<AppRoutes />, { route: '/login' });
    await user.click(await screen.findByRole('link', { name: 'Create an account' }));
    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
    // Scoped to the form card: the header has its own "Sign in" link.
    await user.click(within(screen.getByRole('region', { name: 'Create an account' })).getByRole('link', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('Email sign-in (Supabase Auth)', () => {
  it('signs in with an email and password', async () => {
    const { calls } = mockFetch(on('POST', '/auth/v1/token', () => supabaseSession()));
    const { user, store } = renderWithProviders(<AppRoutes />, { route: { pathname: '/login', state: { from: '/track' } } });

    await user.type(await screen.findByRole('textbox', { name: /Email or username/ }), 'Thandi@example.test');
    await user.type(screen.getByLabelText(/^Password/, { selector: 'input' }), 'braai2026');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Track an order' })).toBeInTheDocument();
    expect(calls[0]?.url.searchParams.get('grant_type')).toBe('password');
    expect(calls[0]?.body).toEqual({ email: 'thandi@example.test', password: 'braai2026' });
    expect(calls.some((c) => c.url.pathname === '/auth/login')).toBe(false);
    expect(store.getState().auth.provider).toBe('supabase');
  });

  it('shows a friendly message for wrong details, never the raw server text', async () => {
    mockFetch(
      on('POST', '/auth/v1/token', () => ({
        status: 400,
        body: { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' },
      })),
    );
    const { user } = renderWithProviders(<AppRoutes />, { route: '/login' });

    await user.type(await screen.findByRole('textbox', { name: /Email or username/ }), 'thandi@example.test');
    await user.type(screen.getByLabelText(/^Password/, { selector: 'input' }), 'nope');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That email and password do not match');
    expect(screen.getByLabelText(/^Password/, { selector: 'input' })).toHaveValue('');
  });

  it('still routes usernames to the DummyJSON demo login', async () => {
    const { calls } = mockFetch(on('POST', '/auth/login', () => ({ status: 400, body: { message: 'Invalid credentials' } })));
    const { user } = renderWithProviders(<AppRoutes />, { route: '/login' });

    await user.type(await screen.findByRole('textbox', { name: /Email or username/ }), 'emilys');
    await user.type(screen.getByLabelText(/^Password/, { selector: 'input' }), 'x');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(calls.map((c) => c.url.pathname)).toEqual(['/auth/login']);
  });
});

describe('Supabase sessions', () => {
  it('never sends a Supabase token to DummyJSON', async () => {
    const { calls } = mockFetch(on('GET', '/products/2', () => apiProduct({ id: 2, title: 'Braai Tongs' })));
    renderWithProviders(<AppRoutes />, { route: '/products/2', preloadedState: { auth: signedInWithSupabase } });

    await screen.findByRole('heading', { level: 1, name: 'Braai Tongs' });

    const productCall = calls.find((c) => c.url.pathname === '/products/2');
    expect(productCall?.headers.get('Authorization')).toBeNull();
  });

  it('restores a Supabase session from its own refresh token, not DummyJSON', async () => {
    const { calls } = mockFetch(on('POST', '/auth/v1/token', () => supabaseSession('sb-access-2', 'sb-refresh-2')));
    const authStorage = createMemoryStorage({
      [STORAGE_KEYS.refreshToken]: JSON.stringify('sb-refresh-1'),
      [STORAGE_KEYS.authProvider]: JSON.stringify('supabase'),
    });
    const store = makeStore({ durableStorage: createMemoryStorage(), authStorage });

    const result = await store.dispatch(restoreSession());

    expect(result.payload).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url.searchParams.get('grant_type')).toBe('refresh_token');
    expect(calls[0]?.body).toEqual({ refresh_token: 'sb-refresh-1' });
    expect(store.getState().auth).toMatchObject({ accessToken: 'sb-access-2', user: { firstName: 'Thandi' } });
    expect(authStorage.getItem(STORAGE_KEYS.refreshToken)).toBe(JSON.stringify('sb-refresh-2'));
  });

  it('ends the session cleanly when the Supabase refresh token is rejected', async () => {
    mockFetch(on('POST', '/auth/v1/token', () => ({ status: 400, body: { error_code: 'refresh_token_not_found' } })));
    const authStorage = createMemoryStorage({
      [STORAGE_KEYS.refreshToken]: JSON.stringify('sb-refresh-1'),
      [STORAGE_KEYS.authProvider]: JSON.stringify('supabase'),
    });
    const store = makeStore({ durableStorage: createMemoryStorage(), authStorage });

    expect((await store.dispatch(restoreSession())).payload).toBe(false);
    expect(store.getState().auth.refreshToken).toBeNull();
    expect(authStorage.getItem(STORAGE_KEYS.refreshToken)).toBeNull();
    expect(authStorage.getItem(STORAGE_KEYS.authProvider)).toBeNull();
  });

  it('signs out locally and revokes the session on Supabase', async () => {
    const { calls } = mockFetch(on('POST', '/auth/v1/logout', () => ({})));
    const { user, store } = renderWithProviders(<AppRoutes />, {
      route: '/track',
      preloadedState: { auth: signedInWithSupabase },
    });

    await user.click(await screen.findByRole('button', { name: 'Account menu for Thandi' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(store.getState().auth.user).toBeNull();
    await waitFor(() => expect(calls.some((c) => c.url.pathname === '/auth/v1/logout')).toBe(true));
    const logout = calls.find((c) => c.url.pathname === '/auth/v1/logout');
    expect(logout?.headers.get('Authorization')).toBe('Bearer sb-access-1');
  });
});

describe('Email confirmation link', () => {
  it('signs the customer in from the link and wipes the tokens from the address bar', async () => {
    window.history.replaceState(null, '', '/#access_token=sb-access-9&refresh_token=sb-refresh-9&type=signup');
    const { calls } = mockFetch(on('GET', '/auth/v1/user', () => supabaseUser));
    const { store } = renderWithProviders(<AppRoutes />, { route: '/track' });

    expect(await screen.findByText('Email confirmed. Welcome to the shoal, Thandi.')).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer sb-access-9');
    expect(store.getState().auth).toMatchObject({ provider: 'supabase', refreshToken: 'sb-refresh-9', user: { firstName: 'Thandi' } });
  });

  it('reports an expired link', async () => {
    window.history.replaceState(null, '', '/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid');
    mockFetch();
    const { store } = renderWithProviders(<AppRoutes />, { route: '/track' });

    expect(await screen.findByText(/That confirmation link has expired/)).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    expect(store.getState().auth.user).toBeNull();
  });

  it('does not trust tokens the profile check rejects', async () => {
    window.history.replaceState(null, '', '/#access_token=forged&refresh_token=forged');
    mockFetch(on('GET', '/auth/v1/user', () => ({ status: 401, body: { error_code: 'bad_jwt' } })));
    const { store } = renderWithProviders(<AppRoutes />, { route: '/track' });

    expect(await screen.findByText(/could not confirm your email/)).toBeInTheDocument();
    expect(store.getState().auth.user).toBeNull();
  });
});
