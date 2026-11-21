import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { StatusMessage } from '../../shared/components/StatusMessage';
import { getErrorMessage } from '../../shared/utils/errors';
import { visuallyHidden } from '../../shared/styles/visuallyHidden';
import { AddToCartButton } from '../cart/components/AddToCartButton';
import { useGetProductQuery } from './productsApi';
import { Price } from './components/Price';

const parseId = (raw: string | undefined): number | null => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const ProductDetailPage = () => {
  const id = parseId(useParams().productId);
  const { data: product, error, isLoading, isError, refetch } = useGetProductQuery(id ?? 0, { skip: id === null });
  const [activeImage, setActiveImage] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new page's heading so screen-reader users know the view changed.
  useEffect(() => {
    if (product) headingRef.current?.focus();
  }, [product]);

  if (id === null || (isError && (error as { status?: unknown })?.status === 404)) {
    return (
      <StatusMessage
        illustration="🐠"
        title="That one swam off"
        description="We could not find that product. It may have sold out or never existed."
      />
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { md: '1fr 1fr' } }} aria-busy>
        <Skeleton variant="rounded" height={420} />
        <Box>
          <Skeleton width="60%" height={48} />
          <Skeleton width="30%" />
          <Skeleton height={120} />
        </Box>
      </Box>
    );
  }

  if (isError || !product) {
    return (
      <StatusMessage
        role="alert"
        illustration="🎣"
        title="Could not load this product"
        description={getErrorMessage(error)}
        actionLabel="Try again"
        onAction={refetch}
      />
    );
  }

  const images = product.images.length > 0 ? product.images : [product.thumbnail];
  const mainImage = images[Math.min(activeImage, images.length - 1)];

  return (
    <Box component="article" aria-labelledby="product-title">
      <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon aria-hidden />} sx={{ mb: 2 }}>
        Back to the shop
      </Button>

      <Box sx={{ display: 'grid', gap: { xs: 3, md: 6 }, gridTemplateColumns: { md: '1fr 1fr' } }}>
        <Box>
          <Box
            sx={{
              background: 'radial-gradient(circle at 50% 35%, #FFFFFF 0%, #E6F6F0 75%)',
              borderRadius: '24px',
              aspectRatio: '1 / 1',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={mainImage}
              alt={product.title}
              sx={{ width: '100%', height: '100%', objectFit: 'contain', p: { xs: 2, md: 4 } }}
            />
          </Box>
          {images.length > 1 && (
            <Box role="group" aria-label="Product images" sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              {images.map((src, i) => (
                <Box
                  key={src}
                  component="button"
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1} of ${images.length}`}
                  aria-pressed={i === activeImage}
                  sx={{
                    p: 0,
                    width: 72,
                    height: 72,
                    borderRadius: '14px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    bgcolor: '#E6F6F0',
                    border: 2,
                    borderColor: i === activeImage ? 'primary.main' : 'transparent',
                    '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                  }}
                >
                  <Box
                    component="img"
                    src={src}
                    alt=""
                    loading="lazy"
                    width={72}
                    height={72}
                    sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              {product.brand ?? product.category.replace(/-/g, ' ')}
            </Typography>
            <Typography
              id="product-title"
              ref={headingRef}
              tabIndex={-1}
              variant="h4"
              component="h1"
              sx={{ outline: 'none' }}
            >
              {product.title}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Rating value={product.rating} precision={0.1} readOnly aria-hidden />
            <Typography color="text.secondary">
              {product.rating.toFixed(1)}
              <Box component="span" sx={visuallyHidden}>
                {' '}
                out of 5 stars
              </Box>{' '}
              ({product.reviews.length} reviews)
            </Typography>
          </Box>

          <Price cents={product.priceCents} discountPercentage={product.discountPercentage} size="large" />
          <Typography variant="caption" color="text.secondary">
            VAT included.
          </Typography>

          <Typography>{product.description}</Typography>

          {product.tags.length > 0 && (
            <Box component="ul" aria-label="Tags" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', p: 0, m: 0, listStyle: 'none' }}>
              {product.tags.map((tag) => (
                <li key={tag}>
                  <Chip label={tag} size="small" variant="outlined" />
                </li>
              ))}
            </Box>
          )}

          <Typography color={product.stock > 0 ? 'success.main' : 'error'} fontWeight={600}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </Typography>

          <Box sx={{ maxWidth: 320 }}>
            <AddToCartButton product={product} size="large" fullWidth />
          </Box>
        </Box>
      </Box>

      {product.reviews.length > 0 && (
        <Box component="section" aria-labelledby="reviews-heading" sx={{ mt: 6 }}>
          <Typography id="reviews-heading" variant="h5" component="h2" gutterBottom>
            What people are saying
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 2 }}>
            {product.reviews.map((review, i) => (
              <Box component="li" key={`${review.reviewerName}-${i}`} sx={{ p: 2.5, borderRadius: '20px', bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating value={review.rating} size="small" readOnly aria-hidden />
                  <Box component="span" sx={visuallyHidden}>
                    {review.rating} out of 5 stars.
                  </Box>
                  <Typography fontWeight={600}>{review.reviewerName}</Typography>
                </Box>
                <Typography color="text.secondary">{review.comment}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ProductDetailPage;
