import { usdToZarCents } from '../../shared/utils/money';
import type { ApiCategory, ApiProduct, Category, Product, ProductDetail, SortOption } from './types';

export const toProduct = (p: ApiProduct): Product => ({
  id: p.id,
  title: p.title,
  description: p.description ?? '',
  category: p.category,
  brand: p.brand,
  priceCents: usdToZarCents(p.price),
  discountPercentage: p.discountPercentage ?? 0,
  rating: p.rating ?? 0,
  stock: p.stock ?? 0,
  thumbnail: p.thumbnail,
  images: p.images ?? [],
  availabilityStatus: p.availabilityStatus,
  tags: p.tags ?? [],
});

export const toProductDetail = (p: ApiProduct): ProductDetail => ({
  ...toProduct(p),
  reviews: (p.reviews ?? []).map(({ rating, comment, date, reviewerName }) => ({
    rating,
    comment,
    date,
    reviewerName,
  })),
});

const titleCase = (slug: string): string =>
  slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** DummyJSON has returned both `string[]` and `{ slug, name }[]` over time; accept either. */
export const toCategory = (c: ApiCategory): Category =>
  typeof c === 'string' ? { slug: c, name: titleCase(c) } : { slug: c.slug, name: c.name };

export const SORT_TO_API: Record<SortOption, { sortBy?: string; order?: 'asc' | 'desc' }> = {
  featured: {},
  'price-asc': { sortBy: 'price', order: 'asc' },
  'price-desc': { sortBy: 'price', order: 'desc' },
  'rating-desc': { sortBy: 'rating', order: 'desc' },
  'title-asc': { sortBy: 'title', order: 'asc' },
};
