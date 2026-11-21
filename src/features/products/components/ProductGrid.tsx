import { forwardRef, memo, useMemo, useRef, type HTMLAttributes } from 'react';
import { FixedSizeList, areEqual, type ListChildComponentProps } from 'react-window';
import Box from '@mui/material/Box';
import { useElementWidth } from '../../../shared/hooks/useElementWidth';
import type { Product } from '../types';
import { CARD_HEIGHT, ProductCard } from './ProductCard';

const GAP = 24;
const ROW_HEIGHT = CARD_HEIGHT + GAP;
/** Card min width drives the column count, mirroring `repeat(auto-fill, minmax())`. */
const MIN_CARD_WIDTH = 260;
const MAX_COLUMNS = 4;

export const columnsForWidth = (width: number): number =>
  Math.max(1, Math.min(MAX_COLUMNS, Math.floor((width + GAP) / (MIN_CARD_WIDTH + GAP))));

interface RowData {
  rows: Product[][];
  columns: number;
  /** Absolute index of the first product on this page, for aria-posinset. */
  offset: number;
  setSize: number;
}

const Row = memo(function Row({ index, style, data }: ListChildComponentProps<RowData>) {
  const row = data.rows[index] ?? [];
  return (
    <Box
      role="none"
      style={style}
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${data.columns}, minmax(0, 1fr))`,
        gap: `${GAP}px`,
        pb: `${GAP}px`,
        px: '4px', // room for focus outline and hover shadow
        boxSizing: 'border-box',
      }}
    >
      {row.map((product, column) => (
        <ProductCard
          key={product.id}
          product={product}
          position={data.offset + index * data.columns + column + 1}
          setSize={data.setSize}
        />
      ))}
    </Box>
  );
}, areEqual);

/** Scroll container: focusable so keyboard users can scroll it (WCAG 2.1.1). */
const Outer = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Outer(props, ref) {
  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable regions must be focusable
  return <div ref={ref} tabIndex={0} aria-label="Product results" role="region" {...props} />;
});

const Inner = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Inner(props, ref) {
  return <div ref={ref} role="list" aria-label="Products" {...props} />;
});

interface ProductGridProps {
  products: Product[];
  /** Index of the first product (page offset) and total result count across all pages. */
  offset: number;
  total: number;
}

/**
 * Windowed rendering: only rows inside (or just outside) the viewport are mounted, so a
 * 100-item page costs about the same to render as a 12-item page.
 */
export const ProductGrid = memo(function ProductGrid({ products, offset, total }: ProductGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(containerRef);
  const columns = columnsForWidth(width);

  const itemData = useMemo<RowData>(() => {
    const rows: Product[][] = [];
    for (let i = 0; i < products.length; i += columns) rows.push(products.slice(i, i + columns));
    return { rows, columns, offset, setSize: total };
  }, [products, columns, offset, total]);

  const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight;
  const maxHeight = Math.max(ROW_HEIGHT + GAP, viewportHeight - 180);
  const height = Math.min(itemData.rows.length * ROW_HEIGHT, maxHeight);

  return (
    <Box ref={containerRef} sx={{ width: '100%' }}>
      <FixedSizeList
        height={height}
        width="100%"
        itemCount={itemData.rows.length}
        itemSize={ROW_HEIGHT}
        itemData={itemData}
        overscanCount={2}
        outerElementType={Outer}
        innerElementType={Inner}
      >
        {Row}
      </FixedSizeList>
    </Box>
  );
});
