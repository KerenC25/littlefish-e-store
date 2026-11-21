import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Address search-as-you-type, backed by Photon (https://photon.komoot.io): a free, keyless
 * geocoder built on OpenStreetMap data and designed for autocomplete. (OSM's own Nominatim
 * forbids autocomplete use, so it is not used here.)
 *
 * Deliberately a *separate* API slice with a plain fetchBaseQuery: the main `api` attaches the
 * user's bearer token, which must never be sent to a third party.
 */
export const GEOCODER_URL = 'https://photon.komoot.io';

/** South Africa's bounding box (lon/lat), so suggestions stay local. */
const ZA_BBOX = '16.3,-35.0,33.0,-22.0';

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    locality?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    countrycode?: string;
    type?: string;
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

export interface AddressSuggestion {
  id: string;
  /** Street line, e.g. "12 Long Street". */
  street: string;
  city: string;
  province: string;
  postalCode: string;
  /** One-line label for the dropdown. */
  label: string;
  lat: number;
  lon: number;
}

/** Maps a Photon feature to a checkout address. Exported for unit tests. */
export const toSuggestion = (f: PhotonFeature, index: number): AddressSuggestion | null => {
  const p = f.properties;
  if (p.countrycode && p.countrycode.toUpperCase() !== 'ZA') return null;
  const roadName = p.street ?? (p.type === 'street' ? p.name : undefined);
  const street = [p.housenumber, roadName].filter(Boolean).join(' ') || p.name || '';
  const city = p.city ?? p.town ?? p.village ?? p.locality ?? p.county ?? '';
  if (!street) return null;
  const [lon, lat] = f.geometry.coordinates;
  const label = [street, p.district && !/ward/i.test(p.district) ? p.district : undefined, city, p.state]
    .filter((part, i, all) => part && all.indexOf(part) === i)
    .join(', ');
  return {
    id: `${p.osm_id ?? 'x'}-${index}`,
    street,
    city,
    province: p.state ?? '',
    postalCode: p.postcode && /^\d{4}$/.test(p.postcode) ? p.postcode : '',
    label,
    lat,
    lon,
  };
};

export const geocodingApi = createApi({
  reducerPath: 'geocoding',
  baseQuery: fetchBaseQuery({ baseUrl: GEOCODER_URL }),
  // Typed prefixes repeat a lot ("12 Lo", "12 Lon"...): keep results a while.
  keepUnusedDataFor: 600,
  endpoints: (build) => ({
    searchAddresses: build.query<AddressSuggestion[], string>({
      query: (q) => ({ url: '/api/', params: { q, limit: 6, lang: 'en', bbox: ZA_BBOX } }),
      transformResponse: (r: PhotonResponse) =>
        r.features.map(toSuggestion).filter((s): s is AddressSuggestion => s !== null),
    }),
  }),
});

export const { useSearchAddressesQuery } = geocodingApi;
