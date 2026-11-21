import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Tracks an element's content width with ResizeObserver, falling back to `fallback` where
 * layout is unavailable (jsdom, or the first paint before measurement).
 */
export const useElementWidth = (ref: RefObject<HTMLElement | null>, fallback = 1200): number => {
  const [width, setWidth] = useState(fallback);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = (w: number) => setWidth(w > 0 ? Math.floor(w) : fallback);
    measure(element.getBoundingClientRect().width);

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) measure(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, fallback]);

  return width;
};
