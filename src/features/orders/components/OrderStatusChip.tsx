import Box from '@mui/material/Box';
import { brand as tokens } from '../../../app/theme';
import type { OrderStatus } from '../tracking';

const STYLES: Record<OrderStatus, { bg: string; fg: string }> = {
  placed: { bg: tokens.mintWash, fg: tokens.ink },
  packed: { bg: tokens.amberLight, fg: tokens.onAmber },
  'out-for-delivery': { bg: tokens.amber, fg: tokens.onAmber },
  delivered: { bg: tokens.ink, fg: tokens.mint },
};

/** Status pill. Colour is decoration only: the label always carries the meaning (WCAG 1.4.1). */
export const OrderStatusChip = ({ status, label }: { status: OrderStatus; label: string }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.75,
      px: 1.25,
      py: 0.25,
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 800,
      bgcolor: STYLES[status].bg,
      color: STYLES[status].fg,
      whiteSpace: 'nowrap',
    }}
  >
    <Box component="span" aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'currentColor' }} />
    {label}
  </Box>
);
