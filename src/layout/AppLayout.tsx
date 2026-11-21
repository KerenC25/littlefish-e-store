import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { brand } from '../app/theme';
import { PageLoader } from '../shared/components/PageLoader';
import { SkipLink } from '../shared/components/SkipLink';
import { Header } from './Header';

export const AppLayout = () => {
  const { pathname } = useLocation();

  // SPA navigation does not reset scroll the way a full page load does.
  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [pathname]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        // minmax(0, 1fr) stops wide content (e.g. the brand carousel) from stretching the
        // page past the viewport; the default `auto` column grows to fit its min-content.
        gridTemplateColumns: 'minmax(0, 1fr)',
      }}
    >
      <SkipLink />
      <Header />
      <Container component="main" id="main-content" tabIndex={-1} maxWidth="xl" sx={{ py: { xs: 3, md: 5 }, outline: 'none' }}>
        {/* Route-level code splitting: each page's JS is fetched on first visit. */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Container>
      <Box component="footer" sx={{ mt: 6, bgcolor: brand.ink, color: brand.body }}>
        <Container
          maxWidth="xl"
          sx={{ py: { xs: 4, md: 5 }, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>
            Small fish.{' '}
            <Box component="span" sx={{ color: brand.mint }}>
              Fast moves.
            </Box>
          </Typography>
          <Typography variant="body2">
            Made in Mzansi. Products and accounts from DummyJSON; payments simulated. No real fish were harmed.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};
