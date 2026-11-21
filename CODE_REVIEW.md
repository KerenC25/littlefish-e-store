# Code review exercise

> **Note:** The assessment brief asks for a critique of "a provided code snippet or pull request", but none came with the brief. Below is a review of a representative snippet, written the way I would leave it on a pull request. If Littlefish sends a specific snippet, I will review that one in this same format.

## The pull request

> **PR #42: Add product list with cart**
> "Shows products and lets users add them to the cart. Works on my machine."

```tsx
import React, { useState, useEffect } from 'react';

export default function ProductList(props: any) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState<any[]>(JSON.parse(localStorage.getItem('cart')!));
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('https://dummyjson.com/products?limit=200&q=' + search)
      .then(res => res.json())
      .then(data => setProducts(data.products));
  });

  const addToCart = (p: any) => {
    cart.push(p);
    setCart(cart);
    localStorage.setItem('cart', JSON.stringify(cart));
    props.onCartChange(cart.length);
  };

  return (
    <div>
      <input onChange={e => setSearch(e.target.value)} placeholder="Search" />
      {products.filter((p: any) => p.title.includes(search)).map((p: any, i) => (
        <div key={i} onClick={() => addToCart(p)} style={{ display: 'inline-block', width: 200 }}>
          <img src={p.thumbnail} />
          <div dangerouslySetInnerHTML={{ __html: p.title }} />
          <b>${p.price}</b>
        </div>
      ))}
      <span>Total: {cart.reduce((a, b) => a + b.price, 0)}</span>
    </div>
  );
}
```

## Review

Thanks for getting this up quickly. The happy path works and the component is easy to follow. A few things need to change before we merge, and I've grouped them by priority. Happy to pair on any of them.

### 🔴 Must fix (blocking)

**1. Infinite request loop.** `useEffect` has no dependency array, so it runs after *every* render. Each fetch calls `setProducts`, which renders again, which fetches again. That's a continuous stream of requests to the API for as long as the page is open.

```tsx
useEffect(() => { /* ... */ }, [search]);
```

Even better, move this to RTK Query (`useGetProductsQuery({ search })`). That gives us caching, request de-duplication, loading and error states, and cancellation, all of which this version would otherwise have to hand-roll.

**2. State mutation, so the UI won't update reliably.** `cart.push(p); setCart(cart)` mutates the existing array and passes the *same reference* back. React bails out because nothing appears to have changed, so the total can go stale.

```tsx
setCart(prev => [...prev, p]);
```

**3. XSS via `dangerouslySetInnerHTML`.** The title comes from an API we don't control. If it ever contains `<img src=x onerror=...>`, that script runs in our users' sessions, with access to their tokens. React escapes text by default, so `{p.title}` is both safer and simpler. I'd block `dangerouslySetInnerHTML` with a lint rule.

**4. Crash on first visit.** `localStorage.getItem('cart')` is `null` for a new user. `JSON.parse(null)` returns `null`, and `cart.push` then throws. The `!` tells TypeScript to stop warning us about exactly this. Storage can also contain anything (an old format, a user edit) or throw outright (Safari private mode). Read it defensively, validate the shape, and fall back to `[]`.

**5. Not usable by keyboard or screen-reader users (WCAG 2.1.1, 4.1.2).** A clickable `<div>` can't be focused or activated with the keyboard, and it has no role. The image has no `alt`, and the search input has only a placeholder, no label. Use a real `<button>` ("Add {title} to cart"), add `alt`, and add a `<label>` or `aria-label`.

### 🟠 Should fix

**6. Search is doing two jobs, and both are a bit broken.** The URL sends `q` to `/products`, which ignores it; search lives at `/products/search`. Then we filter client-side, which is case-sensitive (`'phone'` won't match `'iPhone'`) and only covers what was fetched. Pick one: server-side search with debouncing (about 300 to 400 ms) plus pagination is the scalable option.

**7. `key={i}`.** Index keys break when the list is filtered or reordered: React reuses the wrong DOM nodes, and state ends up on the wrong card. Use `p.id`.

**8. No loading, error or empty states.** If the request fails, `data.products` is `undefined`, the next render throws on `.filter`, and the whole page goes white. Handle `res.ok`, show a retry, and show something when there are no results.

**9. Race condition.** Type quickly and an older, slower response can arrive after a newer one and overwrite it. You need an `AbortController` in the effect cleanup (RTK Query does this for us).

**10. Money maths.** `$` is hard-coded and prices are summed as floats (`0.1 + 0.2`). Work in integer cents and format with `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })`.

**11. Duplicate items in the cart.** Adding the same product twice creates two lines, and `cart.length` counts lines, not units. A normalised cart (`{ ids, entities }` keyed by product id, with a `quantity`) fixes both problems and makes updates O(1).

### 🟡 Suggestions

**12. Types.** `props: any` and `any[]` switch off the compiler exactly where it helps most. Define `Product` and `CartItem`, and type the props (`onCartChange: (count: number) => void`).

**13. Single responsibility.** This component fetches, searches, filters, persists, manages the cart and renders. Splitting it (a data hook or API slice, a cart slice, a presentational `ProductCard`) makes each piece testable on its own. It would also let the header badge read cart state directly instead of being told through `onCartChange`, which drifts out of sync as soon as a second component can change the cart.

**14. Performance.** `limit=200` renders 200 cards and 200 images up front. Paginate, virtualise long lists, add `loading="lazy"` with explicit `width` and `height` on images, and memoise the card.

**15. Styling.** The inline `style` objects are recreated on every render and bypass the theme. Use MUI `sx` or `styled()` with theme tokens, and use CSS Grid for the layout, so it is responsive.

**16. Tests.** A couple of RTL tests would have caught items 1, 2 and 4: render, add the same item twice, assert the total, and start with empty storage.

### Summary

The structure is a good starting point. The blocking items are the render loop (1), the mutation bug (2), the XSS risk (3), the crash for new users (4) and keyboard access (5). Most of the rest goes away if we lean on RTK Query and a normalised cart slice, which is how the rest of this repo already works (`features/products/productsApi.ts`, `features/cart/cartSlice.ts`). Shout if you want to go through any of it together.
