import { memo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import { keyframes, styled } from '@mui/material/styles';
import { AddToCartButton } from '../../cart/components/AddToCartButton';
import { usePrefetch } from '../productsApi';
import type { Product } from '../types';
import { visuallyHidden } from '../../../shared/styles/visuallyHidden';
import { Price } from './Price';

export const CARD_HEIGHT = 420;

const rise = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const StyledCard = styled(Card)(({ theme }) => ({
  height: CARD_HEIGHT,
  display: 'grid',
  gridTemplateRows: '200px 1fr auto',
  borderRadius: theme.shape.borderRadius * 1.5,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
  animation: `${rise} 300ms ease-out both`,
  transition: theme.transitions.create(['transform', 'box-shadow'], { duration: 200 }),
  // Lift on hover *and* when anything inside has keyboard focus.
  '&:hover, &:focus-within': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[6],
  },
  '&:hover img': { transform: 'scale(1.05)' },
}));

const ImageWrap = styled('div')(({ theme }) => ({
  position: 'relative',
  background: theme.palette.grey[100],
  display: 'grid',
  placeItems: 'center',
  overflow: 'hidden',
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transition: theme.transitions.create('transform', { duration: 300 }),
  },
}));

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

  return (
    <StyledCard role="listitem" aria-posinset={position} aria-setsize={setSize} aria-labelledby={titleId}>
      <ImageWrap>
        <img src={product.thumbnail} alt="" loading="lazy" decoding="async" width={200} height={200} />
        {product.discountPercentage >= 1 && (
          <Chip
            label={`-${Math.round(product.discountPercentage)}%`}
            color="secondary"
            size="small"
            sx={{ position: 'absolute', top: 12, left: 12, fontWeight: 700 }}
          />
        )}
      </ImageWrap>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {product.brand ?? product.category.replace(/-/g, ' ')}
        </Typography>
        <Typography id={titleId} component="h2" fontWeight={700} fontSize="1rem" sx={{ lineHeight: 1.3 }}>
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
            }}
          >
            {product.title}
          </Link>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Rating value={product.rating} precision={0.1} size="small" readOnly aria-hidden />
          <Typography variant="body2" color="text.secondary">
            {product.rating.toFixed(1)}
            <Box component="span" sx={visuallyHidden}>
              {' '}
              out of 5 stars
            </Box>
          </Typography>
        </Box>
        <Box sx={{ mt: 'auto' }}>
          <Price cents={product.priceCents} discountPercentage={product.discountPercentage} />
          <Typography variant="caption" color={product.stock > 0 ? 'text.secondary' : 'error'}>
            {product.stock > 0 ? (product.stock < 10 ? `Only ${product.stock} left. Move fast.` : 'In stock') : 'Out of stock'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <AddToCartButton product={product} fullWidth />
      </Box>
    </StyledCard>
  );
});
