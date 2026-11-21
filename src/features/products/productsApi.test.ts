import { makeStore } from '../../app/store';
import { createMemoryStorage } from '../../test/memoryStorage';
import { mockFetch, on } from '../../test/mockFetch';
import { productPage, sampleProducts } from '../../test/fixtures';
import { initialCatalogState } from './catalogSlice';
import { buildProductsUrl, productSelectors, productsApi } from './productsApi';
import type { ProductsQueryArgs } from './types';

const args = (overrides: Partial<ProductsQueryArgs> = {}): ProductsQueryArgs => ({
  ...initialCatalogState,
  ...overrides,
});

const newStore = () => makeStore({ durableStorage: createMemoryStorage(), authStorage: createMemoryStorage() });

describe('buildProductsUrl', () => {
  it('maps page and size to limit/skip', () => {
    const url = new URL(buildProductsUrl(args({ page: 3, pageSize: 12 })), 'https://x.test');
    expect(url.pathname).toBe('/products');
    expect(url.searchParams.get('limit')).toBe('12');
    expect(url.searchParams.get('skip')).toBe('24');
    expect(url.searchParams.get('sortBy')).toBeNull();
  });

  it('adds sorting', () => {
    const url = new URL(buildProductsUrl(args({ sort: 'price-desc' })), 'https://x.test');
    expect(url.searchParams.get('sortBy')).toBe('price');
    expect(url.searchParams.get('order')).toBe('desc');
  });

  it('uses the search resource when searching', () => {
    const url = new URL(buildProductsUrl(args({ search: 'tea & biscuits' })), 'https://x.test');
    expect(url.pathname).toBe('/products/search');
    expect(url.searchParams.get('q')).toBe('tea & biscuits');
  });

  it('uses the category resource and encodes the slug', () => {
    expect(buildProductsUrl(args({ category: 'home decoration' }))).toMatch(/^\/products\/category\/home%20decoration\?/);
  });
});

describe('productsApi (store integration)', () => {
  it('fetches, converts prices to ZAR and normalises into entities', async () => {
    mockFetch(on('GET', '/products', () => productPage(sampleProducts, 194)));
    const store = newStore();

    const { data } = await store.dispatch(productsApi.endpoints.getProducts.initiate(args()));

    expect(data?.total).toBe(194);
    expect(data?.ids).toEqual([1, 2, 3]);
    expect(data && productSelectors.selectById(data, 2)).toMatchObject({ title: 'Braai Tongs', priceCents: 462_50 });
  });

  it('serves repeat requests from cache', async () => {
    const { calls } = mockFetch(on('GET', '/products', () => productPage(sampleProducts)));
    const store = newStore();

    const first = store.dispatch(productsApi.endpoints.getProducts.initiate(args()));
    await first;
    const second = store.dispatch(productsApi.endpoints.getProducts.initiate(args()));
    await second;

    expect(calls).toHaveLength(1);
    first.unsubscribe();
    second.unsubscribe();
  });

  it('caches each page separately', async () => {
    const { calls } = mockFetch(on('GET', '/products', () => productPage(sampleProducts)));
    const store = newStore();

    await store.dispatch(productsApi.endpoints.getProducts.initiate(args({ page: 1 })));
    await store.dispatch(productsApi.endpoints.getProducts.initiate(args({ page: 2 })));
    await store.dispatch(productsApi.endpoints.getProducts.initiate(args({ page: 1 })));

    expect(calls.map((c) => c.url.searchParams.get('skip'))).toEqual(['0', '24']);
  });

  it('exposes error state for failed requests', async () => {
    mockFetch(on('GET', '/products', () => ({ status: 500, body: { message: 'Server sad' } })));
    const store = newStore();

    const result = await store.dispatch(productsApi.endpoints.getProducts.initiate(args()));

    expect(result.isError).toBe(true);
    expect(result.error).toMatchObject({ status: 500 });
  });

  it('normalises both category response shapes', async () => {
    mockFetch(on('GET', '/products/categories', () => ['home-decoration', { slug: 'beauty', name: 'Beauty' }]));
    const store = newStore();

    const { data } = await store.dispatch(productsApi.endpoints.getCategories.initiate());

    expect(data).toEqual([
      { slug: 'home-decoration', name: 'Home Decoration' },
      { slug: 'beauty', name: 'Beauty' },
    ]);
  });
});
