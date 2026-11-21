import { memo, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/material/styles';
import { brand as tokens } from '../../../app/theme';
import { deriveBrands } from '../brands';
import { useGetCatalogIndexQuery, useGetCategoriesQuery } from '../productsApi';

const drift = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50%      { transform: translate3d(24px, -16px, 0) scale(1.06); }
`;

const swim = keyframes`
  0%, 100% { transform: translateX(0) rotate(-4deg); }
  50%      { transform: translateX(-18px) rotate(2deg); }
`;

const PERKS = ['Delivery now-now, not just now', 'Free delivery over R1 000', 'Checkout in under a minute'];

/** Decorative only: hidden from assistive tech. */
const Glow = ({ color, size, top, left, delay = 0 }: { color: string; size: number; top: string; left: string; delay?: number }) => (
  <Box
    aria-hidden
    sx={{
      position: 'absolute',
      top,
      left,
      width: size,
      height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      opacity: 0.55,
      filter: 'blur(8px)',
      animation: `${drift} 14s ease-in-out ${delay}s infinite`,
      pointerEvents: 'none',
    }}
  />
);

export const Hero = memo(function Hero() {
  // Both queries are shared with other components, so this costs no extra requests.
  const { data: products } = useGetCatalogIndexQuery();
  const { data: categories } = useGetCategoriesQuery();
  const brandCount = useMemo(() => (products ? deriveBrands(products).length : undefined), [products]);

  const stats = [
    { value: products?.length, label: 'products' },
    { value: brandCount, label: 'brands' },
    { value: categories?.length, label: 'categories' },
  ].filter((s): s is { value: number; label: string } => typeof s.value === 'number');

  return (
    <Box
      component="section"
      aria-labelledby="catalog-heading"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        // Explicit px: numeric sx radii are multiplied by theme.shape.borderRadius (14).
        borderRadius: { xs: '24px', md: '32px' },
        px: { xs: 3, sm: 5, md: 8 },
        py: { xs: 5, md: 8 },
        mb: { xs: 4, md: 6 },
        color: '#FFFFFF',
        background: `linear-gradient(135deg, ${tokens.ink} 0%, ${tokens.surface} 55%, ${tokens.void} 100%)`,
        // Fine grid texture for depth, purely decorative.
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          zIndex: -1,
          backgroundImage: `linear-gradient(${tokens.line}55 1px, transparent 1px), linear-gradient(90deg, ${tokens.line}55 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at 70% 40%, black 0%, transparent 70%)',
        },
      }}
    >
      <Glow color={tokens.teal} size={420} top="-140px" left="55%" />
      <Glow color={tokens.mint} size={260} top="55%" left="78%" delay={-4} />
      <Glow color={tokens.amber} size={200} top="-60px" left="-60px" delay={-8} />

      {/* Big outline fish, swimming gently. */}
      <Box
        aria-hidden
        component="svg"
        viewBox="0 0 64 64"
        sx={{
          position: 'absolute',
          right: { xs: -60, md: 40 },
          bottom: { xs: -40, md: 20 },
          width: { xs: 220, md: 320 },
          opacity: { xs: 0.18, md: 0.9 },
          animation: `${swim} 9s ease-in-out infinite`,
          pointerEvents: 'none',
        }}
      >
        <path
          d="M6 32c8-12 20-18 32-18 9 0 15 5 20 9l-6 9 6 9c-5 4-11 9-20 9-12 0-24-6-32-18z"
          fill="none"
          stroke={tokens.mint}
          strokeWidth="1.2"
        />
        <circle cx="20" cy="28" r="2.2" fill={tokens.amber} />
      </Box>

      <Box sx={{ position: 'relative', maxWidth: 680 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.5,
            mb: 3,
            borderRadius: 999,
            border: `1px solid ${tokens.line}`,
            bgcolor: 'rgba(142, 227, 201, 0.08)',
            color: tokens.mint,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tokens.amber }} />
          Mzansi&apos;s quickest little shop
        </Box>

        <Typography id="catalog-heading" variant="h1" sx={{ fontSize: { xs: '2.75rem', sm: '3.75rem', md: '4.75rem' } }}>
          Small fish.{' '}
          <Box
            component="span"
            sx={{
              display: 'block',
              background: `linear-gradient(90deg, ${tokens.mint}, ${tokens.amber})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              // Windows High Contrast drops backgrounds, which would make clipped text invisible.
              '@media (forced-colors: active)': { color: 'CanvasText', background: 'none' },
            }}
          >
            Fast moves.
          </Box>
        </Typography>

        <Typography sx={{ mt: 3, color: tokens.body, fontSize: { xs: '1.05rem', md: '1.2rem' }, maxWidth: 560 }}>
          The big shops have the queues. We have the stock, prices in Rand, and a checkout quicker than a taxi at an
          orange light.
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 4 }}>
          <Button href="#results" variant="contained" color="secondary" size="large">
            Shop the catch
          </Button>
          <Button
            href="#brands"
            variant="outlined"
            size="large"
            sx={{
              color: tokens.mint,
              borderColor: tokens.line,
              '&:hover': { borderColor: tokens.mint, bgcolor: 'rgba(142, 227, 201, 0.08)' },
              '&.Mui-focusVisible': { outlineColor: tokens.mint },
            }}
          >
            Browse brands
          </Button>
        </Box>

        <Box component="ul" aria-label="Why shop here" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, listStyle: 'none', p: 0, m: 0, mt: 4 }}>
          {PERKS.map((perk) => (
            <Box
              component="li"
              key={perk}
              sx={{ px: 1.5, py: 0.75, borderRadius: 999, fontSize: 13, color: tokens.body, border: `1px solid ${tokens.line}` }}
            >
              {perk}
            </Box>
          ))}
        </Box>

        {stats.length > 0 && (
          <Box
            component="dl"
            sx={{ display: 'flex', flexWrap: 'wrap', columnGap: { xs: 4, md: 6 }, rowGap: 2, m: 0, mt: 5 }}
          >
            {stats.map((s) => (
              <Box key={s.label} sx={{ display: 'flex', flexDirection: 'column-reverse' }}>
                <Typography component="dt" sx={{ color: tokens.body, fontSize: 14 }}>
                  {s.label}
                </Typography>
                <Typography component="dd" sx={{ m: 0, fontSize: { xs: 28, md: 36 }, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {s.value}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
});
