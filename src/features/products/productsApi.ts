import { createEntityAdapter } from '@reduxjs/toolkit';
import { api } from '../../services/api';
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

/**
 * Builds the request URL. DummyJSON exposes search and category as separate resources and
 * cannot combine them, which is why the catalog slice treats them as mutually exclusive.
 */
export const buildProductsUrl = ({ page, pageSize, sort, category, search }: ProductsQueryArgs): string => {
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

  const term = search.trim();
  if (term) {
    params.set('q', term);
    return `/products/search?${params.toString()}`;
  }
  if (category) return `/products/category/${encodeURIComponent(category)}?${params.toString()}`;
  return `/products?${params.toString()}`;
};

export const productsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query<ProductPage, ProductsQueryArgs>({
      query: buildProductsUrl,
      // Normalise into `{ ids, entities }` so lookups by id are O(1) and rows can
      // subscribe to a single entity without re-rendering the whole list.
      transformResponse: (response: ApiProductPage): ProductPage => ({
        ...productsAdapter.setAll(productsAdapter.getInitialState(), response.products.map(toProduct)),
        total: response.total,
      }),
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
      query: () => `/products?limit=0&select=${LIST_FIELDS}`,
      transformResponse: (response: ApiProductPage) => response.products.map(toProduct),
      providesTags: [{ type: 'Product', id: 'INDEX' }],
      keepUnusedDataFor: 600,
    }),
    getProduct: build.query<ProductDetail, number>({
      query: (id) => `/products/${id}`,
      transformResponse: (response: ApiProduct) => toProductDetail(response),
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    getCategories: build.query<Category[], void>({
      query: () => '/products/categories',
      transformResponse: (response: ApiCategory[]) => response.map(toCategory),
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
