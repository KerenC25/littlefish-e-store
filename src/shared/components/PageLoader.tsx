import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

/** Suspense fallback for lazily loaded routes. */
export const PageLoader = ({ label = 'Loading' }: { label?: string }) => (
  <Box role="status" aria-live="polite" sx={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
    <CircularProgress aria-label={label} />
  </Box>
);
