import { act, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { AppRoutes } from '../app/AppRoutes';
import { STORAGE_KEYS } from '../shared/config';
import { productPage, sampleProducts } from './fixtures';
import { mockFetch, on, type MockRequest } from './mockFetch';
import { renderWithProviders } from './renderWithProviders';

const catalogApi = (products = sampleProducts) => [
  on('GET', '/products/categories', () => [{ slug: 'beauty', name: 'Beauty' }, { slug: 'kitchen', name: 'Kitchen' }]),
  on('GET', '/products', () => productPage(products)),
  on('GET', '/products/search', (req: MockRequest) =>
    productPage(products.filter((p) => p.title.toLowerCase().includes(req.url.searchParams.get('q') ?? ''))),
  ),
  on('GET', '/products/category/kitchen', () => productPage(products.slice(1, 2))),
];

// `hidden: true` because MUI correctly aria-hides the page behind an open modal.
const cartButton = () => screen.getByRole('button', { name: /^Cart,/, hidden: true });

describe('Shop (integration)', () => {
  it('lists products from the API with prices in Rand and stock states', async () => {
    mockFetch(...catalogApi());
    renderWithProviders(<AppRoutes />);

    expect(await screen.findByRole('link', { name: 'Rooibos Tea Tin' })).toHaveAttribute('href', '/products/1');
    const list = screen.getByRole('list', { name: 'Products' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Showing 1–3 of 3 products')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vetkoek Pan: Sold out' })).toBeDisabled();
    expect(screen.getAllByText(/R\s?185,00/).length).toBeGreaterThan(0);
  });

  it('keeps the header badge, product buttons and cart modal in sync', async () => {
    mockFetch(...catalogApi());
    const { user, cartStorage } = renderWithProviders(<AppRoutes />);

    expect(await screen.findByRole('button', { name: 'Add Braai Tongs to cart' })).toBeEnabled();
    expect(cartButton()).toHaveAccessibleName('Cart, empty');

    await user.click(screen.getByRole('button', { name: 'Add Braai Tongs to cart' }));
    expect(cartButton()).toHaveAccessibleName('Cart, 1 item');
    expect(await screen.findByText('Braai Tongs is in your cart. Lekker.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Braai Tongs to cart' })).toHaveTextContent('Add another (1 in cart)');

    await user.click(cartButton());
    const dialog = await screen.findByRole('dialog', { name: 'Your cart' });
    await user.click(within(dialog).getByRole('button', { name: 'Increase quantity of Braai Tongs' }));
    await user.click(within(dialog).getByRole('button', { name: 'Increase quantity of Braai Tongs' }));

    // Stock is 3: the stepper stops there.
    expect(within(dialog).getByRole('button', { name: 'Increase quantity of Braai Tongs' })).toBeDisabled();
    expect(cartButton()).toHaveAccessibleName('Cart, 3 items');
    expect(within(dialog).getByText('Total')).toBeInTheDocument();
    expect(JSON.parse(cartStorage.getItem(STORAGE_KEYS.cart) ?? '{}').items[0].quantity).toBe(3);

    await user.click(within(dialog).getByRole('button', { name: 'Remove Braai Tongs from cart' }));
    expect(within(dialog).getByText(/Your cart is emptier than/)).toBeInTheDocument();
    expect(cartButton()).toHaveAccessibleName('Cart, empty');
  });

  it('closes the cart with Escape and returns focus to the cart button', async () => {
    mockFetch(...catalogApi());
    const { user } = renderWithProviders(<AppRoutes />);
    await screen.findByRole('link', { name: 'Rooibos Tea Tin' });

    await user.click(cartButton());
    await screen.findByRole('dialog', { name: 'Your cart' });
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(cartButton()).toHaveFocus();
  });

  it('sends sorting, category and debounced search to the API', async () => {
    const { calls } = mockFetch(...catalogApi());
    const { user } = renderWithProviders(<AppRoutes />);
    await screen.findByRole('link', { name: 'Rooibos Tea Tin' });

    await user.click(screen.getByRole('combobox', { name: 'Sort by' }));
    await user.click(await screen.findByRole('option', { name: 'Price: high to low' }));
    await waitFor(() =>
      expect(calls.some((c) => c.url.searchParams.get('sortBy') === 'price' && c.url.searchParams.get('order') === 'desc')).toBe(true),
    );

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'Kitchen' }));
    expect(await screen.findByText('Showing 1–1 of 1 products')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'rooibos');
    // Let the 400 ms debounce elapse inside act() so its state update is flushed.
    await act(() => new Promise((resolve) => setTimeout(resolve, 450)));
    await waitFor(() => expect(calls.some((c) => c.url.pathname === '/products/search')).toBe(true));
    // Debounced: one search request for the whole word, not one per keystroke.
    expect(calls.filter((c) => c.url.pathname === '/products/search')).toHaveLength(1);
    expect(await screen.findByRole('link', { name: 'Rooibos Tea Tin' })).toBeInTheDocument();
    // Searching clears the category (the API cannot combine them).
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent('All categories');
  });

  it('shows an error state and recovers on retry', async () => {
    let fail = true;
    mockFetch(
      on('GET', '/products/categories', () => []),
      on('GET', '/products', () => (fail ? { status: 500, body: { message: 'Down for maintenance' } } : productPage(sampleProducts))),
    );
    const { user } = renderWithProviders(<AppRoutes />);

    expect(await screen.findByRole('alert')).toHaveTextContent('The products got away');
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Cast again' }));
    expect(await screen.findByRole('link', { name: 'Rooibos Tea Tin' })).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    mockFetch(...catalogApi([]));
    renderWithProviders(<AppRoutes />);
    expect(await screen.findByText('Nothing biting')).toBeInTheDocument();
  });

  it('has no detectable accessibility violations on the catalogue or in the cart', async () => {
    mockFetch(...catalogApi());
    const { user, container } = renderWithProviders(<AppRoutes />);
    await screen.findByRole('link', { name: 'Rooibos Tea Tin' });

    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: 'Add Rooibos Tea Tin to cart' }));
    await user.click(cartButton());
    const dialog = await screen.findByRole('dialog', { name: 'Your cart' });
    expect(await axe(dialog)).toHaveNoViolations();
  });
});
