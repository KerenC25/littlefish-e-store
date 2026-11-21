import { screen, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { AppRoutes } from '../app/AppRoutes';
import { apiProduct, productPage } from './fixtures';
import { mockFetch, on } from './mockFetch';
import { renderWithProviders } from './renderWithProviders';

const catalogue = [
  apiProduct({ id: 1, title: 'Rooibos Tea Tin', brand: 'Essence', price: 10, stock: 20 }),
  apiProduct({ id: 2, title: 'Braai Tongs', brand: 'Weber', price: 25, stock: 3 }),
  apiProduct({ id: 3, title: 'Vetkoek Pan', brand: 'Essence', price: 40, stock: 4 }),
  apiProduct({ id: 4, title: 'Plain Mug', brand: undefined, price: 5, stock: 9 }),
];

const api = () =>
  mockFetch(
    on('GET', '/products/categories', () => [{ slug: 'kitchen', name: 'Kitchen' }]),
    on('GET', '/products', () => productPage(catalogue)),
    on('GET', '/products/category/kitchen', () => productPage(catalogue.slice(1, 2))),
  );

const products = () => within(screen.getByRole('list', { name: 'Products' })).getAllByRole('listitem');

describe('Shop by brand (integration)', () => {
  it('lists brands with product counts and shows stats in the hero', async () => {
    api();
    renderWithProviders(<AppRoutes />);

    const rail = await screen.findByRole('list', { name: 'Featured brands' });
    expect(await within(rail).findByRole('button', { name: 'Essence, 2 products' })).toBeInTheDocument();
    expect(within(rail).getByRole('button', { name: 'Weber, 1 product' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('2 brands, one cart. Pick a favourite.')).toBeInTheDocument();
  });

  it('filters the grid by brand, client-side, and clears again', async () => {
    const { calls } = api();
    const { user } = renderWithProviders(<AppRoutes />);
    const weber = await screen.findByRole('button', { name: 'Weber, 1 product' });
    await screen.findByRole('link', { name: 'Rooibos Tea Tin' });
    const requestsBefore = calls.length;

    await user.click(weber);

    expect(await screen.findByRole('heading', { level: 2, name: 'Weber' })).toBeInTheDocument();
    expect(products()).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Braai Tongs' })).toBeInTheDocument();
    expect(screen.getByText('Showing 1–1 of 1 products from Weber')).toBeInTheDocument();
    expect(weber).toHaveAttribute('aria-pressed', 'true');
    // Served from the cached catalogue: no new request.
    expect(calls).toHaveLength(requestsBefore);

    await user.click(screen.getByRole('button', { name: 'Clear brand: Weber' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Fresh in the shop' })).toBeInTheDocument();
    expect(products()).toHaveLength(4);
  });

  it('toggles a brand off when its tile is clicked again', async () => {
    api();
    const { user } = renderWithProviders(<AppRoutes />);
    const essence = await screen.findByRole('button', { name: 'Essence, 2 products' });

    await user.click(essence);
    expect(await screen.findByText('Showing 1–2 of 2 products from Essence')).toBeInTheDocument();
    await user.click(essence);
    expect(essence).toHaveAttribute('aria-pressed', 'false');
    expect(await screen.findByText('Showing 1–4 of 4 products')).toBeInTheDocument();
  });

  it('sorts brand results', async () => {
    api();
    const { user } = renderWithProviders(<AppRoutes />);
    await user.click(await screen.findByRole('button', { name: 'Essence, 2 products' }));
    await screen.findByText('Showing 1–2 of 2 products from Essence');

    await user.click(screen.getByRole('combobox', { name: 'Sort by' }));
    await user.click(await screen.findByRole('option', { name: 'Price: high to low' }));

    await waitFor(() =>
      expect(products().map((li) => within(li).getByRole('link').textContent)).toEqual(['Vetkoek Pan', 'Rooibos Tea Tin']),
    );
  });

  it('choosing a category replaces the brand filter', async () => {
    api();
    const { user } = renderWithProviders(<AppRoutes />);
    await user.click(await screen.findByRole('button', { name: 'Essence, 2 products' }));
    await screen.findByText('Showing 1–2 of 2 products from Essence');

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'Kitchen' }));

    expect(await screen.findByText('Showing 1–1 of 1 products')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clear brand/ })).not.toBeInTheDocument();
  });

  it('finds a brand in the A–Z directory', async () => {
    api();
    const { user } = renderWithProviders(<AppRoutes />);
    await screen.findByRole('button', { name: 'Essence, 2 products' });

    await user.click(screen.getByRole('button', { name: 'All brands A–Z' }));
    const dialog = await screen.findByRole('dialog', { name: 'All brands, A to Z' });
    expect(within(dialog).getByRole('heading', { name: 'E' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'W' })).toBeInTheDocument();

    await user.type(within(dialog).getByRole('searchbox', { name: 'Find a brand' }), 'web');
    expect(within(dialog).getByText('1 brand')).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'E' })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /^Weber/ }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Showing 1–1 of 1 products from Weber')).toBeInTheDocument();
  });

  it('hides the rail, but keeps the shop working, if the catalogue index fails', async () => {
    mockFetch(
      on('GET', '/products/categories', () => []),
      on('GET', '/products', (req) =>
        req.url.searchParams.get('limit') === '0' ? { status: 500, body: {} } : productPage(catalogue),
      ),
    );
    renderWithProviders(<AppRoutes />);

    expect(await screen.findByRole('link', { name: 'Rooibos Tea Tin' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Shop by brand' })).not.toBeInTheDocument());
  });

  it('has no detectable accessibility violations in the rail or the directory', async () => {
    api();
    const { user, container } = renderWithProviders(<AppRoutes />);
    await screen.findByRole('button', { name: 'Essence, 2 products' });
    await screen.findByRole('link', { name: 'Rooibos Tea Tin' });
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: 'All brands A–Z' }));
    expect(await axe(await screen.findByRole('dialog', { name: 'All brands, A to Z' }))).toHaveNoViolations();
  }, 60_000);
});
