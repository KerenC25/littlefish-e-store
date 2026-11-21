import { screen, waitFor, within } from '@testing-library/react';
import { AppRoutes } from '../app/AppRoutes';
import { cartAdapter } from '../features/cart/cartSlice';
import { matchProvince } from '../features/checkout/checkoutForm';
import { osmEmbedUrl } from '../features/checkout/address/AddressMap';
import { toSuggestion } from '../services/geocodingApi';
import { productPage, sampleProducts } from './fixtures';
import { mockFetch, on, type MockRequest } from './mockFetch';
import { renderWithProviders } from './renderWithProviders';

const feature = (properties: Record<string, unknown>, coordinates: [number, number] = [28.0473, -26.2041]) => ({
  geometry: { coordinates },
  properties,
});

const photonResults = {
  features: [
    feature({ osm_id: 1, housenumber: '12', street: 'Long Street', district: 'Ward 124', city: 'Johannesburg', state: 'Gauteng', postcode: '2001', countrycode: 'ZA', type: 'house' }),
    feature({ osm_id: 2, name: 'Long Street', type: 'street', city: 'Cape Town', state: 'Western Cape', postcode: '8001', countrycode: 'ZA' }, [18.418, -33.924]),
    feature({ osm_id: 3, name: 'Long Street', type: 'street', city: 'London', countrycode: 'GB' }),
  ],
};

const signedIn = {
  user: { id: 1, username: 'emilys', email: 'emily@example.test', firstName: 'Emily', lastName: 'Johnson' },
  accessToken: 'secret-access-token',
  refreshToken: 'refresh-1',
};

const cart = cartAdapter.setAll(cartAdapter.getInitialState(), [
  { productId: 2, title: 'Braai Tongs', thumbnail: '', unitPriceCents: 462_50, quantity: 1, maxQuantity: 3 },
]);

describe('address helpers', () => {
  it('maps geocoder results to checkout fields and drops non-SA results', () => {
    expect(toSuggestion(photonResults.features[0]!, 0)).toMatchObject({
      street: '12 Long Street',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2001',
      label: '12 Long Street, Johannesburg, Gauteng', // municipal "Ward" districts are noise
      lat: -26.2041,
      lon: 28.0473,
    });
    expect(toSuggestion(photonResults.features[1]!, 1)?.street).toBe('Long Street');
    expect(toSuggestion(photonResults.features[2]!, 2)).toBeNull();
    expect(toSuggestion(feature({ countrycode: 'ZA', postcode: 'ABC' }), 3)).toBeNull(); // nothing usable
  });

  it('matches province names loosely', () => {
    expect(matchProvince('Kwazulu Natal')).toBe('KwaZulu-Natal');
    expect(matchProvince('gauteng')).toBe('Gauteng');
    expect(matchProvince('Narnia')).toBe('');
  });

  it('builds an OpenStreetMap embed with a marker', () => {
    expect(osmEmbedUrl(-26.2041, 28.0473)).toBe(
      'https://www.openstreetmap.org/export/embed.html?bbox=28.04130,-26.20810,28.05330,-26.20010&layer=mapnik&marker=-26.20410,28.04730',
    );
  });
});

describe('Address search at checkout (integration)', () => {
  const geocoder = (respond: (req: MockRequest) => unknown = () => photonResults) =>
    on('GET', '/api/', (req) => (req.url.hostname === 'photon.komoot.io' ? respond(req) : undefined));

  it('suggests SA addresses as you type and fills the whole address block', async () => {
    const { calls } = mockFetch(geocoder());
    const { user } = renderWithProviders(<AppRoutes />, { route: '/checkout', preloadedState: { cart, auth: signedIn } });
    const street = await screen.findByRole('combobox', { name: /Street address/ });

    await user.type(street, '12 Long');
    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(2); // the London result is filtered out
    expect(options[0]).toHaveTextContent('12 Long Street');
    expect(options[0]).toHaveTextContent('Johannesburg, Gauteng, 2001');

    await user.click(options[0]!);

    expect(street).toHaveValue('12 Long Street');
    expect(screen.getByRole('textbox', { name: /City or town/ })).toHaveValue('Johannesburg');
    expect(screen.getByRole('combobox', { name: /Province/ })).toHaveTextContent('Gauteng');
    expect(screen.getByRole('textbox', { name: /Postal code/ })).toHaveValue('2001');
    expect(screen.getByTitle('Map showing 12 Long Street, Johannesburg, Gauteng')).toHaveAttribute(
      'src',
      expect.stringContaining('marker=-26.20410,28.04730'),
    );

    // Debounced (one search for the whole word), scoped to SA, and never sent the user's token.
    const searches = calls.filter((c) => c.url.hostname === 'photon.komoot.io');
    expect(searches).toHaveLength(1);
    expect(searches[0]?.url.searchParams.get('q')).toBe('12 Long');
    expect(searches[0]?.url.searchParams.get('bbox')).toBe('16.3,-35.0,33.0,-22.0');
    expect(searches[0]?.headers.get('Authorization')).toBeNull();
  });

  it('does not search for very short input, and removes the map if the address is edited by hand', async () => {
    const { calls } = mockFetch(geocoder());
    const { user } = renderWithProviders(<AppRoutes />, { route: '/checkout', preloadedState: { cart, auth: signedIn } });
    const street = await screen.findByRole('combobox', { name: /Street address/ });

    await user.type(street, '12');
    await new Promise((r) => setTimeout(r, 450));
    expect(calls.filter((c) => c.url.hostname === 'photon.komoot.io')).toHaveLength(0);

    await user.type(street, ' Long');
    await user.click(within(await screen.findByRole('listbox')).getAllByRole('option')[0]!);
    expect(screen.getByTitle(/Map showing/)).toBeInTheDocument();

    await user.type(street, ' Unit 4');
    expect(screen.queryByTitle(/Map showing/)).not.toBeInTheDocument();
    expect(street).toHaveValue('12 Long Street Unit 4');
  });

  it('still lets you type an address when the search service is down', async () => {
    mockFetch(geocoder(() => ({ status: 503, body: {} })));
    const { user } = renderWithProviders(<AppRoutes />, { route: '/checkout', preloadedState: { cart, auth: signedIn } });
    const street = await screen.findByRole('combobox', { name: /Street address/ });

    await user.type(street, '7 Vilakazi Street');
    expect(await screen.findByText('Address search is unavailable. Just type your address.')).toBeInTheDocument();
    expect(street).toHaveValue('7 Vilakazi Street');
  });
});

describe('Empty cart "Start fishing"', () => {
  it('takes you to the shop from any page, e.g. the inbox', async () => {
    mockFetch(on('GET', '/products/categories', () => []), on('GET', '/products', () => productPage(sampleProducts)));
    const { user } = renderWithProviders(<AppRoutes />, { route: '/inbox' });
    await screen.findByRole('heading', { level: 1, name: 'Demo inbox' });

    await user.click(screen.getByRole('button', { name: 'Cart, empty' }));
    const dialog = await screen.findByRole('dialog', { name: 'Your cart' });
    expect(within(dialog).getByText('Your net is empty!')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Start fishing' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Small fish. Fast moves.' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
