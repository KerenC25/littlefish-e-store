import {
  catalogReducer,
  categoryChanged,
  filtersReset,
  initialCatalogState,
  pageChanged,
  pageSizeChanged,
  searchChanged,
  selectHasActiveFilters,
  selectProductsQueryArgs,
  sortChanged,
} from './catalogSlice';

describe('catalogSlice', () => {
  const onPage3 = catalogReducer(initialCatalogState, pageChanged(3));

  it.each([
    ['sort', sortChanged('price-asc')],
    ['page size', pageSizeChanged(48)],
    ['category', categoryChanged('beauty')],
    ['search', searchChanged('tea')],
  ])('resets to page 1 when %s changes', (_label, action) => {
    expect(catalogReducer(onPage3, action).page).toBe(1);
  });

  it('treats search and category as mutually exclusive (API constraint)', () => {
    const withCategory = catalogReducer(initialCatalogState, categoryChanged('beauty'));
    const searched = catalogReducer(withCategory, searchChanged('mascara'));
    expect(searched).toMatchObject({ search: 'mascara', category: null });
    expect(catalogReducer(searched, categoryChanged('furniture'))).toMatchObject({ search: '', category: 'furniture' });
  });

  it('guards against invalid pages', () => {
    expect(catalogReducer(initialCatalogState, pageChanged(0)).page).toBe(1);
  });

  it('memoises query args and trims search', () => {
    const state = { catalog: catalogReducer(initialCatalogState, searchChanged('  tea  ')) };
    expect(selectProductsQueryArgs(state).search).toBe('tea');
    expect(selectProductsQueryArgs(state)).toBe(selectProductsQueryArgs(state));
  });

  it('reports active filters and resets them', () => {
    const sorted = catalogReducer(initialCatalogState, sortChanged('rating-desc'));
    expect(selectHasActiveFilters({ catalog: sorted })).toBe(true);
    expect(catalogReducer(sorted, filtersReset())).toEqual(initialCatalogState);
  });
});
