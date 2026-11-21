# Little Fish Market

A single-page e-commerce store built for the **Littlefish Advanced Frontend Technical Assessment**.

React 18 · TypeScript (strict) · Redux Toolkit · RTK Query · MUI 6 · React Router 6 · react-window · Jest + React Testing Library + jest-axe

**Live demo:** https://kerenc25.github.io/littlefish-e-store/

Products, categories and user accounts come from the public [DummyJSON](https://dummyjson.com) API. Payments go through a simulated gateway modelled on Stripe's PaymentIntent flow, so no real money moves.

---

## Getting started

**Prerequisites:** Node.js 20 or later and npm 10 or later.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Jest suite once |
| `npm run test:coverage` | Run the suite and write a coverage report to `coverage/` |
| `npm run lint` | ESLint, including `jsx-a11y` and React Hooks rules |
| `npm run typecheck` | TypeScript only |

**API keys and configuration:** none needed. DummyJSON is public. All settings (API URL, exchange rate, delivery threshold, VAT, page sizes) are in [`src/shared/config.ts`](src/shared/config.ts).

### Deployment

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It runs lint and tests, builds with `--base=/littlefish-e-store/`, and publishes `dist/` to GitHub Pages. GitHub Pages has no SPA rewrites, so the workflow copies `index.html` to `404.html` so that deep links like `/checkout` still load the app.

### Demo credentials

| | |
| --- | --- |
| Username | `emilys` |
| Password | `emilyspass` |

The sign-in page has a **Fill in** button for these.

### Test cards (simulated gateway)

Use any future expiry (for example `12/30`) and any 3-digit CVC.

| Card number | Result |
| --- | --- |
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 3220` | Bank approval (3-D Secure) challenge |

---

## Architecture

```
src/
├── app/                 Composition root: store, typed hooks, providers, routes, theme
├── services/            Shared RTK Query API slice + auth-aware base query (token refresh)
├── features/            One folder per business capability, each owning its state + UI
│   ├── products/        catalogSlice (query state), productsApi (endpoints), pages, components
│   ├── cart/            Normalised cart slice, persistence, modal, line items, badge
│   ├── auth/            authSlice, authApi, session restore, route guard, login page
│   └── checkout/        Payment-gateway abstraction, simulator, form validation, state machine
├── shared/              Feature-agnostic building blocks: config, utils, hooks, components, notifications
├── layout/              App shell (header, skip link, main landmark, footer)
├── pages/               Route-level pages that do not belong to a feature (404)
└── test/                Test utilities, fixtures, fetch mock, integration tests
```

**Dependency rule:** `features` depend on `shared` and `services`, never the other way round. Features talk to each other through Redux actions and selectors, not by reaching into each other's internals. `app/` is the only place that knows about every feature. It is where the store, the providers and the payment gateway are wired together.

### Key decisions

| Decision | Why |
| --- | --- |
| **One RTK Query API with `injectEndpoints` per feature** | One cache, one middleware and one auth-aware base query. Each feature still declares its own endpoints, so adding one means adding a file, not editing a central one (open/closed). |
| **Catalogue query state in Redux** (`catalogSlice`) | The toolbar, grid, pagination and result count all read the same state, with no prop drilling. Coming back to the shop restores your page and filters. |
| **Search and category are mutually exclusive** | DummyJSON serves them as separate resources and cannot combine them. The reducer enforces this, and the UI says so. |
| **Money as integer cents (ZAR)** | Avoids floating-point drift. USD prices are converted once in a mapper at the API boundary, at a fixed rate set in config. A real store would price in Rand at source. |
| **Cart lines snapshot product data** | The cart does not depend on whichever product page happens to be cached, and it rehydrates from storage without a network call. |
| **Persistence in listener middleware** | Reducers stay pure. Storage is injected into `makeStore`, so tests use in-memory fakes. |
| **Payment gateway behind an interface, provided via Context** | The checkout depends on `PaymentGateway`, not on a vendor. Swapping in Stripe, PayFast or Peach Payments means writing one adapter. Tests inject a zero-latency instance. |
| **Checkout as an explicit state machine** (`useCheckout`) | `idle → processing → (authenticating) → succeeded / failed`. Impossible states cannot occur, and double submits are ignored. |
| **Vite + manual vendor chunks** | React, Redux and MUI each get a long-term-cacheable chunk, separate from app code that changes often. |

---

## How each core requirement is met

### Complex state management
- **Normalisation:** `createEntityAdapter` is used for both the cart (`ids` + `entities`) and every product page returned by RTK Query (`transformResponse` builds `{ ids, entities, total }`).
- **Async flows:** RTK Query handles loading, fetching, error and success for all reads and writes. `createAsyncThunk` handles session restore (refresh token, then profile). A single-flight lock in `baseQueryWithReauth` makes simultaneous 401s share one refresh call.
- **Error states:** every request has a designed error state with retry ("Cast again"), plus empty states. Errors are mapped to user-safe messages in `shared/utils/errors.ts`.
- **Cross-component synchronisation:** the header badge, each product's "Add another (n in cart)" button, the cart modal, the free-delivery progress bar and the checkout summary all derive from the same cart slice through memoised selectors. The integration test `keeps the header badge, product buttons and cart modal in sync` checks this.

### Performance
- **Virtualised list:** `react-window` `FixedSizeList` renders only visible rows of the product grid. Each row is a CSS Grid whose column count follows the container width (`ResizeObserver`).
- **Memoisation:** `React.memo` on cards, rows, price, toolbar and line items. `createSelector` for derived data, plus a memoised query-args selector so the query hook gets a stable argument. Every cart button and line item selects *only its own* entity, so changing one quantity re-renders one component.
- **Lazy loading:** route-level code splitting with `React.lazy` + `Suspense` (detail, login, checkout and 404 pages are separate chunks). Images use `loading="lazy"` and `decoding="async"` with explicit dimensions to avoid layout shift. Skeletons match card size.
- **Network:** list requests use DummyJSON's `select` to fetch only the fields the grid needs. Search is debounced (400 ms). The next page is prefetched, and product details are prefetched when a card is hovered or focused. Cache lifetimes are tuned per endpoint (categories for 1 hour).
- **Fonts:** Inter is self-hosted via `@fontsource`, Latin subset only.

### Advanced API integration (RTK Query)
Pagination (`limit`/`skip`), sorting (`sortBy`/`order`), filtering (category, search), caching (per-argument cache entries, `keepUnusedDataFor`, tags, `refetchOnReconnect`), prefetching, and authenticated requests with transparent token refresh and retry.

### Testing
**122 tests across 14 suites, covering 96.6% of lines and 85.3% of branches** (`npm run test:coverage`). The suites cover:
- **Redux store:** reducers and selectors (`cartSlice`, `catalogSlice`), memoisation, and persistence through the real store and listener middleware, including tampered storage and storage that throws.
- **Async actions:** RTK Query endpoints against a mocked `fetch` (normalisation, ZAR conversion, cache hits, per-page caching, error state). Also `baseQueryWithReauth` (401 → refresh → retry, failed refresh → logout and storage cleared) and the session-restore thunk.
- **Component interactions (integration):** the real store, router, theme and contexts rendered together. Covers browsing, filtering, sorting, debounced search, add/increase/remove in the cart modal, focus returning after Escape, error/retry and empty states, the sign-in redirect and return, form validation with focus on the first invalid field, and successful, declined and 3-D Secure payments.
- **Pages:** the product detail page (rendering, focus on load, image gallery, add to cart, sold-out state, not found, invalid ids rejected without an API call, error and retry, back link) and the 404 route.
- **Accessibility:** `jest-axe` runs on **every route**: catalogue, open cart dialog, product detail, sign-in (clean and with validation errors), checkout (before and after a failed submit) and 404. It caught two real issues during development, both now fixed: a skipped heading level on product cards, and the checkout summary being an `<aside>` nested inside `<main>`.

### Security and authentication
- **Real authentication** against DummyJSON's JWT endpoints (`/auth/login`, `/auth/refresh`, `/auth/me`).
- **Token handling:** the access token lives **in memory only**. The refresh token is stored in `sessionStorage` so a reload can restore the session, and it is cleared when the tab closes or the user signs out. In production I would move the refresh token into an `httpOnly`, `Secure`, `SameSite` cookie set by the server, so script can never read it.
- **Authorisation:** `RequireAuth` guards `/checkout` and supports role checks (`roles` prop). It is a UX guard, not the security boundary; the API must enforce the same rules.
- **Open-redirect guard:** after sign-in we only redirect to same-origin paths (`safeRedirectPath`).
- **Untrusted input:** everything read from storage is schema-validated before use. Inputs have length limits. No `dangerouslySetInnerHTML`, so React's escaping handles injection.
- **Card data:** never in Redux, never persisted, wiped from the form after every attempt. Only the last 4 digits are kept, for the receipt.
- **Minimal data:** only the profile fields the UI needs are kept from the login response.
- **Not done here (needs a server):** CSP and other security headers, and rate limiting. I would set these at the hosting or CDN layer.

### Accessibility
- **Navigation and landmarks:** skip link, landmarks (`header`, `nav`, `main`, `footer`, `search`) and a logical heading order.
- **Dialogs:** MUI Dialog gives a focus trap, Escape to close and focus restored to the trigger. The cart button announces its count ("Cart, 3 items") and exposes `aria-haspopup`/`aria-expanded`.
- **Accessible names:** every repeated control names its product ("Add Braai Tongs to cart", "Increase quantity of Braai Tongs").
- **Virtualised list:** it remains a list for assistive technology (`role="list"`, with `aria-posinset`/`aria-setsize` on each item), and its scroll container is keyboard-focusable.
- **Live regions:** polite live regions for result counts and toasts, and `role="alert"` for errors.
- **Forms:** labelled fields, `autocomplete` tokens, helper text tied to inputs via `aria-describedby`, an error summary, and focus moved to the first invalid field.
- **Non-visual equivalents:** ratings and strikethrough prices have text alternatives.
- **Visuals:** visible focus outlines, colours chosen for contrast, and all animation disabled under `prefers-reduced-motion`.
- **Limits:** automated checks (`jsx-a11y` lint and axe) catch a subset of WCAG issues. Full conformance needs manual testing with screen readers (NVDA, VoiceOver) and keyboard-only use. I have not done that audit here.

### Design implementation
- **Grid:** CSS Grid for the product rows, card internals (`grid-template-rows`), the toolbar (template changes per breakpoint), cart line items (`grid-template-areas`), checkout (two-column with a sticky summary) and the product detail page.
- **Flexbox:** used for toolbars, price rows and steppers.
- **Animation:** entry animation on cards and hover/focus lift, plus a slide-up cart modal on mobile, where it goes full screen.
- **Typography:** Inter throughout.

### Architecture
Feature-sliced folders, a single composition root, dependency injection for side-effectful services (storage, payment gateway), pure functions for business rules (totals, validation, card checks, URL building) and thin components.

---

## Brand and design

**Palette.** The palette is taken from [littlefishapp.com](https://littlefishapp.com):

| Token | Colour |
| --- | --- |
| Ink | `#002B2E` |
| Void | `#000F10` |
| Teal | `#008779` |
| Deep teal | `#00646A` |
| Mint | `#8EE3C9` |
| Amber | `#FFA61A` |
| Orange accent | `#FF4F0C` |

The tokens live in [`src/app/theme.ts`](src/app/theme.ts), and every text pairing was checked for WCAG AA contrast. One example: teal `#008779` is only 4.4:1 against white, so white text sits on deep teal instead. Amber is the call-to-action colour, with dark `#2B1600` text on it.

**Look and feel.**
- A frosted ink header.
- A dark hero with a gradient headline, slowly drifting glows and a swimming outline fish. Motion is disabled under `prefers-reduced-motion`, and the clipped-gradient text falls back to solid in Windows High Contrast.
- Pill buttons, 20px cards, and badges for discounts and top-rated products.
- An ink footer.
- Inter throughout, as the brief requires. littlefish's own site uses Plus Jakarta Sans.

**Voice.** "Small fish. Fast moves." is my own riff on littlefish's speed-over-size idea, retold as a South African shop.

**Shop by brand.** A brand carousel similar to the ones on Takealot and Superbalist:
- Wordmark tiles over a product photo, so no trademarked logos are used.
- Scroll-snap, with arrow buttons on larger screens.
- An **A–Z directory** dialog with search and letter jump links.

DummyJSON has no brand filter, so the full catalogue (194 products, listing fields only) is fetched once and cached for 10 minutes. Brands, brand filtering, sorting and paging are then derived client-side by pure, unit-tested functions in [`src/features/products/brands.ts`](src/features/products/brands.ts). The same cached request feeds the hero stats. Brand, category and search are mutually exclusive, which the reducer enforces. If the catalogue request fails, the rail hides and the rest of the shop keeps working.

## Bonus tasks

- **Persistent cart:** `localStorage`, versioned and schema-validated, via listener middleware.
- **Payment gateway simulation:** the full PaymentIntent-style flow, with success, decline, insufficient funds and a 3-D Secure "approve on your banking app" challenge.
- **Global state without Redux:** `NotificationsContext` (Context + `useReducer`) for toasts. It is split so that senders never re-render when the queue changes. `PaymentGatewayContext` is used for dependency injection.

## Code review exercise

See [`CODE_REVIEW.md`](CODE_REVIEW.md).

---

## Challenges and trade-offs

- **Search + category:** DummyJSON cannot combine them, so the reducer makes them mutually exclusive. Merging them client-side would have broken server-side pagination.
- **Virtualisation vs. a responsive grid:** react-window virtualises one axis. I virtualise rows and let CSS Grid lay out columns, with the column count taken from the measured width. The trade-off is that the grid scrolls inside its own container rather than with the window.
- **Virtualisation vs. keyboard users:** rows outside the window are not in the DOM, so Tab cannot reach them until you scroll. Overscan and a focusable scroll container reduce the problem. For very small pages, plain rendering would be just as fast.
- **Currency:** the API prices in USD. I convert at a fixed, documented rate rather than calling a live FX API, which keeps totals deterministic and testable.
- **Tokens in a pure SPA:** without a backend I cannot set `httpOnly` cookies. I chose memory plus `sessionStorage` as the least risky client-only option and documented the production approach.

## What I would do next

- Sync catalogue state to the URL (shareable, bookmarkable filters).
- Run Playwright end-to-end tests against the real API, with an axe scan of every route.
- Add a dark mode via a colour-scheme context.
- Add a service worker for offline browsing of cached products.
