import { createEntityAdapter } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { api } from '../../services/api';
import { HIDDEN_CATEGORIES } from '../../shared/config';
import { SORT_TO_API, toCategory, toProduct, toProductDetail } from './mappers';
import type {
  ApiCategory,
  ApiProduct,
  ApiProductPage,
  Category,
  Product,
  ProductDetail,
  ProductPage,
  ProductsQueryArgs,
} from './types';

/** Fields the listing needs. Asking for less keeps list payloads small. */
const LIST_FIELDS = [
  'title',
  'price',
  'discountPercentage',
  'rating',
  'stock',
  'thumbnail',
  'category',
  'brand',
  'availabilityStatus',
].join(',');

export const productsAdapter = createEntityAdapter<Product>();
export const productSelectors = productsAdapter.getSelectors();

/** Whether the shop sells this category at all (groceries are not stocked). */
export const isListedCategory = (slug: string): boolean => !HIDDEN_CATEGORIES.includes(slug);
export const isListed = (product: { category: string }): boolean => isListedCategory(product.category);

/** What decides *which* products match; paging is applied afterwards. */
export type ProductSetArgs = Pick<ProductsQueryArgs, 'sort' | 'category' | 'search'>;

/**
 * Builds the request URL for every product matching the filters (`limit=0`), sorted by the
 * API. DummyJSON exposes search and category as separate resources and cannot combine them,
 * which is why the catalog slice treats them as mutually exclusive.
 *
 * Why the whole set and not one server page: DummyJSON cannot exclude a category, so hidden
 * categories have to be removed here. Removing them from a server page would leave short
 * pages and a wrong total; removing them from the full (small, listing-fields-only) set and
 * paging afterwards keeps both exact.
 */
export const buildProductSetUrl = ({ sort, category, search }: ProductSetArgs): string => {
  const params = new URLSearchParams({ limit: '0', select: LIST_FIELDS });
  const { sortBy, order } = SORT_TO_API[sort];
  if (sortBy && order) {
    params.set('sortBy', sortBy);
    params.set('order', order);
  }

  const term = search.trim();
  if (term) {
    params.set('q', term);
    return `/products/search?${params.toString()}`;
  }
  if (category) return `/products/category/${encodeURIComponent(category)}?${params.toString()}`;
  return `/products?${params.toString()}`;
};

/**
 * Category views are paged by the server (`limit`/`skip`). A listed category can never
 * contain hidden products, so every server page is already complete and its total exact.
 */
export const usesServerPaging = ({ category, search }: Pick<ProductsQueryArgs, 'category' | 'search'>): boolean =>
  category !== null && search.trim() === '';

export const buildCategoryPageUrl = ({ page, pageSize, sort, category }: ProductsQueryArgs): string => {
  const params = new URLSearchParams({
    limit: String(pageSize),
    skip: String((page - 1) * pageSize),
    select: LIST_FIELDS,
  });
  const { sortBy, order } = SORT_TO_API[sort];
  if (sortBy && order) {
    params.set('sortBy', sortBy);
    params.set('order', order);
  }
  return `/products/category/${encodeURIComponent(category ?? '')}?${params.toString()}`;
};

/** One page of an already filtered and sorted list, normalised into `{ ids, entities }`. */
export const toProductPage = (products: readonly Product[], page: number, pageSize: number): ProductPage => {
  const start = (page - 1) * pageSize;
  return {
    ...productsAdapter.setAll(productsAdapter.getInitialState(), products.slice(start, start + pageSize)),
    total: products.length,
  };
};

const listedProducts = (response: ApiProductPage): Product[] => response.products.map(toProduct).filter(isListed);

/** The unfiltered, unsorted catalogue: what the brand rail and hero stats are built from. */
const ALL_PRODUCTS: ProductSetArgs = { sort: 'featured', category: null, search: '' };

/** Step 1: the matching set, cached per filter combination (shared by every page of it). */
const productSetApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProductSet: build.query<Product[], ProductSetArgs>({
      query: buildProductSetUrl,
      transformResponse: listedProducts,
      providesTags: [{ type: 'Product', id: 'LIST' }],
    }),
  }),
});

export const productsApi = productSetApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Category views: one server page per request (`limit`/`skip`), cached per page.
     * Everything else (all products, search): a page of the cached matching set, cut locally,
     * because those are the only lists that can contain hidden categories.
     */
    getProducts: build.query<ProductPage, ProductsQueryArgs>({
      async queryFn(args, { dispatch }, _extra, baseQuery) {
        const { page, pageSize, sort, category, search } = args;
        if (usesServerPaging(args)) {
          // A hidden category (e.g. a stale or hand-edited filter) is simply empty.
          if (category && !isListedCategory(category)) return { data: toProductPage([], page, pageSize) };
          const result = await baseQuery(buildCategoryPageUrl(args));
          if (result.error) return { error: result.error };
          const response = result.data as ApiProductPage;
          return {
            data: {
              ...productsAdapter.setAll(productsAdapter.getInitialState(), response.products.map(toProduct)),
              total: response.total,
            },
          };
        }

        const request = dispatch(productSetApi.endpoints.getProductSet.initiate({ sort, category, search }));
        try {
          const result = await request;
          if (result.error) return { error: result.error as FetchBaseQueryError };
          return { data: toProductPage(result.data ?? [], page, pageSize) };
        } finally {
          // The set stays cached for keepUnusedDataFor; we only needed it to build this page.
          request.unsubscribe();
        }
      },
      providesTags: (result) => [
        { type: 'Product' as const, id: 'LIST' },
        ...(result?.ids ?? []).map((id) => ({ type: 'Product' as const, id })),
      ],
    }),
    /**
     * The whole catalogue (limit=0), listing fields only. Shared by the brand rail, the hero
     * stats and brand results, so it is fetched once and cached for 10 minutes.
     */
    getCatalogIndex: build.query<Product[], void>({
      // Same request as the unfiltered list, so it is made once and shared with page 1.
      async queryFn(_arg, { dispatch }) {
        const request = dispatch(productSetApi.endpoints.getProductSet.initiate(ALL_PRODUCTS));
        try {
          const result = await request;
          return result.error ? { error: result.error as FetchBaseQueryError } : { data: result.data ?? [] };
        } finally {
          request.unsubscribe();
        }
      },
      providesTags: [{ type: 'Product', id: 'INDEX' }],
      keepUnusedDataFor: 600,
    }),
    getProduct: build.query<ProductDetail, number>({
      async queryFn(id, _api, _extra, baseQuery) {
        const result = await baseQuery(`/products/${id}`);
        if (result.error) return { error: result.error };
        const product = toProductDetail(result.data as ApiProduct);
        // A direct link to something we do not stock gets the same answer as a missing one.
        if (!isListed(product)) return { error: { status: 404, data: { message: 'Product not found' } } };
        return { data: product };
      },
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    getCategories: build.query<Category[], void>({
      query: () => '/products/categories',
      transformResponse: (response: ApiCategory[]) => response.map(toCategory).filter((c) => isListedCategory(c.slug)),
      providesTags: ['Category'],
      // Categories almost never change; keep them for an hour.
      keepUnusedDataFor: 3600,
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetCatalogIndexQuery,
  useGetProductQuery,
  useGetCategoriesQuery,
  usePrefetch,
} = productsApi;
