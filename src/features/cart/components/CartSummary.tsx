import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useAppSelector } from '../../../app/hooks';
import { FREE_SHIPPING_THRESHOLD_CENTS } from '../../../shared/config';
import { formatZar } from '../../../shared/utils/money';
import { selectCartTotals } from '../cartSlice';

const Line = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <Box sx={{ display: 'contents' }}>
    <Typography component="dt" fontWeight={strong ? 800 : 400}>
      {label}
    </Typography>
    <Typography component="dd" fontWeight={strong ? 800 : 500} sx={{ m: 0, textAlign: 'right' }}>
      {value}
    </Typography>
  </Box>
);

/** Shared by the cart modal and checkout so totals can never disagree. */
export const CartSummary = () => {
  const totals = useAppSelector(selectCartTotals);
  const progress = Math.min(100, (totals.subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {totals.freeShippingRemainingCents > 0
            ? `${formatZar(totals.freeShippingRemainingCents)} away from free delivery. So close you can smell the braai.`
            : 'Free delivery unlocked. Sharp sharp.'}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          aria-label="Progress towards free delivery"
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>
      <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 1, m: 0 }}>
        <Line label="Subtotal" value={formatZar(totals.subtotalCents)} />
        <Line label="Delivery" value={totals.shippingCents === 0 ? 'Free' : formatZar(totals.shippingCents)} />
        <Line label="Total" value={formatZar(totals.totalCents)} strong />
        <Typography component="dt" variant="caption" color="text.secondary">
          Includes VAT (15%)
        </Typography>
        <Typography component="dd" variant="caption" color="text.secondary" sx={{ m: 0, textAlign: 'right' }}>
          {formatZar(totals.vatCents)}
        </Typography>
      </Box>
    </Box>
  );
};
