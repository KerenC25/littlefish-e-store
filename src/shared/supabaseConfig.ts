/**
 * Supabase Auth settings, injected at build time by Vite `define` (see vite.config.ts) from
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Under Jest the same names are plain globals.
 *
 * The anon key is a public, browser-safe key by design. We only call Supabase Auth, never
 * tables, so there is no data for it to expose. It is still kept out of the repo so each
 * deployment points at its own project.
 *
 * Read lazily (a function, not a constant) so tests can switch sign-up on and off.
 */
// Replaced by Vite `define` at build time; real globals under Jest (jest.config.cjs).
// Declared here rather than in vite-env.d.ts so ts-jest sees them too.
declare const __LFM_SUPABASE_URL__: string | undefined;
declare const __LFM_SUPABASE_ANON_KEY__: string | undefined;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const read = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const getSupabaseConfig = (): SupabaseConfig | null => {
  const url = read(typeof __LFM_SUPABASE_URL__ === 'undefined' ? undefined : __LFM_SUPABASE_URL__).replace(/\/+$/, '');
  const anonKey = read(typeof __LFM_SUPABASE_ANON_KEY__ === 'undefined' ? undefined : __LFM_SUPABASE_ANON_KEY__);
  // Only HTTPS: credentials must never travel in clear text.
  if (!url.startsWith('https://') || anonKey === '') return null;
  return { url, anonKey };
};

export const isSignUpEnabled = (): boolean => getSupabaseConfig() !== null;
