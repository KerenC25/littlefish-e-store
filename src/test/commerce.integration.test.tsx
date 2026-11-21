import { screen, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { AppRoutes } from '../app/AppRoutes';
import { cartAdapter } from '../features/cart/cartSlice';
import { TEST_CARDS } from '../features/checkout/payment/mockPaymentGateway';
import { ordersAdapter } from '../features/orders/ordersSlice';
import { order, productPage, sampleProducts } from './fixtures';
import { mockFetch, on } from './mockFetch';
import { renderWithProviders } from './renderWithProviders';

const AXE_TIMEOUT_MS = 60_000;

const cartWith = (unitPriceCents: number, quantity = 1) =>
  cartAdapter.setAll(cartAdapter.getInitialState(), [
    { productId: 2, title: 'Braai Tongs', thumbnail: '', unitPriceCents, quantity, maxQuantity: 10 },
  ]);

const signedIn = {
  user: { id: 1, username: 'emilys', email: 'emily@example.test', firstName: 'Emily', lastName: 'Johnson' },
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
};

const ordersState = (...list: ReturnType<typeof order>[]) => ordersAdapter.setAll(ordersAdapter.getInitialState(), list);
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const catalogApi = () =>
  mockFetch(on('GET', '/products/categories', () => []), on('GET', '/products', () => productPage(sampleProducts)));

type User = ReturnType<typeof renderWithProviders>['user'];

const openCart = async (user: User) => {
  await user.click(await screen.findByRole('button', { name: /^Cart,/, hidden: true }));
  return screen.findByRole('dialog', { name: 'Your cart' });
};

const fillCheckout = async (user: User, cardNumber: string = TEST_CARDS.success) => {
  await user.type(screen.getByRole('textbox', { name: /Mobile number/ }), '082 123 4567');
  await user.type(screen.getByRole('textbox', { name: /Street address/ }), '1 Long Street');
  await user.type(screen.getByRole('textbox', { name: /City or town/ }), 'Johannesburg');
  await user.click(screen.getByRole('combobox', { name: /Province/ }));
  await user.click(await screen.findByRole('option', { name: 'Gauteng' }));
  await user.type(screen.getByRole('textbox', { name: /Postal code/ }), '2001');
  await user.type(screen.getByRole('textbox', { name: /Card number/ }), cardNumber);
  await user.type(screen.getByRole('textbox', { name: /Expiry/ }), '1230');
  await user.type(screen.getByRole('textbox', { name: /CVC/ }), '123');
};

describe('Coupons (integration)', () => {
  it('applies, explains and removes coupons in the cart', async () => {
    catalogApi();
    const { user, store } = renderWithProviders(<AppRoutes />, { preloadedState: { cart: cartWith(200_00, 2) } });
    const cart = await openCart(user);
    const field = within(cart).getByRole('textbox', { name: 'Coupon code' });

    await user.type(field, 'nope');
    await user.click(within(cart).getByRole('button', { name: 'Apply' }));
    expect(field).toHaveAccessibleDescription(/do not recognise/);

    await user.clear(field);
    await user.type(field, 'blackfriday');
    await user.click(within(cart).getByRole('button', { name: 'Apply' }));
    expect(field).toHaveAccessibleDescription(/has expired/);

    await user.clear(field);
    await user.type(field, 'jozi100');
    await user.click(within(cart).getByRole('button', { name: 'Apply' }));
    expect(field).toHaveAccessibleDescription(/needs a subtotal/);

    await user.clear(field);
    await user.type(field, 'lekker10{Enter}');
    expect(within(cart).getByText('LEKKER10 applied')).toBeInTheDocument();
    expect(within(cart).getByText('Coupon (LEKKER10)')).toBeInTheDocument();
    expect(within(cart).getByText(/-R\s?40,00/)).toBeInTheDocument();
    expect(store.getState().coupon.code).toBe('LEKKER10');

    await user.click(within(cart).getByRole('button', { name: 'Remove coupon LEKKER10' }));
    expect(within(cart).getByRole('textbox', { name: 'Coupon code' })).toBeInTheDocument();
    expect(store.getState().coupon.code).toBeNull();
  });
});

describe('Checkout → order → email → tracking (integration)', () => {
  it('places an order with a coupon, emails a confirmation and links to tracking', async () => {
    mockFetch();
    const { user, store } = renderWithProviders(<AppRoutes />, {
      route: '/checkout',
      preloadedState: { cart: cartWith(462_50, 2), auth: signedIn, coupon: { code: 'LEKKER10' } },
    });
    await screen.findByRole('heading', { name: 'Checkout' });
    expect(screen.getByText('Coupon (LEKKER10)')).toBeInTheDocument();

    await fillCheckout(user);
    // R925 - 10% = R832,50, + R99 delivery.
    await user.click(screen.getByRole('button', { name: /^Pay R\s?931,50$/ }));

    expect(await screen.findByRole('heading', { name: 'Payment successful' })).toBeInTheDocument();
    expect(screen.getByText(/Confirmation sent to/)).toHaveTextContent('emily@example.test');

    const [placed] = Object.values(store.getState().orders.entities);
    expect(placed).toMatchObject({
      userId: 1,
      email: 'emily@example.test',
      address: { city: 'Johannesburg', province: 'Gauteng' },
      totals: { discountCents: 92_50, totalCents: 931_50, couponCode: 'LEKKER10' },
      payment: { brand: 'Visa', last4: '4242' },
    });
    expect(store.getState().cart.ids).toEqual([]);
    expect(store.getState().coupon.code).toBeNull(); // spent

    const [email] = Object.values(store.getState().outbox.entities);
    expect(email?.subject).toBe(`Order ${placed?.reference} confirmed. Sharp sharp!`);
    expect(email?.body).toContain(`https://shop.example.test/littlefish-e-store/orders/${placed?.reference}`);
    expect(screen.getByRole('link', { name: 'Demo inbox, 1 unread' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Track your order' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Order placed' })).toBeInTheDocument();
    expect(screen.getByText(`Order ${placed?.reference}`)).toBeInTheDocument();
  });

  it('still completes the order, and says so, if the email fails', async () => {
    mockFetch();
    const { user, store } = renderWithProviders(<AppRoutes />, {
      route: '/checkout',
      preloadedState: { cart: cartWith(462_50), auth: signedIn },
      emailTransport: {
        send: async () => {
          throw new Error('Mail server on strike');
        },
      },
    });
    await screen.findByRole('heading', { name: 'Checkout' });
    await fillCheckout(user);
    await user.click(screen.getByRole('button', { name: /^Pay / }));

    expect(await screen.findByRole('heading', { name: 'Payment successful' })).toBeInTheDocument();
    expect(screen.getByText(/confirmation email did not go through/)).toBeInTheDocument();
    expect(store.getState().orders.ids).toHaveLength(1);
    expect(store.getState().outbox.ids).toHaveLength(0);
  });

  it('removes an expired coupon at payment time instead of charging the wrong amount', async () => {
    mockFetch();
    const { user, store } = renderWithProviders(<AppRoutes />, {
      route: '/checkout',
      preloadedState: { cart: cartWith(462_50), auth: signedIn, coupon: { code: 'BLACKFRIDAY' } },
    });
    await screen.findByRole('heading', { name: 'Checkout' });
    await fillCheckout(user);
    await user.click(screen.getByRole('button', { name: /^Pay / }));

    expect(await screen.findByText(/has expired.*We removed it/)).toBeInTheDocument();
    expect(store.getState().coupon.code).toBeNull();
    expect(store.getState().orders.ids).toHaveLength(0);
  });
});

describe('Order tracking (integration)', () => {
  it.each([
    [0, 'Order placed'],
    [5, 'Packed'],
    [20, 'Out for delivery'],
    [120, 'Delivered. Enjoy!'],
  ])('shows the right stage %s minutes after ordering', async (mins, heading) => {
    mockFetch();
    renderWithProviders(<AppRoutes />, {
      route: '/orders/LFM-1A2B3C4D',
      preloadedState: { auth: signedIn, orders: ordersState(order({ placedAt: minutesAgo(mins) })) },
    });
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    const timeline = screen.getByRole('region', { name: 'Tracking' });
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(4);
  });

  it('sends guests to the lookup form, which needs the matching email', async () => {
    mockFetch();
    const { user } = renderWithProviders(<AppRoutes />, {
      route: '/orders/LFM-1A2B3C4D',
      preloadedState: { orders: ordersState(order()) },
    });

    // Not signed in: redirected, with the reference pre-filled.
    expect(await screen.findByRole('heading', { name: 'Track an order' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Order reference/ })).toHaveValue('LFM-1A2B3C4D');

    const email = within(screen.getByRole('main')).getByRole('textbox', { name: /Email address/ });
    await user.type(email, 'wrong@example.test');
    await user.click(screen.getByRole('button', { name: 'Find my order' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not find an order');

    await user.clear(email);
    await user.type(email, 'THANDI@example.test');
    await user.click(screen.getByRole('button', { name: 'Find my order' }));
    expect(await screen.findByText('Order LFM-1A2B3C4D')).toBeInTheDocument();
  });

  it("does not show someone else's order to a signed-in user", async () => {
    mockFetch();
    renderWithProviders(<AppRoutes />, {
      route: '/orders/LFM-1A2B3C4D',
      preloadedState: { auth: signedIn, orders: ordersState(order({ userId: 99 })) },
    });
    expect(await screen.findByRole('heading', { name: 'Track an order' })).toBeInTheDocument();
  });

  it('lists only my orders, newest first', async () => {
    mockFetch();
    renderWithProviders(<AppRoutes />, {
      route: '/orders',
      preloadedState: {
        auth: signedIn,
        orders: ordersState(
          order({ reference: 'LFM-OLDER', placedAt: minutesAgo(300) }),
          order({ reference: 'LFM-NEWER', placedAt: minutesAgo(1) }),
          order({ reference: 'LFM-THEIRS', userId: 7 }),
        ),
      },
    });
    const list = await screen.findByRole('list', { name: 'Your orders' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((li) => within(li).getByRole('heading').textContent)).toEqual(['LFM-NEWER', 'LFM-OLDER']);
    expect(within(items[0]!).getByText('Order placed')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Delivered')).toBeInTheDocument();
  });

  it('shows a friendly empty state with no orders', async () => {
    mockFetch();
    renderWithProviders(<AppRoutes />, { route: '/orders', preloadedState: { auth: signedIn } });
    expect(await screen.findByText('No orders yet')).toBeInTheDocument();
  });
});

describe('Newsletter and demo inbox (integration)', () => {
  it('validates, subscribes, and delivers the welcome email to the inbox', async () => {
    catalogApi();
    const { user, store } = renderWithProviders(<AppRoutes />);
    const signup = await screen.findByRole('region', { name: 'Join the shoal' });
    const email = within(signup).getByRole('textbox', { name: 'Email address' });

    await user.type(email, 'sipho@example.test');
    await user.click(within(signup).getByRole('button', { name: 'Subscribe' }));
    expect(await within(signup).findByRole('alert')).toHaveTextContent('Please tick the box');

    await user.click(within(signup).getByRole('checkbox', { name: /send me Little Fish emails/ }));
    await user.click(within(signup).getByRole('button', { name: 'Subscribe' }));
    expect(await within(signup).findByText(/Welcome to the shoal!/)).toBeInTheDocument();
    expect(store.getState().newsletter.subscribers).toHaveLength(1);

    await user.click(within(signup).getByRole('link', { name: 'Open inbox' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Demo inbox' })).toBeInTheDocument();
    const message = screen.getByRole('article');
    expect(within(message).getByRole('heading', { name: /Welcome to the shoal/ })).toBeInTheDocument();
    expect(within(message).getByText(/SHOAL15/)).toBeInTheDocument();
    // Opening it marks it read, and the header badge clears.
    await waitFor(() => expect(Object.values(store.getState().outbox.entities)[0]?.read).toBe(true));
    expect(screen.queryByRole('link', { name: /unread/ })).not.toBeInTheDocument();
  });

  it('shows an empty inbox politely', async () => {
    mockFetch();
    renderWithProviders(<AppRoutes />, { route: '/inbox' });
    expect(await screen.findByText('No mail yet')).toBeInTheDocument();
  });
});

describe('Accessibility (axe) on the new pages', () => {
  const axeIt = (name: string, fn: () => Promise<void>) => it(name, fn, AXE_TIMEOUT_MS);

  axeIt('order tracking page', async () => {
    mockFetch();
    const { container } = renderWithProviders(<AppRoutes />, {
      route: '/orders/LFM-1A2B3C4D',
      preloadedState: { auth: signedIn, orders: ordersState(order({ placedAt: minutesAgo(12) })) },
    });
    await screen.findByRole('heading', { level: 1, name: 'Out for delivery' });
    expect(await axe(container)).toHaveNoViolations();
  });

  axeIt('track an order page, with an error', async () => {
    mockFetch();
    const { container, user } = renderWithProviders(<AppRoutes />, { route: '/track' });
    await user.type(await screen.findByRole('textbox', { name: /Order reference/ }), 'LFM-NOPE');
    await user.type(within(screen.getByRole('main')).getByRole('textbox', { name: /Email address/ }), 'a@b.test');
    await user.click(screen.getByRole('button', { name: 'Find my order' }));
    await screen.findByRole('alert');
    expect(await axe(container)).toHaveNoViolations();
  });

  axeIt('my orders and the inbox', async () => {
    mockFetch();
    const { container, user } = renderWithProviders(<AppRoutes />, {
      route: '/orders',
      preloadedState: { auth: signedIn, orders: ordersState(order()) },
    });
    await screen.findByRole('heading', { name: 'My orders' });
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getAllByRole('link', { name: 'Demo inbox' })[0]!);
    await screen.findByRole('heading', { level: 1, name: 'Demo inbox' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
