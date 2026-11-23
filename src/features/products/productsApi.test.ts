import { makeStore } from '../../app/store';
import { createMemoryStorage } from '../../test/memoryStorage';
import { mockFetch, on } from '../../test/mockFetch';
import { apiProduct, productPage, sampleProducts } from '../../test/fixtures';
import { initialCatalogState } from './catalogSlice';
import { buildProductSetUrl, productSelectors, productsApi } from './productsApi';
import type { ProductsQueryArgs } from './types';

const args = (overrides: Partial<ProductsQueryArgs> = {}): ProductsQueryArgs => ({
  ...initialCatalogState,
  ...overrides,
});

const newStore = () => makeStore({ durableStorage: createMemoryStorage(), authStorage: createMemoryStorage() });

const chicken = apiProduct({ id: 20, title: 'Chicken Meat', category: 'groceries', price: 9 });
const milk = apiProduct({ id: 21, title: 'Milk', category: 'groceries', price: 2 });

describe('buildProductSetUrl', () => {
  it('asks for the whole matching set with listing fields only', () => {
    const url = new URL(buildProductSetUrl(args()), 'https://x.test');
    expect(url.pathname).toBe('/products');
    expect(url.searchParams.get('limit')).toBe('0');
    expect(url.searchParams.get('skip')).toBeNull();
    expect(url.searchParams.get('select')).toContain('category');
    expect(url.searchParams.get('sortBy')).toBeNull();
  });

  it('adds sorting', () => {
    const url = new URL(buildProductSetUrl(args({ sort: 'price-desc' })), 'https://x.test');
    expect(url.searchParams.get('sortBy')).toBe('price');
    expect(url.searchParams.get('order')).toBe('desc');
  });

  it('uses the search resource when searching', () => {
    const url = new URL(buildProductSetUrl(args({ search: 'tea & biscuits' })), 'https://x.test');
    expect(url.pathname).toBe('/products/search');
    expect(url.searchParams.get('q')).toBe('tea & biscuits');
  });

  it('uses the category resource and encodes the slug', () => {
    expect(buildProductSetUrl(args({ category: 'home decoration' }))).toMatch(/^\/products\/category\/home%20decoration\?/);
  });
});

describe('productsApi (store integration)', () => {
  it('fetches, converts prices to ZAR and normalises into entities', async () => {
    mockFetch(on('GET', '/products', () => productPage(sampleProducts)));
    const store = newStore();

    const { data } = await store.dispatch(productsApi.endpoints.getProducts.initiate(args()));

    expect(data?.total).toBe(3);
    expect(data?.ids).toEqual([1, 2, 3]);
    expect(data && productSelectors.selectById(data, 2)).toMatchObject({ title: 'Braai Tongs', priceCents: 462_99 });
  });

  it('pages locally with an exact total', async () => {
    const many = Array.from({ length: 30 }, (_, i) => apiProduct({ id: i + 1, title: `Item ${i + 1}` }));
    mockFetch(on('GET', '/products', () => productPage(many)));
    const store = newStore();

    const { data } = await store.dispatch(productsApi.endpoints.getProducts.initiate(args({ page: 2, pageSize: 12 })));

    expect(data?.total).toBe(30);
    expect(data?.ids).toEqual([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
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

  it('fetches a filter set once and serves every page of it from cache', async () => {
    const { calls } = mockFetch(on('GET', '/products', () => productPage(sampleProducts)));
    const store = newStore();

    await store.dispatch(productsApi.endpoints.getProducts.initiate(args({ page: 1 })));
    await store.dispatch(productsApi.endpoints.getProducts.initiate(args({ page: 2 })));
    await store.dispatch(productsApi.endpoints.getProducts.initiate(args({ page: 1, sort: 'price-asc' })));

    expect(calls.map((c) => c.url.searchParams.get('sortBy'))).toEqual([null, 'price']);
  });

  it('shares one request between the catalogue index and the unfiltered list', async () => {
    const { calls } = mockFetch(on('GET', '/products', () => productPage(sampleProducts)));
    const store = newStore();

    await Promise.all([
      store.dispatch(productsApi.endpoints.getCatalogIndex.initiate()),
      store.dispatch(productsApi.endpoints.getProducts.initiate(args())),
    ]);

    expect(calls).toHaveLength(1);
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

describe('groceries are not stocked', () => {
  it('drops them from listings and counts them out of the total', async () => {
    mockFetch(on('GET', '/products', () => productPage([sampleProducts[0]!, chicken, sampleProducts[1]!, milk], 4)));
    const store = newStore();

    const { data } = await store.dispatch(productsApi.endpoints.getProducts.initiate(args()));

    expect(data?.ids).toEqual([1, 2]);
    expect(data?.total).toBe(2);
  });

  it('drops them from search results', async () => {
    mockFetch(on('GET', '/products/search', () => productPage([chicken])));
    const store = newStore();

    const { data } = await store.dispatch(productsApi.endpoints.getProducts.initiate(args({ search: 'chicken' })));

    expect(data?.total).toBe(0);
  });

  it('drops them from the catalogue index (brands and hero stats)', async () => {
    mockFetch(on('GET', '/products', () => productPage([chicken, sampleProducts[1]!])));
    const store = newStore();

    const { data } = await store.dispatch(productsApi.endpoints.getCatalogIndex.initiate());

    expect(data?.map((p) => p.title)).toEqual(['Braai Tongs']);
  });

  it('removes the Groceries category', async () => {
    mockFetch(on('GET', '/products/categories', () => [{ slug: 'groceries', name: 'Groceries' }, 'beauty']));
    const store = newStore();

    const { data } = await store.dispatch(productsApi.endpoints.getCategories.initiate());

    expect(data).toEqual([{ slug: 'beauty', name: 'Beauty' }]);
  });

  it('answers a direct link to a grocery product with 404', async () => {
    mockFetch(on('GET', '/products/20', () => chicken));
    const store = newStore();

    const result = await store.dispatch(productsApi.endpoints.getProduct.initiate(20));

    expect(result.error).toMatchObject({ status: 404 });
  });
});
