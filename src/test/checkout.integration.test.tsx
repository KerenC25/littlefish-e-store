import { screen, waitFor, within } from '@testing-library/react';
import { AppRoutes } from '../app/AppRoutes';
import { cartAdapter } from '../features/cart/cartSlice';
import { TEST_CARDS } from '../features/checkout/payment/mockPaymentGateway';
import { STORAGE_KEYS } from '../shared/config';
import { loginResponse } from './fixtures';
import { createMemoryStorage } from './memoryStorage';
import { mockFetch, on } from './mockFetch';
import { renderWithProviders } from './renderWithProviders';

const cartWithTongs = cartAdapter.setAll(cartAdapter.getInitialState(), [
  { productId: 2, title: 'Braai Tongs', thumbnail: '', unitPriceCents: 462_50, quantity: 2, maxQuantity: 3 },
]);

const signedIn = {
  user: { id: 1, username: 'emilys', email: 'emily@example.test', firstName: 'Emily', lastName: 'Johnson' },
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
};

type User = ReturnType<typeof renderWithProviders>['user'];

const fillCheckout = async (user: User, cardNumber: string) => {
  await user.type(screen.getByRole('textbox', { name: /Mobile number/ }), '082 123 4567');
  await user.type(screen.getByRole('textbox', { name: /Street address/ }), '1 Long Street');
  await user.type(screen.getByRole('textbox', { name: /City or town/ }), 'Cape Town');
  await user.click(screen.getByRole('combobox', { name: /Province/ }));
  await user.click(await screen.findByRole('option', { name: 'Western Cape' }));
  await user.type(screen.getByRole('textbox', { name: /Postal code/ }), '8001');
  await user.type(screen.getByRole('textbox', { name: /Card number/ }), cardNumber);
  await user.type(screen.getByRole('textbox', { name: /Expiry/ }), '1230');
  await user.type(screen.getByRole('textbox', { name: /CVC/ }), '123');
};

describe('Authentication and checkout (integration)', () => {
  it('redirects to sign-in, then back to checkout after logging in', async () => {
    const { calls } = mockFetch(on('POST', '/auth/login', () => loginResponse));
    const { user } = renderWithProviders(<AppRoutes />, {
      route: '/checkout',
      preloadedState: { cart: cartWithTongs },
    });

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fill in' }));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(calls[0]?.body).toMatchObject({ username: 'emilys', password: 'emilyspass' });
    // Profile data pre-fills the form.
    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveValue('Emily Johnson');
  });

  it('shows a friendly error for bad credentials and clears the password', async () => {
    mockFetch(on('POST', '/auth/login', () => ({ status: 400, body: { message: 'Invalid credentials' } })));
    const { user } = renderWithProviders(<AppRoutes />, { route: '/login' });

    await user.type(await screen.findByRole('textbox', { name: /Username/ }), 'emilys');
    await user.type(screen.getByLabelText(/Password/, { selector: 'input' }), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByLabelText(/Password/, { selector: 'input' })).toHaveValue('');
  });

  it('validates the form and focuses the first invalid field', async () => {
    mockFetch();
    const { user } = renderWithProviders(<AppRoutes />, {
      route: '/checkout',
      preloadedState: { cart: cartWithTongs, auth: signedIn },
    });

    await user.click(await screen.findByRole('button', { name: /^Pay / }));

    expect(screen.getByText(/Please fix \d+ fields/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Mobile number/ })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: /Mobile number/ })).toHaveAccessibleDescription(/South African number/);
  });

  it('takes a successful payment, shows a receipt and empties the cart', async () => {
    mockFetch();
    const durableStorage = createMemoryStorage();
    const { user, store } = renderWithProviders(<AppRoutes />, {
      route: '/checkout',
      preloadedState: { cart: cartWithTongs, auth: signedIn },
      durableStorage,
    });
    await screen.findByRole('heading', { name: 'Checkout' });

    await fillCheckout(user, TEST_CARDS.success);
    // 2 x R462,50 = R925,00 subtotal, + R99,00 delivery (below the R1 000 free threshold).
    await user.click(screen.getByRole('button', { name: /^Pay R\s?1\s?024,00$/ }));

    expect(await screen.findByRole('heading', { name: 'Payment successful' })).toHaveFocus();
    expect(screen.getByText('Visa ending 4242')).toBeInTheDocument();
    expect(screen.getByText(/^LFM-[0-9A-F]{8}$/)).toBeInTheDocument();
    expect(store.getState().cart.ids).toEqual([]);
    expect(JSON.parse(durableStorage.getItem(STORAGE_KEYS.cart) ?? '{}').items).toEqual([]);
    expect(screen.getByRole('button', { name: 'Cart, empty' })).toBeInTheDocument();
  });

  it('reports a declined card without emptying the cart, and wipes the card number', async () => {
    mockFetch();
    const { user, store } = renderWithProviders(<AppRoutes />, {
      route: '/checkout',
      preloadedState: { cart: cartWithTongs, auth: signedIn },
    });
    await screen.findByRole('heading', { name: 'Checkout' });

    await fillCheckout(user, TEST_CARDS.declined);
    await user.click(screen.getByRole('button', { name: /^Pay / }));

    expect(await screen.findByText(/Your bank said no/)).toBeInTheDocument();
    expect(store.getState().cart.ids).toEqual([2]);
    expect(screen.getByRole('textbox', { name: /Card number/ })).toHaveValue('');
  });

  it('handles a 3-D Secure challenge', async () => {
    mockFetch();
    const { user } = renderWithProviders(<AppRoutes />, {
      route: '/checkout',
      preloadedState: { cart: cartWithTongs, auth: signedIn },
    });
    await screen.findByRole('heading', { name: 'Checkout' });

    await fillCheckout(user, TEST_CARDS.requires3ds);
    await user.click(screen.getByRole('button', { name: /^Pay / }));

    const challenge = await screen.findByRole('dialog', { name: 'Approve on your banking app' });
    await user.click(within(challenge).getByRole('button', { name: 'Approve' }));

    expect(await screen.findByRole('heading', { name: 'Payment successful' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
