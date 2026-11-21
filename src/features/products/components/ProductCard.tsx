import { memo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import { keyframes, styled } from '@mui/material/styles';
import { brand as tokens } from '../../../app/theme';
import { AddToCartButton } from '../../cart/components/AddToCartButton';
import { usePrefetch } from '../productsApi';
import type { Product } from '../types';
import { visuallyHidden } from '../../../shared/styles/visuallyHidden';
import { Price } from './Price';

export const CARD_HEIGHT = 432;

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const StyledCard = styled(Card)(({ theme }) => ({
  height: CARD_HEIGHT,
  display: 'grid',
  gridTemplateRows: '208px 1fr auto',
  borderRadius: 20,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 1px 2px rgba(0, 43, 46, 0.04)',
  animation: `${rise} 320ms cubic-bezier(0.2, 0.7, 0.2, 1) both`,
  transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], { duration: 220 }),
  // Lift on hover *and* when anything inside has keyboard focus.
  '&:hover, &:focus-within': {
    transform: 'translateY(-4px)',
    borderColor: tokens.mint,
    boxShadow: '0 18px 40px -12px rgba(0, 43, 46, 0.25)',
  },
  '&:hover img': { transform: 'scale(1.06)' },
}));

const ImageWrap = styled('div')({
  position: 'relative',
  margin: 8,
  marginBottom: 0,
  borderRadius: 14,
  background: `radial-gradient(circle at 50% 35%, #FFFFFF 0%, ${tokens.mintWash} 75%)`,
  display: 'grid',
  placeItems: 'center',
  overflow: 'hidden',
  // Absolutely positioned so the photo always fits the frame; a percentage height on a grid
  // child does not resolve reliably and was cropping product shots.
  '& img': {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    padding: 14,
    transition: 'transform 320ms cubic-bezier(0.2, 0.7, 0.2, 1)',
  },
});

/** Small pill on the image. Text colours are chosen to meet 4.5:1 on each background. */
const Badge = ({ children, tone }: { children: string; tone: 'orange' | 'ink' }) => (
  <Box
    component="span"
    sx={{
      px: 1.25,
      py: 0.25,
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      lineHeight: 1.6,
      bgcolor: tone === 'orange' ? tokens.orange : tokens.ink,
      color: tone === 'orange' ? tokens.onAmber : tokens.mint,
    }}
  >
    {children}
  </Box>
);

interface ProductCardProps {
  product: Product;
  /** 1-based position and total, because virtualisation hides most siblings from AT. */
  position: number;
  setSize: number;
}

export const ProductCard = memo(function ProductCard({ product, position, setSize }: ProductCardProps) {
  const prefetchProduct = usePrefetch('getProduct');
  const prefetch = () => prefetchProduct(product.id, { ifOlderThan: 60 });
  const titleId = `product-${product.id}-title`;
  const lowStock = product.stock > 0 && product.stock < 10;

  return (
    <StyledCard role="listitem" aria-posinset={position} aria-setsize={setSize} aria-labelledby={titleId}>
      <ImageWrap>
        <img src={product.thumbnail} alt="" loading="lazy" decoding="async" width={200} height={200} />
        <Box sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 0.75 }}>
          {product.discountPercentage >= 1 && <Badge tone="orange">{`-${Math.round(product.discountPercentage)}%`}</Badge>}
          {product.rating >= 4.5 && <Badge tone="ink">Top rated</Badge>}
        </Box>
      </ImageWrap>

      <Box sx={{ px: 2, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: tokens.tealDeep, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {product.brand ?? product.category.replace(/-/g, ' ')}
        </Typography>
        <Typography id={titleId} component="h3" fontWeight={700} fontSize="1rem" sx={{ lineHeight: 1.3 }}>
          <Link
            component={RouterLink}
            to={`/products/${product.id}`}
            color="inherit"
            underline="hover"
            onMouseEnter={prefetch}
            onFocus={prefetch}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              borderRadius: 1,
            }}
          >
            {product.title}
          </Link>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Rating value={product.rating} precision={0.1} size="small" readOnly aria-hidden sx={{ color: tokens.amber }} />
          <Typography variant="body2" color="text.secondary">
            {product.rating.toFixed(1)}
            <Box component="span" sx={visuallyHidden}>
              {' '}
              out of 5 stars
            </Box>
          </Typography>
        </Box>
        <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Price cents={product.priceCents} discountPercentage={product.discountPercentage} />
          <Typography
            variant="caption"
            fontWeight={lowStock ? 700 : 500}
            color={product.stock === 0 ? 'error' : lowStock ? '#A8380A' : 'text.secondary'}
          >
            {product.stock > 0 ? (lowStock ? `Only ${product.stock} left. Move fast.` : 'In stock') : 'Out of stock'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2, pt: 1.5 }}>
        <AddToCartButton product={product} fullWidth />
      </Box>
    </StyledCard>
  );
});
