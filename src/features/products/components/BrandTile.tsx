import { memo } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { brand as tokens } from '../../../app/theme';
import type { Brand } from '../brands';

interface BrandTileProps {
  brand: Brand;
  active: boolean;
  onSelect: (name: string) => void;
}

/**
 * A wordmark-style tile. We do not have licensed logos, so the brand name is set
 * typographically over a product photo, which reads well and avoids trademark misuse.
 */
export const BrandTile = memo(function BrandTile({ brand, active, onSelect }: BrandTileProps) {
  return (
    <ButtonBase
      onClick={() => onSelect(brand.name)}
      aria-pressed={active}
      aria-label={`${brand.name}, ${brand.productCount} ${brand.productCount === 1 ? 'product' : 'products'}`}
      sx={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateRows: '96px auto',
        // ButtonBase centres its content; with a grid that shrinks the column to fit.
        gridTemplateColumns: 'minmax(0, 1fr)',
        justifyContent: 'stretch',
        alignContent: 'stretch',
        alignItems: 'stretch',
        textAlign: 'left',
        borderRadius: '20px',
        overflow: 'hidden',
        bgcolor: active ? tokens.ink : 'background.paper',
        color: active ? '#FFFFFF' : 'text.primary',
        border: 1.5,
        borderColor: active ? tokens.ink : 'divider',
        transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 28px rgba(0, 43, 46, 0.14)', borderColor: tokens.teal },
        '&:hover img': { transform: 'scale(1.08)' },
      }}
    >
      <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: active ? tokens.surface : tokens.mintWash }}>
        <Box
          component="img"
          src={brand.thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          width={160}
          height={88}
          // Absolute so the photo cannot grow the row and push the brand name out of view.
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', p: 1, transition: 'transform 300ms ease' }}
        />
      </Box>
      <Box sx={{ px: 1.75, py: 1.25, minWidth: 0 }}>
        <Typography
          component="span"
          sx={{ display: 'block', fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {brand.name}
        </Typography>
        <Typography component="span" variant="caption" sx={{ color: active ? tokens.mint : 'text.secondary' }}>
          {brand.productCount} {brand.productCount === 1 ? 'product' : 'products'}
        </Typography>
      </Box>
    </ButtonBase>
  );
});
