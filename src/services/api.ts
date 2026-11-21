import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

/**
 * One API slice for the whole app. Features add their endpoints with `injectEndpoints`,
 * which keeps each feature self-contained (open/closed) while sharing one cache,
 * one middleware and one auth-aware base query.
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'Category', 'Me'],
  keepUnusedDataFor: 300,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
