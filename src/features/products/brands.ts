import { productsAdapter } from './productsApi';
import type { Product, ProductPage, ProductsQueryArgs, SortOption } from './types';

/**
 * Brand browsing, done client-side.
 *
 * DummyJSON has no brand filter (`/products/filter` does not exist), and search only matches
 * titles. The whole catalogue is small (under 200 items), so we fetch it once, cache it, and
 * derive brands, filtering, sorting and paging from it here as pure functions.
 */
export interface Brand {
  name: string;
  productCount: number;
  /** A representative product image, used as the tile artwork. */
  thumbnail: string;
}

export const deriveBrands = (products: readonly Product[]): Brand[] => {
  const byName = new Map<string, Brand>();
  for (const p of products) {
    const name = p.brand?.trim();
    if (!name) continue;
    const existing = byName.get(name);
    if (existing) existing.productCount += 1;
    else byName.set(name, { name, productCount: 1, thumbnail: p.thumbnail });
  }
  return [...byName.values()].sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));
};

/** A–Z groups for the brand directory. Names not starting with a letter go under "#". */
export const groupBrandsByLetter = (brands: readonly Brand[]): [string, Brand[]][] => {
  const groups = new Map<string, Brand[]>();
  for (const b of [...brands].sort((x, y) => x.name.localeCompare(y.name))) {
    const first = b.name.charAt(0).toUpperCase();
    const key = /[A-Z]/.test(first) ? first : '#';
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  return [...groups.entries()].sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
};

const comparators: Record<SortOption, ((a: Product, b: Product) => number) | null> = {
  featured: null, // keep API order
  'price-asc': (a, b) => a.priceCents - b.priceCents,
  'price-desc': (a, b) => b.priceCents - a.priceCents,
  'rating-desc': (a, b) => b.rating - a.rating,
  'title-asc': (a, b) => a.title.localeCompare(b.title),
};

/** Same shape as the server-paged query, so the grid cannot tell the difference. */
export const brandPage = (
  products: readonly Product[],
  { brand, sort, page, pageSize }: Pick<ProductsQueryArgs, 'brand' | 'sort' | 'page' | 'pageSize'>,
): ProductPage => {
  const matching = products.filter((p) => p.brand === brand);
  const compare = comparators[sort];
  // Array.prototype.sort is stable (ES2019), so ties keep API order.
  const sorted = compare ? [...matching].sort(compare) : matching;
  const start = (page - 1) * pageSize;
  return {
    ...productsAdapter.setAll(productsAdapter.getInitialState(), sorted.slice(start, start + pageSize)),
    total: matching.length,
  };
};
