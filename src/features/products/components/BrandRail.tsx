import { memo, useCallback, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { deriveBrands } from '../brands';
import { brandChanged, selectActiveBrand } from '../catalogSlice';
import { useGetCatalogIndexQuery } from '../productsApi';
import { BrandDirectoryDialog } from './BrandDirectoryDialog';
import { BrandTile } from './BrandTile';

/** How many brands get a tile; the rest live in the A–Z directory. */
const FEATURED_BRANDS = 16;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** "Shop by brand" carousel, like the brand rails on Takealot and Superbalist. */
export const BrandRail = memo(function BrandRail() {
  const dispatch = useAppDispatch();
  const activeBrand = useAppSelector(selectActiveBrand);
  const { data: products, isLoading, isError } = useGetCatalogIndexQuery();
  const brands = useMemo(() => (products ? deriveBrands(products) : []), [products]);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const scroller = useRef<HTMLUListElement>(null);

  // Keep the selected brand visible in the rail even if it is not a top brand.
  const featured = useMemo(() => {
    const top = brands.slice(0, FEATURED_BRANDS);
    const selected = brands.find((b) => b.name === activeBrand);
    return selected && !top.includes(selected) ? [selected, ...top] : top;
  }, [brands, activeBrand]);

  const select = useCallback(
    (name: string) => {
      // Clicking the active brand again clears the filter, like a toggle.
      dispatch(brandChanged(name === activeBrand ? null : name));
      setDirectoryOpen(false);
      document.getElementById('results')?.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    },
    [dispatch, activeBrand],
  );

  const scrollBy = (direction: 1 | -1) => {
    const el = scroller.current;
    el?.scrollBy?.({ left: direction * el.clientWidth * 0.8, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  // Brands are a browsing aid, not essential: if the index fails, the grid still works.
  if (isError) return null;

  return (
    <Box component="section" id="brands" aria-labelledby="brands-heading" sx={{ mb: { xs: 4, md: 6 }, scrollMarginTop: 96 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography id="brands-heading" variant="h5" component="h2">
            Shop by brand
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {brands.length > 0 ? `${brands.length} brands, one cart. Pick a favourite.` : 'Loading the line-up…'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => scrollBy(-1)} aria-label="Scroll brands left" sx={{ border: 1, borderColor: 'divider', display: { xs: 'none', sm: 'inline-flex' } }}>
            <ChevronLeftIcon aria-hidden />
          </IconButton>
          <IconButton onClick={() => scrollBy(1)} aria-label="Scroll brands right" sx={{ border: 1, borderColor: 'divider', display: { xs: 'none', sm: 'inline-flex' } }}>
            <ChevronRightIcon aria-hidden />
          </IconButton>
          <Button variant="outlined" onClick={() => setDirectoryOpen(true)} disabled={brands.length === 0} aria-haspopup="dialog">
            All brands A–Z
          </Button>
        </Box>
      </Box>

      <Box
        component="ul"
        ref={scroller}
        aria-label="Featured brands"
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0.5,
          pb: 1.5,
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: { xs: '44%', sm: '28%', md: '18%', lg: '14%' },
          gap: 2,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollPaddingInline: 4,
          // Hide the scrollbar but keep scrolling (wheel, touch, keyboard via focus).
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          maskImage: 'linear-gradient(90deg, black 92%, transparent)',
        }}
      >
        {isLoading
          ? Array.from({ length: 7 }, (_, i) => (
              <Box component="li" key={i} aria-hidden>
                <Skeleton variant="rounded" height={156} sx={{ borderRadius: '20px' }} />
              </Box>
            ))
          : featured.map((b) => (
              <Box component="li" key={b.name} sx={{ scrollSnapAlign: 'start', height: 156 }}>
                <BrandTile brand={b} active={b.name === activeBrand} onSelect={select} />
              </Box>
            ))}
      </Box>

      <BrandDirectoryDialog
        open={directoryOpen}
        brands={brands}
        activeBrand={activeBrand}
        onClose={() => setDirectoryOpen(false)}
        onSelect={select}
      />
    </Box>
  );
});
