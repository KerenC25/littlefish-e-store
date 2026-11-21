import { useCallback, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { CartButton } from '../features/cart/components/CartButton';
import { CartDialog } from '../features/cart/components/CartDialog';
import { UserMenu } from '../features/auth/components/UserMenu';

const FishLogo = () => (
  <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden focusable="false">
    <path fill="currentColor" d="M6 32c8-12 20-18 32-18 9 0 15 5 20 9l-6 9 6 9c-5 4-11 9-20 9-12 0-24-6-32-18z" />
    <circle cx="20" cy="28" r="3" fill="#0b5cad" />
  </svg>
);

export const Header = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  return (
    <AppBar position="sticky" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ gap: 2 }}>
          <Box
            component={RouterLink}
            to="/"
            aria-label="Little Fish Market home"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'inherit',
              textDecoration: 'none',
              '&:focus-visible': { outline: '3px solid', outlineColor: 'secondary.main', borderRadius: 1 },
            }}
          >
            <FishLogo />
            <Typography component="span" variant="h6" fontWeight={800} sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Little Fish Market
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box component="nav" aria-label="Account and cart" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserMenu />
            <CartButton onClick={openCart} expanded={cartOpen} />
          </Box>
        </Toolbar>
      </Container>
      <CartDialog open={cartOpen} onClose={closeCart} />
    </AppBar>
  );
};
