import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { CARD_HEIGHT } from './ProductCard';

/** Placeholder with the same footprint as real cards, so the layout does not jump (CLS). */
export const ProductGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <Box
    aria-hidden
    sx={{
      display: 'grid',
      gap: 3,
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    }}
  >
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} variant="rounded" height={CARD_HEIGHT} sx={{ borderRadius: '20px' }} />
    ))}
  </Box>
);
