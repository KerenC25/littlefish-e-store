import { useEffect, useRef } from 'react';
import { Link as RouterLink, Navigate, useLocation, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useAppSelector } from '../../app/hooks';
import { brand as tokens } from '../../app/theme';
import { useNow } from '../../shared/hooks/useNow';
import { formatZar } from '../../shared/utils/money';
import { normaliseEmail } from '../../shared/utils/validation';
import { visuallyHidden } from '../../shared/styles/visuallyHidden';
import { selectCurrentUser } from '../auth/authSlice';
import type { UserId } from '../auth/types';
import { selectOrderByReference } from './ordersSlice';
import { trackOrder } from './tracking';
import { OrderStatusChip } from './components/OrderStatusChip';

const time = new Intl.DateTimeFormat('en-ZA', { hour: '2-digit', minute: '2-digit' });
const dateTime = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });

/** Who may see an order: its signed-in owner, or someone who just proved the email on /track. */
export const canViewOrder = (
  order: { userId: UserId | null; email: string },
  userId: UserId | undefined,
  verifiedEmail: unknown,
): boolean =>
  (userId !== undefined && order.userId === userId) ||
  (typeof verifiedEmail === 'string' && normaliseEmail(verifiedEmail) === normaliseEmail(order.email));

export const OrderTrackingPage = () => {
  const reference = (useParams().reference ?? '').toUpperCase();
  const location = useLocation();
  const user = useAppSelector(selectCurrentUser);
  const order = useAppSelector((s) => selectOrderByReference(s, reference));
  const now = useNow(15_000);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const allowed = order !== undefined && canViewOrder(order, user?.id, (location.state as { verifiedEmail?: unknown } | null)?.verifiedEmail);

  useEffect(() => {
    if (allowed) headingRef.current?.focus();
  }, [allowed]);

  // Unknown order or not yours: same response either way, so references cannot be probed.
  if (!allowed) return <Navigate to={`/track?ref=${encodeURIComponent(reference)}`} replace />;

  const tracking = trackOrder(order.placedAt, now);
  const delivered = tracking.status === 'delivered';
  const t = order.totals;

  return (
    <Box component="article" aria-labelledby="order-heading" sx={{ maxWidth: 1040, mx: 'auto' }}>
      <Button component={RouterLink} to={user ? '/orders' : '/'} sx={{ mb: 2 }}>
        {user ? '← All my orders' : '← Back to the shop'}
      </Button>

      <Paper
        sx={{
          p: { xs: 3, md: 5 },
          mb: 3,
          color: '#FFFFFF',
          background: `linear-gradient(135deg, ${tokens.ink} 0%, ${tokens.surface} 60%, ${tokens.void} 100%)`,
        }}
      >
        <Typography variant="overline" sx={{ color: tokens.mint }}>
          Order {order.reference}
        </Typography>
        <Typography id="order-heading" ref={headingRef} tabIndex={-1} variant="h4" component="h1" sx={{ outline: 'none', mb: 1 }}>
          {delivered ? 'Delivered. Enjoy!' : tracking.label}
        </Typography>
        {/* Polite live region: announces status changes while the page is open. */}
        <Typography aria-live="polite" sx={{ color: tokens.body, mb: 3 }}>
          {delivered
            ? `Delivered ${dateTime.format(tracking.deliveryAt)}.`
            : `Estimated delivery ${time.format(tracking.deliveryAt)} today. ${tracking.steps.find((s) => s.current)?.blurb ?? ''}`}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={Math.round(tracking.progress * 100)}
          aria-label="Delivery progress"
          sx={{ height: 8, bgcolor: tokens.line, '& .MuiLinearProgress-bar': { bgcolor: tokens.mint } }}
        />
      </Paper>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, alignItems: 'start' }}>
        <Paper component="section" aria-labelledby="timeline-heading" sx={{ p: { xs: 2.5, md: 3 } }}>
          <Typography id="timeline-heading" variant="h6" component="h2" sx={{ mb: 2 }}>
            Tracking
          </Typography>
          <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {tracking.steps.map((step, i) => (
              <Box
                component="li"
                key={step.status}
                aria-current={step.current ? 'step' : undefined}
                sx={{ display: 'grid', gridTemplateColumns: '28px 1fr', columnGap: 1.5, position: 'relative', pb: i < tracking.steps.length - 1 ? 3 : 0 }}
              >
                {i < tracking.steps.length - 1 && (
                  <Box
                    aria-hidden
                    sx={{ position: 'absolute', left: 13, top: 28, bottom: 0, width: 2, bgcolor: step.done && tracking.steps[i + 1]?.done ? tokens.teal : 'divider' }}
                  />
                )}
                {step.done ? (
                  <CheckCircleIcon aria-hidden sx={{ color: tokens.teal, fontSize: 28 }} />
                ) : (
                  <RadioButtonUncheckedIcon aria-hidden sx={{ color: 'text.disabled', fontSize: 28 }} />
                )}
                <Box>
                  <Typography fontWeight={step.current ? 800 : 600} color={step.done ? 'text.primary' : 'text.secondary'}>
                    {step.label}
                    <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                      {` · ${step.done ? '' : 'expected '}${time.format(step.at)}`}
                    </Box>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.blurb}
                  </Typography>
                  <Box component="span" sx={visuallyHidden}>
                    {step.done ? 'Completed.' : 'Not yet.'}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 3 }}>
            Demo clock: orders move through each stage in minutes, not days.
          </Typography>
        </Paper>

        <Box sx={{ display: 'grid', gap: 3 }}>
          <Paper component="section" aria-labelledby="items-heading" sx={{ p: { xs: 2.5, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1 }}>
              <Typography id="items-heading" variant="h6" component="h2">
                Your order
              </Typography>
              <OrderStatusChip status={tracking.status} label={tracking.label} />
            </Box>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mb: 2 }}>
              {order.lines.map((l) => (
                <Box component="li" key={l.productId} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 1 }}>
                  <Box component="img" src={l.thumbnail} alt="" width={48} height={48} sx={{ borderRadius: '10px', bgcolor: tokens.mintWash, objectFit: 'contain' }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {l.title}{' '}
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      × {l.quantity}
                    </Box>
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {formatZar(l.unitPriceCents * l.quantity)}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 0.75, m: 0, '& dd': { m: 0, textAlign: 'right' } }}>
              <dt>Subtotal</dt>
              <dd>{formatZar(t.subtotalCents)}</dd>
              {t.discountCents > 0 && (
                <>
                  <dt>Coupon ({t.couponCode})</dt>
                  <dd>-{formatZar(t.discountCents)}</dd>
                </>
              )}
              <dt>Delivery</dt>
              <dd>{t.shippingCents === 0 ? 'Free' : formatZar(t.shippingCents)}</dd>
              <Box component="dt" sx={{ fontWeight: 800 }}>
                Total paid
              </Box>
              <Box component="dd" sx={{ fontWeight: 800 }}>
                {formatZar(t.totalCents)}
              </Box>
            </Box>
          </Paper>

          <Paper component="section" aria-labelledby="delivery-heading" sx={{ p: { xs: 2.5, md: 3 } }}>
            <Typography id="delivery-heading" variant="h6" component="h2" sx={{ mb: 1 }}>
              Delivery and payment
            </Typography>
            <Box component="address" sx={{ fontStyle: 'normal', color: 'text.secondary', mb: 1.5 }}>
              {order.customerName}
              <br />
              {order.address.street}
              <br />
              {order.address.city}, {order.address.province}, {order.address.postalCode}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Placed {dateTime.format(new Date(order.placedAt))} · {order.payment.brand} ending {order.payment.last4}
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default OrderTrackingPage;
