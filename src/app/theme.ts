import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';

/**
 * Brand tokens taken from the littlefish palette (littlefishapp.com): deep teal "ink",
 * teal, mint and amber, with orange as a sparing accent. Use these for bespoke surfaces;
 * everything else should go through the MUI palette so components stay consistent.
 *
 * Contrast (WCAG AA) was checked for every text pairing used:
 *  - white on ink #002B2E ≈ 14:1, mint on ink ≈ 9:1, body #BCD2CF on ink ≈ 9:1
 *  - white on deep teal #00646A ≈ 7:1 (teal #008779 is only 4.4:1, so it is not used under text)
 *  - on-amber #2B1600 on amber #FFA61A ≈ 9:1, on orange #FF4F0C ≈ 5:1
 */
export const brand = {
  void: '#000F10',
  ink: '#002B2E',
  surface: '#001A1C',
  line: '#1F4A4C',
  tealDeep: '#00646A',
  teal: '#008779',
  mint: '#8EE3C9',
  mintWash: '#E6F6F0',
  amber: '#FFA61A',
  amberLight: '#FFD08A',
  orange: '#FF4F0C',
  onAmber: '#2B1600',
  body: '#BCD2CF',
  canvas: '#F2FBF8',
} as const;

const focusRing = `3px solid ${brand.tealDeep}`;

const baseTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brand.tealDeep, light: brand.teal, dark: '#00464A', contrastText: '#FFFFFF' },
    secondary: { main: brand.amber, light: '#FFB43D', dark: '#E08E00', contrastText: brand.onAmber },
    warning: { main: brand.orange, contrastText: brand.onAmber },
    success: { main: '#1E7B4F' },
    error: { main: '#B3261E' },
    background: { default: brand.canvas, paper: '#FFFFFF' },
    text: { primary: brand.ink, secondary: '#3D5C59' },
    divider: alpha(brand.ink, 0.12),
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.02 },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 800, letterSpacing: '-0.01em' },
    h6: { fontWeight: 700 },
    overline: { fontWeight: 700, letterSpacing: '0.12em' },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
        '::selection': { background: brand.mint, color: brand.ink },
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
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        // Pill buttons, as on littlefishapp.com.
        root: { borderRadius: 999, paddingInline: 20, '&.Mui-focusVisible': { outline: focusRing, outlineOffset: 2 } },
        sizeLarge: { paddingBlock: 12, paddingInline: 28, fontSize: '1rem' },
        containedSecondary: { '&:hover': { backgroundColor: '#FFB43D' } },
        outlined: { borderWidth: 1.5, '&:hover': { borderWidth: 1.5 } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { '&.Mui-focusVisible': { outline: focusRing, outlineOffset: 2 } },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: { '&.Mui-focusVisible': { outline: focusRing, outlineOffset: 2 } },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 20 } },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 20 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { backgroundColor: '#FFFFFF' } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 24 } },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 999 } },
    },
  },
});

export const theme = responsiveFontSizes(baseTheme);
