import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
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
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
      <SkipLink />
      <Header />
      <Container component="main" id="main-content" tabIndex={-1} maxWidth="xl" sx={{ py: { xs: 3, md: 5 }, outline: 'none' }}>
        {/* Route-level code splitting: each page's JS is fetched on first visit. */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Container>
      <Box component="footer" sx={{ py: 3, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          Little Fish Market. Small fish, fast moves. Made in Mzansi. Products and accounts from DummyJSON; payments
          simulated.
        </Typography>
      </Box>
    </Box>
  );
};
