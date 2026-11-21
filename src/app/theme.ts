import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const baseTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0b5cad', contrastText: '#ffffff' },
    secondary: { main: '#f2994a', contrastText: '#1b1b1b' },
    background: { default: '#f6f8fb', paper: '#ffffff' },
    text: { primary: '#14213d', secondary: '#4a5568' },
    success: { main: '#1e7b4f' },
    error: { main: '#b3261e' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Respect users who ask the OS to reduce motion (WCAG 2.3.3).
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiButtonBase: {
      defaultProps: { disableRipple: false },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focusVisible': {
            outline: `3px solid ${theme.palette.secondary.main}`,
            outlineOffset: 2,
          },
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focusVisible': {
            outline: `3px solid ${theme.palette.secondary.main}`,
            outlineOffset: 2,
          },
        }),
      },
    },
  },
});

export const theme = responsiveFontSizes(baseTheme);
