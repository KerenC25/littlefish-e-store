import { detectBrand, digitsOnly } from './cardValidation';
import type { PaymentErrorCode, PaymentGateway, PaymentIntent, PaymentResult } from './PaymentGateway';

/**
 * Test cards, modelled on Stripe's documented test numbers. No real money moves and no
 * card data leaves the browser: the simulator never sends or stores the full number.
 */
export const TEST_CARDS = {
  success: '4242 4242 4242 4242',
  declined: '4000 0000 0000 0002',
  insufficientFunds: '4000 0000 0000 9995',
  requires3ds: '4000 0000 0000 3220',
} as const;

const FAILURES: Record<string, { code: PaymentErrorCode; message: string }> = {
  [digitsOnly(TEST_CARDS.declined)]: {
    code: 'card_declined',
    message: 'Your bank said no. It happens to the best of us. Try another card?',
  },
  [digitsOnly(TEST_CARDS.insufficientFunds)]: {
    code: 'insufficient_funds',
    message: 'Insufficient funds. Maybe wait for payday?',
  },
};

interface StoredIntent extends PaymentIntent {
  last4?: string;
  brand?: string;
}

const randomId = (prefix: string): string => {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
};

export const createMockPaymentGateway = ({ latencyMs = 900 }: { latencyMs?: number } = {}): PaymentGateway => {
  const intents = new Map<string, StoredIntent>();
  const delay = () => new Promise<void>((resolve) => setTimeout(resolve, latencyMs));

  const requireIntent = (intentId: string): StoredIntent => {
    const intent = intents.get(intentId);
    if (!intent) throw new Error(`Unknown payment intent ${intentId}`);
    return intent;
  };

  return {
    async createPaymentIntent(amountCents) {
      if (!Number.isInteger(amountCents) || amountCents <= 0) {
        throw new Error('Payment amount must be a positive whole number of cents');
      }
      await delay();
      const intent: StoredIntent = {
        id: randomId('pi'),
        amountCents,
        currency: 'ZAR',
        status: 'requires_payment_method',
      };
      intents.set(intent.id, intent);
      return { id: intent.id, amountCents, currency: 'ZAR', status: intent.status };
    },

    async confirmCardPayment(intentId, card): Promise<PaymentResult> {
      const intent = requireIntent(intentId);
      await delay();
      const number = digitsOnly(card.number);
      const last4 = number.slice(-4);
      const brand = detectBrand(number);

      const failure = FAILURES[number];
      if (failure) return { status: 'failed', intentId, ...failure };

      intent.last4 = last4;
      intent.brand = brand;
      if (number === digitsOnly(TEST_CARDS.requires3ds)) {
        intent.status = 'requires_action';
        return { status: 'requires_action', intentId, last4, brand };
      }
      intent.status = 'succeeded';
      return { status: 'succeeded', intentId, last4, brand };
    },

    async completeAuthentication(intentId, approved): Promise<PaymentResult> {
      const intent = requireIntent(intentId);
      await delay();
      if (intent.status !== 'requires_action') {
        return {
          status: 'failed',
          intentId,
          code: 'processing_error',
          message: 'This payment does not need authentication.',
        };
      }
      if (!approved) {
        intent.status = 'requires_payment_method';
        return {
          status: 'failed',
          intentId,
          code: 'authentication_failed',
          message: 'Authentication was declined, so we did not charge you.',
        };
      }
      intent.status = 'succeeded';
      return { status: 'succeeded', intentId, last4: intent.last4 ?? '', brand: intent.brand ?? 'Card' };
    },
  };
};
