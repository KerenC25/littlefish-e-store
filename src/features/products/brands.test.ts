import { product } from '../../test/fixtures';
import { brandPage, deriveBrands, groupBrandsByLetter } from './brands';
import { initialCatalogState } from './catalogSlice';
import { productSelectors } from './productsApi';

const catalogue = [
  product({ id: 1, title: 'iPhone', brand: 'Apple', price: 900, rating: 4.1 }),
  product({ id: 2, title: 'Galaxy', brand: 'Samsung', price: 800, rating: 4.8 }),
  product({ id: 3, title: 'AirPods', brand: 'Apple', price: 150, rating: 4.9 }),
  product({ id: 4, title: 'Mug', brand: undefined, price: 5 }),
  product({ id: 5, title: 'MacBook', brand: 'Apple', price: 1500, rating: 4.5 }),
  product({ id: 6, title: 'Kettle', brand: '  ', price: 30 }),
  product({ id: 7, title: 'Watch', brand: '3M', price: 30 }),
];

describe('deriveBrands', () => {
  it('counts products per brand, most popular first, ignoring blank brands', () => {
    expect(deriveBrands(catalogue).map((b) => [b.name, b.productCount])).toEqual([
      ['Apple', 3],
      ['3M', 1],
      ['Samsung', 1],
    ]);
  });

  it('uses the first product image as the tile artwork', () => {
    expect(deriveBrands(catalogue)[0]?.thumbnail).toBe(catalogue[0]?.thumbnail);
  });
});

describe('groupBrandsByLetter', () => {
  it('groups A–Z and puts non-letters last under #', () => {
    expect(groupBrandsByLetter(deriveBrands(catalogue)).map(([letter, list]) => [letter, list.map((b) => b.name)])).toEqual([
      ['A', ['Apple']],
      ['S', ['Samsung']],
      ['#', ['3M']],
    ]);
  });
});

describe('brandPage', () => {
  const args = { ...initialCatalogState, brand: 'Apple' };
  const titles = (page: ReturnType<typeof brandPage>) => productSelectors.selectAll(page).map((p) => p.title);

  it('filters to one brand and keeps API order for "featured"', () => {
    const page = brandPage(catalogue, args);
    expect(page.total).toBe(3);
    expect(titles(page)).toEqual(['iPhone', 'AirPods', 'MacBook']);
  });

  it.each([
    ['price-asc', ['AirPods', 'iPhone', 'MacBook']],
    ['price-desc', ['MacBook', 'iPhone', 'AirPods']],
    ['rating-desc', ['AirPods', 'MacBook', 'iPhone']],
    ['title-asc', ['AirPods', 'iPhone', 'MacBook']],
  ] as const)('sorts by %s', (sort, expected) => {
    expect(titles(brandPage(catalogue, { ...args, sort }))).toEqual(expected);
  });

  it('pages client-side but reports the full total', () => {
    const page2 = brandPage(catalogue, { ...args, pageSize: 2, page: 2 });
    expect(page2.total).toBe(3);
    expect(titles(page2)).toEqual(['MacBook']);
  });

  it('returns an empty page for an unknown brand', () => {
    expect(brandPage(catalogue, { ...args, brand: 'Nokia' })).toMatchObject({ ids: [], total: 0 });
  });
});
