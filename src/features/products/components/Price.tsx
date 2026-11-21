import { memo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { formatZar, preDiscountCents } from '../../../shared/utils/money';
import { visuallyHidden } from '../../../shared/styles/visuallyHidden';

interface PriceProps {
  cents: number;
  discountPercentage?: number;
  size?: 'medium' | 'large';
}

export const Price = memo(function Price({ cents, discountPercentage = 0, size = 'medium' }: PriceProps) {
  const showWas = discountPercentage >= 1;
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
      <Typography
        component="span"
        fontWeight={800}
        fontSize={size === 'large' ? '1.75rem' : '1.125rem'}
        color="text.primary"
      >
        {formatZar(cents)}
      </Typography>
      {showWas && (
        <Typography component="span" variant="body2" color="text.secondary">
          {/* Screen readers do not announce strikethrough styling, so say it in words. */}
          <Box component="span" sx={visuallyHidden}>
            Was{' '}
          </Box>
          <s>{formatZar(preDiscountCents(cents, discountPercentage))}</s>
        </Typography>
      )}
    </Box>
  );
});
