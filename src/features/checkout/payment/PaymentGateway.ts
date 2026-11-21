import type { Cents } from '../../../shared/utils/money';

/**
 * Abstraction over a card payment provider (dependency inversion).
 *
 * The checkout depends on this interface, not on a vendor SDK. The shipped implementation
 * is a simulator that behaves like Stripe's PaymentIntent flow (create -> confirm ->
 * optional 3-D Secure). Swapping in Stripe, PayFast or Peach Payments means writing a new
 * adapter, with no change to the checkout UI.
 */
export interface CardDetails {
  number: string;
  expiry: string; // MM/YY
  cvc: string;
  holderName: string;
}

export interface PaymentIntent {
  id: string;
  amountCents: Cents;
  currency: 'ZAR';
  status: 'requires_payment_method' | 'requires_action' | 'succeeded';
}

export type PaymentErrorCode =
  | 'card_declined'
  | 'insufficient_funds'
  | 'expired_card'
  | 'authentication_failed'
  | 'processing_error';

export type PaymentResult =
  | { status: 'succeeded'; intentId: string; last4: string; brand: string }
  | { status: 'requires_action'; intentId: string; last4: string; brand: string }
  | { status: 'failed'; intentId: string; code: PaymentErrorCode; message: string };

export interface PaymentGateway {
  createPaymentIntent(amountCents: Cents): Promise<PaymentIntent>;
  confirmCardPayment(intentId: string, card: CardDetails): Promise<PaymentResult>;
  /** Completes a 3-D Secure challenge. `approved` is the shopper's answer. */
  completeAuthentication(intentId: string, approved: boolean): Promise<PaymentResult>;
}
