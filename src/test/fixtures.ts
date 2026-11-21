import type { ApiProduct, ApiProductPage, Product } from '../features/products/types';
import { toProduct } from '../features/products/mappers';
import type { Order } from '../features/orders/types';

export const apiProduct = (overrides: Partial<ApiProduct> = {}): ApiProduct => ({
  id: 1,
  title: 'Essence Mascara Lash Princess',
  description: 'A popular mascara.',
  category: 'beauty',
  brand: 'Essence',
  price: 10,
  discountPercentage: 10,
  rating: 4.5,
  stock: 5,
  thumbnail: 'https://cdn.example.test/1.webp',
  images: ['https://cdn.example.test/1-a.webp'],
  tags: ['beauty'],
  reviews: [],
  ...overrides,
});

export const product = (overrides: Partial<ApiProduct> = {}): Product => toProduct(apiProduct(overrides));

export const productPage = (products: ApiProduct[], total = products.length): ApiProductPage => ({
  products,
  total,
  skip: 0,
  limit: products.length,
});

export const sampleProducts: ApiProduct[] = [
  apiProduct({ id: 1, title: 'Rooibos Tea Tin', price: 10, stock: 20 }),
  apiProduct({ id: 2, title: 'Braai Tongs', price: 25, stock: 3, brand: 'Weber' }),
  apiProduct({ id: 3, title: 'Vetkoek Pan', price: 40, stock: 0 }),
];

export const loginResponse = {
  id: 1,
  username: 'emilys',
  email: 'emily@example.test',
  firstName: 'Emily',
  lastName: 'Johnson',
  image: '',
  role: 'admin',
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
};

export const order = (overrides: Partial<Order> = {}): Order => ({
  reference: 'LFM-1A2B3C4D',
  placedAt: new Date().toISOString(),
  userId: 1,
  customerName: 'Thandi Nkosi',
  email: 'thandi@example.test',
  phone: '0821234567',
  address: { street: '1 Long Street', city: 'Johannesburg', province: 'Gauteng', postalCode: '2001' },
  lines: [{ productId: 2, title: 'Braai Tongs', thumbnail: '', unitPriceCents: 462_50, quantity: 2 }],
  totals: { subtotalCents: 925_00, discountCents: 0, shippingCents: 99_00, totalCents: 1_024_00, vatCents: 133_57, couponCode: null },
  payment: { brand: 'Visa', last4: '4242' },
  ...overrides,
});
