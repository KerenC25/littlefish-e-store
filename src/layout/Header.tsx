import { useCallback, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { brand as tokens } from '../app/theme';
import { CartButton } from '../features/cart/components/CartButton';
import { CartDialog } from '../features/cart/components/CartDialog';
import { UserMenu } from '../features/auth/components/UserMenu';
import { InboxButton } from '../features/email/InboxButton';

const FishLogo = () => (
  <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden focusable="false">
    <path fill={tokens.mint} d="M6 32c8-12 20-18 32-18 9 0 15 5 20 9l-6 9 6 9c-5 4-11 9-20 9-12 0-24-6-32-18z" />
    <circle cx="20" cy="28" r="3.2" fill={tokens.ink} />
  </svg>
);

export const Header = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        // Frosted ink bar: content scrolls softly underneath.
        bgcolor: 'rgba(0, 43, 46, 0.92)',
        backdropFilter: 'saturate(160%) blur(12px)',
        borderBottom: `1px solid ${tokens.line}`,
        color: '#FFFFFF',
        // Teal focus rings vanish on ink; use mint inside the header.
        '& .Mui-focusVisible, & a:focus-visible': { outline: `3px solid ${tokens.mint} !important`, outlineOffset: 2 },
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ gap: 2, minHeight: { xs: 64, md: 72 } }}>
          <Box
            component={RouterLink}
            to="/"
            aria-label="Little Fish Market home"
            sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: 'inherit', textDecoration: 'none', borderRadius: '8px' }}
          >
            <FishLogo />
            <Typography component="span" sx={{ display: { xs: 'none', sm: 'inline' }, fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em' }}>
              little fish{' '}
              <Box component="span" sx={{ color: tokens.mint, fontWeight: 600 }}>
                market
              </Box>
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box component="nav" aria-label="Account and cart" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserMenu />
            <InboxButton />
            <CartButton onClick={openCart} expanded={cartOpen} />
          </Box>
        </Toolbar>
      </Container>
      <CartDialog open={cartOpen} onClose={closeCart} />
    </AppBar>
  );
};
