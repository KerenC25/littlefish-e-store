import { formatZar } from '../../shared/utils/money';
import type { Order } from '../orders/types';
import { trackOrder } from '../orders/tracking';
import type { EmailDraft } from './types';

const dateTime = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });

const joinUrl = (appUrl: string, path: string) => `${appUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

export const orderConfirmationEmail = (order: Order, appUrl: string): EmailDraft => {
  const firstName = order.customerName.split(' ')[0] || 'there';
  const { deliveryAt } = trackOrder(order.placedAt);
  const t = order.totals;
  const trackPath = `/orders/${order.reference}`;

  const lines = order.lines.map((l) => `  ${l.quantity} × ${l.title}  ${formatZar(l.unitPriceCents * l.quantity)}`);
  const money = [
    `  Subtotal  ${formatZar(t.subtotalCents)}`,
    ...(t.discountCents > 0 ? [`  Coupon ${t.couponCode ?? ''}  -${formatZar(t.discountCents)}`] : []),
    `  Delivery  ${t.shippingCents === 0 ? 'Free' : formatZar(t.shippingCents)}`,
    `  Total paid  ${formatZar(t.totalCents)} (incl. VAT ${formatZar(t.vatCents)})`,
  ];

  return {
    kind: 'order-confirmation',
    to: order.email,
    subject: `Order ${order.reference} confirmed. Sharp sharp!`,
    preview: `${order.lines.length} ${order.lines.length === 1 ? 'item' : 'items'}, ${formatZar(t.totalCents)}. Arriving ${dateTime.format(deliveryAt)}.`,
    body: [
      `Howzit ${firstName},`,
      '',
      'Thanks for shopping small. Your order is in, paid, and already being packed.',
      '',
      `Order reference: ${order.reference}`,
      `Placed: ${dateTime.format(new Date(order.placedAt))}`,
      `Estimated delivery: ${dateTime.format(deliveryAt)}`,
      '',
      'What you bought',
      ...lines,
      '',
      ...money,
      '',
      'Delivering to',
      `  ${order.customerName}`,
      `  ${order.address.street}`,
      `  ${order.address.city}, ${order.address.province}, ${order.address.postalCode}`,
      '',
      `Paid with ${order.payment.brand} ending ${order.payment.last4}.`,
      '',
      `Track your order: ${joinUrl(appUrl, trackPath)}`,
      '',
      'Small fish. Fast moves.',
      'Little Fish Market, Jozi',
    ].join('\n'),
    action: { label: 'Track your order', path: trackPath },
  };
};

export const newsletterWelcomeEmail = (email: string, couponCode: string, appUrl: string): EmailDraft => ({
  kind: 'newsletter-welcome',
  to: email,
  subject: 'Welcome to the shoal 🐟 (and 15% off)',
  preview: `Your code ${couponCode} is inside. No spam, we promise.`,
  body: [
    'Welcome to the shoal,',
    '',
    'You are now on the Little Fish Market list. Expect the odd email with new stock, deals and the occasional',
    'bad fish pun. No spam: we are a small shop, we do not have time.',
    '',
    `As a thank you, here is 15% off your next order: ${couponCode}`,
    'Pop it in the coupon box in your cart.',
    '',
    `Start shopping: ${joinUrl(appUrl, '/')}`,
    '',
    'Changed your mind? Reply "unsubscribe" and we will take you off the list, no hard feelings.',
    '',
    'Small fish. Fast moves.',
    'Little Fish Market, Jozi',
  ].join('\n'),
  action: { label: 'Start shopping', path: '/' },
});
