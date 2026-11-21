import { screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { AppRoutes } from '../app/AppRoutes';
import { cartAdapter } from '../features/cart/cartSlice';
import { apiProduct, productPage, sampleProducts } from './fixtures';
import { mockFetch, on } from './mockFetch';
import { renderWithProviders } from './renderWithProviders';

const tongs = apiProduct({
  id: 2,
  title: 'Braai Tongs',
  brand: 'Weber',
  price: 25,
  discountPercentage: 20,
  stock: 3,
  thumbnail: 'https://cdn.example.test/2.webp',
  images: ['https://cdn.example.test/2-a.webp', 'https://cdn.example.test/2-b.webp'],
  tags: ['braai', 'outdoor'],
  reviews: [
    { rating: 5, comment: 'Turned my chops like a pro.', date: '2026-01-01', reviewerName: 'Sipho M' },
    { rating: 4, comment: 'Solid grip.', date: '2026-02-01', reviewerName: 'Anika V' },
  ],
});

const detailApi = (product = tongs) => on('GET', `/products/${product.id}`, () => product);

const signedIn = {
  user: { id: 1, username: 'emilys', email: 'emily@example.test', firstName: 'Emily', lastName: 'Johnson' },
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
};

const cartWithTongs = cartAdapter.setAll(cartAdapter.getInitialState(), [
  { productId: 2, title: 'Braai Tongs', thumbnail: '', unitPriceCents: 462_50, quantity: 1, maxQuantity: 3 },
]);

describe('Product detail page', () => {
  it('renders the product with price, stock, tags and reviews, and focuses the heading', async () => {
    mockFetch(detailApi());
    renderWithProviders(<AppRoutes />, { route: '/products/2' });

    const heading = await screen.findByRole('heading', { level: 1, name: 'Braai Tongs' });
    expect(heading).toHaveFocus(); // announces the view change to screen-reader users
    expect(screen.getByText('Weber')).toBeInTheDocument();
    expect(screen.getByText(/R\s?462,50/)).toBeInTheDocument();
    expect(screen.getByText(/Was/)).toBeInTheDocument(); // discount spoken, not just struck through
    expect(screen.getByText('3 in stock')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Tags' })).getAllByRole('listitem')).toHaveLength(2);

    const reviews = screen.getByRole('region', { name: 'What people are saying' });
    expect(within(reviews).getByText('Turned my chops like a pro.')).toBeInTheDocument();
    expect(within(reviews).getByText('5 out of 5 stars.')).toBeInTheDocument();
  });

  it('switches the main image from the thumbnail buttons', async () => {
    mockFetch(detailApi());
    const { user } = renderWithProviders(<AppRoutes />, { route: '/products/2' });
    await screen.findByRole('heading', { level: 1, name: 'Braai Tongs' });

    const first = screen.getByRole('button', { name: 'Show image 1 of 2' });
    const second = screen.getByRole('button', { name: 'Show image 2 of 2' });
    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Braai Tongs' })).toHaveAttribute('src', tongs.images?.[0]);

    await user.click(second);

    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(first).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: 'Braai Tongs' })).toHaveAttribute('src', tongs.images?.[1]);
  });

  it('adds to the cart and updates the header badge', async () => {
    mockFetch(detailApi());
    const { user, store } = renderWithProviders(<AppRoutes />, { route: '/products/2' });
    await screen.findByRole('heading', { level: 1, name: 'Braai Tongs' });

    await user.click(screen.getByRole('button', { name: 'Add Braai Tongs to cart' }));

    expect(store.getState().cart.entities[2]?.quantity).toBe(1);
    expect(screen.getByRole('button', { name: 'Cart, 1 item' })).toBeInTheDocument();
  });

  it('falls back to the thumbnail when there are no gallery images', async () => {
    mockFetch(detailApi({ ...tongs, images: [] }));
    renderWithProviders(<AppRoutes />, { route: '/products/2' });
    await screen.findByRole('heading', { level: 1, name: 'Braai Tongs' });

    expect(screen.getByRole('img', { name: 'Braai Tongs' })).toHaveAttribute('src', tongs.thumbnail);
    expect(screen.queryByRole('group', { name: 'Product images' })).not.toBeInTheDocument();
  });

  it('shows "sold out" for products without stock', async () => {
    mockFetch(detailApi({ ...tongs, stock: 0 }));
    renderWithProviders(<AppRoutes />, { route: '/products/2' });
    await screen.findByRole('heading', { level: 1, name: 'Braai Tongs' });

    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Braai Tongs: Sold out' })).toBeDisabled();
  });

  it('shows a friendly not-found state for a missing product', async () => {
    mockFetch(on('GET', '/products/999', () => ({ status: 404, body: { message: 'Product not found' } })));
    renderWithProviders(<AppRoutes />, { route: '/products/999' });

    expect(await screen.findByText('That one swam off')).toBeInTheDocument();
  });

  it.each(['abc', '0', '-1', '1.5'])('rejects the invalid id "%s" without calling the API', async (id) => {
    const { calls } = mockFetch();
    renderWithProviders(<AppRoutes />, { route: `/products/${id}` });

    expect(await screen.findByText('That one swam off')).toBeInTheDocument();
    expect(calls.filter((c) => c.url.pathname.startsWith('/products/'))).toHaveLength(0);
  });

  it('shows an error with retry for server failures, and recovers', async () => {
    let fail = true;
    mockFetch(on('GET', '/products/2', () => (fail ? { status: 500, body: { message: 'Kitchen on fire' } } : tongs)));
    const { user } = renderWithProviders(<AppRoutes />, { route: '/products/2' });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load this product');
    expect(alert).toHaveTextContent('Kitchen on fire');

    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Braai Tongs' })).toBeInTheDocument();
  });

  it('links back to the shop', async () => {
    mockFetch(
      detailApi(),
      on('GET', '/products/categories', () => []),
      on('GET', '/products', () => productPage(sampleProducts)),
    );
    const { user } = renderWithProviders(<AppRoutes />, { route: '/products/2' });
    await screen.findByRole('heading', { level: 1, name: 'Braai Tongs' });

    await user.click(screen.getByRole('link', { name: 'Back to the shop' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Small fish. Fast moves.' })).toBeInTheDocument();
  });
});

describe('Not found page', () => {
  it('handles unknown routes and navigates home', async () => {
    mockFetch(on('GET', '/products/categories', () => []), on('GET', '/products', () => productPage(sampleProducts)));
    const { user } = renderWithProviders(<AppRoutes />, { route: '/definitely/not/here' });

    expect(await screen.findByText('This page got away')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to the shop' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Small fish. Fast moves.' })).toBeInTheDocument();
  });
});

describe('Accessibility (axe) across every route', () => {
  // axe walks the whole DOM; under coverage instrumentation a full page can take 20 s+.
  const axeIt = (name: string, fn: () => Promise<void>) => it(name, fn, 60_000);

  axeIt('product detail page', async () => {
    mockFetch(detailApi());
    const { container } = renderWithProviders(<AppRoutes />, { route: '/products/2' });
    await screen.findByRole('heading', { level: 1, name: 'Braai Tongs' });
    expect(await axe(container)).toHaveNoViolations();
  });

  axeIt('sign-in page', async () => {
    mockFetch();
    const { container } = renderWithProviders(<AppRoutes />, { route: '/login' });
    await screen.findByRole('heading', { name: 'Sign in' });
    expect(await axe(container)).toHaveNoViolations();
  });

  axeIt('sign-in page with a validation error', async () => {
    mockFetch();
    const { container, user } = renderWithProviders(<AppRoutes />, { route: '/login' });
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your username')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  axeIt('checkout page, before and after a failed submit', async () => {
    mockFetch();
    const { container, user } = renderWithProviders(<AppRoutes />, {
      route: '/checkout',
      preloadedState: { cart: cartWithTongs, auth: signedIn },
    });
    await screen.findByRole('heading', { name: 'Checkout' });
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: /^Pay / }));
    expect(screen.getByText(/Please fix \d+ fields/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  axeIt('not found page', async () => {
    mockFetch();
    const { container } = renderWithProviders(<AppRoutes />, { route: '/nope' });
    await screen.findByText('This page got away');
    expect(await axe(container)).toHaveNoViolations();
  });
});
