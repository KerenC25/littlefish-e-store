import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useAppSelector } from '../../app/hooks';
import { brand as tokens } from '../../app/theme';
import { StatusMessage } from '../../shared/components/StatusMessage';
import { useNow } from '../../shared/hooks/useNow';
import { formatZar } from '../../shared/utils/money';
import { selectCurrentUser } from '../auth/authSlice';
import { selectOrdersForUser } from './ordersSlice';
import { trackOrder } from './tracking';
import { OrderStatusChip } from './components/OrderStatusChip';

const dateTime = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });

/** Signed-in order history (guarded by RequireAuth in the routes). */
export const OrdersPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const orders = useAppSelector((s) => selectOrdersForUser(s, user?.id));
  const now = useNow(30_000);
  const navigate = useNavigate();

  return (
    <Box component="section" aria-labelledby="orders-heading" sx={{ maxWidth: 880, mx: 'auto' }}>
      <Typography id="orders-heading" variant="h4" component="h1" gutterBottom>
        My orders
      </Typography>

      {orders.length === 0 ? (
        <StatusMessage
          illustration="📦"
          title="No orders yet"
          description="Your order history is emptier than a Sandton parking lot on a public holiday. Let us fix that."
          actionLabel="Start shopping"
          onAction={() => navigate('/')}
        />
      ) : (
        <Box component="ul" aria-label="Your orders" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 2 }}>
          {orders.map((order) => {
            const tracking = trackOrder(order.placedAt, now);
            const count = order.lines.reduce((n, l) => n + l.quantity, 0);
            return (
              <Paper
                component="li"
                key={order.reference}
                aria-labelledby={`order-${order.reference}`}
                sx={{ p: 2.5, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr auto' }, alignItems: 'center' }}
              >
                <Box sx={{ display: 'flex' }} aria-hidden>
                  {order.lines.slice(0, 3).map((l, i) => (
                    <Box
                      key={l.productId}
                      component="img"
                      src={l.thumbnail}
                      alt=""
                      width={52}
                      height={52}
                      sx={{ ml: i === 0 ? 0 : -2, borderRadius: '12px', border: '2px solid #fff', bgcolor: tokens.mintWash, objectFit: 'contain' }}
                    />
                  ))}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography id={`order-${order.reference}`} component="h2" fontWeight={800}>
                    {order.reference}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dateTime.format(new Date(order.placedAt))} · {count} {count === 1 ? 'item' : 'items'} ·{' '}
                    {formatZar(order.totals.totalCents)}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <OrderStatusChip status={tracking.status} label={tracking.label} />
                  </Box>
                </Box>
                <Button
                  component={RouterLink}
                  to={`/orders/${order.reference}`}
                  variant="outlined"
                  aria-label={`Track order ${order.reference}`}
                >
                  Track
                </Button>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default OrdersPage;
