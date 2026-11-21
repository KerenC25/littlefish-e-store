import { useCallback, useReducer, useRef } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { cartCleared } from '../cart/cartSlice';
import type { Cents } from '../../shared/utils/money';
import type { CardDetails, PaymentResult } from './payment/PaymentGateway';
import { usePaymentGateway } from './payment/PaymentGatewayContext';

export interface OrderReceipt {
  reference: string;
  amountCents: Cents;
  last4: string;
  brand: string;
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

const orderReference = (intentId: string): string => `LFM-${intentId.slice(-8).toUpperCase()}`;

/**
 * Orchestrates the payment flow. The page only renders state and forwards user intent,
 * so the business logic is testable without a DOM (single responsibility).
 */
export const useCheckout = () => {
  const gateway = usePaymentGateway();
  const dispatch = useAppDispatch();
  const [state, send] = useReducer(checkoutReducer, { status: 'idle' });
  // Guards against double submission (double click, Enter key repeat).
  const inFlight = useRef(false);

  const settle = useCallback(
    (result: PaymentResult, amountCents: Cents) => {
      if (result.status === 'succeeded') {
        dispatch(cartCleared());
        send({
          type: 'succeeded',
          receipt: { reference: orderReference(result.intentId), amountCents, last4: result.last4, brand: result.brand },
        });
      } else if (result.status === 'requires_action') {
        send({ type: 'challengeRequired', intentId: result.intentId, amountCents });
      } else {
        send({ type: 'failed', message: result.message });
      }
    },
    [dispatch],
  );

  const pay = useCallback(
    async (amountCents: Cents, card: CardDetails) => {
      if (inFlight.current) return;
      inFlight.current = true;
      send({ type: 'submitted' });
      try {
        const intent = await gateway.createPaymentIntent(amountCents);
        settle(await gateway.confirmCardPayment(intent.id, card), amountCents);
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
        settle(await gateway.completeAuthentication(intentId, approved), amountCents);
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
