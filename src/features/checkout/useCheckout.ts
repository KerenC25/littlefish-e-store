import { useCallback, useReducer, useRef } from 'react';
import { useAppDispatch } from '../../app/hooks';
import type { Cents } from '../../shared/utils/money';
import { completeOrder } from '../orders/orderThunks';
import type { OrderDraft } from '../orders/types';
import type { CardDetails, PaymentResult } from './payment/PaymentGateway';
import { usePaymentGateway } from './payment/PaymentGatewayContext';

export interface OrderReceipt {
  reference: string;
  amountCents: Cents;
  last4: string;
  brand: string;
  email: string;
  /** False when payment succeeded but the confirmation email could not be sent. */
  emailSent: boolean;
}

/** Explicit state machine: impossible states (e.g. "processing and succeeded") cannot exist. */
export type CheckoutState =
  | { status: 'idle' }
  | { status: 'processing' }
  | { status: 'authenticating'; intentId: string; amountCents: Cents }
  | { status: 'failed'; message: string }
  | { status: 'succeeded'; receipt: OrderReceipt };

type Event =
  | { type: 'submitted' }
  | { type: 'challengeRequired'; intentId: string; amountCents: Cents }
  | { type: 'failed'; message: string }
  | { type: 'succeeded'; receipt: OrderReceipt };

export const checkoutReducer = (state: CheckoutState, event: Event): CheckoutState => {
  switch (event.type) {
    case 'submitted':
      return state.status === 'processing' ? state : { status: 'processing' };
    case 'challengeRequired':
      return { status: 'authenticating', intentId: event.intentId, amountCents: event.amountCents };
    case 'failed':
      return { status: 'failed', message: event.message };
    case 'succeeded':
      return { status: 'succeeded', receipt: event.receipt };
  }
};

export const orderReference = (intentId: string): string => `LFM-${intentId.slice(-8).toUpperCase()}`;

/**
 * Orchestrates the payment flow. The page only renders state and forwards user intent,
 * so the business logic is testable without a DOM (single responsibility). Everything that
 * happens after payment (order record, cart, coupon, email) is delegated to `completeOrder`.
 */
export const useCheckout = () => {
  const gateway = usePaymentGateway();
  const dispatch = useAppDispatch();
  const [state, send] = useReducer(checkoutReducer, { status: 'idle' });
  // Guards against double submission (double click, Enter key repeat).
  const inFlight = useRef(false);
  // The order being paid for; kept across the 3-D Secure round trip.
  const draftRef = useRef<OrderDraft | null>(null);

  const settle = useCallback(
    async (result: PaymentResult, amountCents: Cents) => {
      if (result.status === 'requires_action') {
        send({ type: 'challengeRequired', intentId: result.intentId, amountCents });
        return;
      }
      if (result.status === 'failed') {
        send({ type: 'failed', message: result.message });
        return;
      }
      const draft = draftRef.current;
      if (!draft) throw new Error('No order draft for a successful payment');
      const reference = orderReference(result.intentId);
      const { emailSent } = await dispatch(
        completeOrder({
          ...draft,
          reference,
          placedAt: new Date().toISOString(),
          payment: { brand: result.brand, last4: result.last4 },
        }),
      ).unwrap();
      draftRef.current = null;
      send({
        type: 'succeeded',
        receipt: { reference, amountCents, last4: result.last4, brand: result.brand, email: draft.email, emailSent },
      });
    },
    [dispatch],
  );

  const pay = useCallback(
    async (amountCents: Cents, card: CardDetails, draft: OrderDraft) => {
      if (inFlight.current) return;
      inFlight.current = true;
      draftRef.current = draft;
      send({ type: 'submitted' });
      try {
        const intent = await gateway.createPaymentIntent(amountCents);
        await settle(await gateway.confirmCardPayment(intent.id, card), amountCents);
      } catch {
        send({ type: 'failed', message: 'The payment service is having a moment. You have not been charged.' });
      } finally {
        inFlight.current = false;
      }
    },
    [gateway, settle],
  );

  const authenticate = useCallback(
    async (approved: boolean) => {
      if (state.status !== 'authenticating' || inFlight.current) return;
      inFlight.current = true;
      const { intentId, amountCents } = state;
      send({ type: 'submitted' });
      try {
        await settle(await gateway.completeAuthentication(intentId, approved), amountCents);
      } catch {
        send({ type: 'failed', message: 'We could not confirm that payment. You have not been charged.' });
      } finally {
        inFlight.current = false;
      }
    },
    [gateway, settle, state],
  );

  return { state, pay, authenticate };
};
