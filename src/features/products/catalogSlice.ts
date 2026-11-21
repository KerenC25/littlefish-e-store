import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_PAGE_SIZE } from '../../shared/config';
import type { ProductsQueryArgs, SortOption } from './types';

/**
 * UI state that drives the products query. Keeping it in Redux (rather than local state)
 * lets the hero, brand rail, toolbar, grid, pagination and result summary stay in sync
 * without prop drilling, and makes "back to the same page/filters" free.
 *
 * Search, category and brand are mutually exclusive: DummyJSON cannot combine search with
 * category, and brand filtering is client-side over the full catalogue.
 */
export type CatalogState = ProductsQueryArgs;

export const initialCatalogState: CatalogState = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sort: 'featured',
  category: null,
  brand: null,
  search: '',
};

const catalogSlice = createSlice({
  name: 'catalog',
  initialState: initialCatalogState,
  reducers: {
    pageChanged(state, action: PayloadAction<number>) {
      state.page = Math.max(1, Math.floor(action.payload));
    },
    pageSizeChanged(state, action: PayloadAction<number>) {
      state.pageSize = action.payload;
      state.page = 1;
    },
    sortChanged(state, action: PayloadAction<SortOption>) {
      state.sort = action.payload;
      state.page = 1;
    },
    categoryChanged(state, action: PayloadAction<string | null>) {
      state.category = action.payload;
      state.brand = null;
      state.search = '';
      state.page = 1;
    },
    brandChanged(state, action: PayloadAction<string | null>) {
      state.brand = action.payload;
      state.category = null;
      state.search = '';
      state.page = 1;
    },
    searchChanged(state, action: PayloadAction<string>) {
      state.search = action.payload;
      if (action.payload.trim()) {
        state.category = null;
        state.brand = null;
      }
      state.page = 1;
    },
    filtersReset() {
      return initialCatalogState;
    },
  },
});

export const {
  pageChanged,
  pageSizeChanged,
  sortChanged,
  categoryChanged,
  brandChanged,
  searchChanged,
  filtersReset,
} = catalogSlice.actions;
export const catalogReducer = catalogSlice.reducer;

const selectCatalog = (state: { catalog: CatalogState }) => state.catalog;

export const selectActiveBrand = (state: { catalog: CatalogState }) => state.catalog.brand;

/** Memoised so the query hook receives a referentially stable argument object. */
export const selectProductsQueryArgs = createSelector(
  [selectCatalog],
  ({ page, pageSize, sort, category, brand, search }): ProductsQueryArgs => ({
    page,
    pageSize,
    sort,
    category,
    brand,
    search: search.trim(),
  }),
);

export const selectHasActiveFilters = createSelector(
  [selectCatalog],
  (c) => c.category !== null || c.brand !== null || c.search.trim() !== '' || c.sort !== 'featured',
);
