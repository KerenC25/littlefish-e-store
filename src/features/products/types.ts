import type { EntityState } from '@reduxjs/toolkit';
import type { Cents } from '../../shared/utils/money';

/** Shape returned by DummyJSON (only the fields we use). */
export interface ApiProduct {
  id: number;
  title: string;
  description?: string;
  category: string;
  brand?: string;
  price: number;
  discountPercentage?: number;
  rating?: number;
  stock?: number;
  thumbnail: string;
  images?: string[];
  availabilityStatus?: string;
  reviews?: ApiReview[];
  tags?: string[];
}

export interface ApiReview {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
}

export interface ApiProductPage {
  products: ApiProduct[];
  total: number;
  skip: number;
  limit: number;
}

export type ApiCategory = string | { slug: string; name: string; url?: string };

/** Domain model used by the UI: money already in ZAR cents, optional fields defaulted. */
export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  brand?: string;
  priceCents: Cents;
  discountPercentage: number;
  rating: number;
  stock: number;
  thumbnail: string;
  images: string[];
  availabilityStatus?: string;
  tags: string[];
}

export interface Review {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
}

export interface ProductDetail extends Product {
  reviews: Review[];
}

export interface Category {
  slug: string;
  name: string;
}

/** A normalised page of products: `{ ids, entities }` plus paging metadata. */
export interface ProductPage extends EntityState<Product, number> {
  total: number;
}

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating-desc' | 'title-asc';

export interface ProductsQueryArgs {
  page: number;
  pageSize: number;
  sort: SortOption;
  category: string | null;
  search: string;
}
