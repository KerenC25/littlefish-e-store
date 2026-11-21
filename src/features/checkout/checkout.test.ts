import { emptyCheckoutForm, validateCheckout, type CheckoutFormValues } from './checkoutForm';
import { checkoutReducer } from './useCheckout';
import { TEST_CARDS, createMockPaymentGateway } from './payment/mockPaymentGateway';

const card = (number: string) => ({ number, expiry: '12/30', cvc: '123', holderName: 'Thandi' });

describe('mockPaymentGateway', () => {
  const gateway = createMockPaymentGateway({ latencyMs: 0 });

  it('succeeds with the success test card and reveals only the last 4 digits', async () => {
    const intent = await gateway.createPaymentIntent(500_00);
    const result = await gateway.confirmCardPayment(intent.id, card(TEST_CARDS.success));
    expect(result).toEqual({ status: 'succeeded', intentId: intent.id, last4: '4242', brand: 'Visa' });
  });

  it('declines the declined test card', async () => {
    const intent = await gateway.createPaymentIntent(500_00);
    const result = await gateway.confirmCardPayment(intent.id, card(TEST_CARDS.declined));
    expect(result).toMatchObject({ status: 'failed', code: 'card_declined' });
  });

  it('requires 3-D Secure and honours the shopper decision', async () => {
    const intent = await gateway.createPaymentIntent(500_00);
    expect(await gateway.confirmCardPayment(intent.id, card(TEST_CARDS.requires3ds))).toMatchObject({
      status: 'requires_action',
    });
    expect(await gateway.completeAuthentication(intent.id, true)).toMatchObject({ status: 'succeeded' });

    const other = await gateway.createPaymentIntent(500_00);
    await gateway.confirmCardPayment(other.id, card(TEST_CARDS.requires3ds));
    expect(await gateway.completeAuthentication(other.id, false)).toMatchObject({ code: 'authentication_failed' });
  });

  it('rejects invalid amounts', async () => {
    await expect(gateway.createPaymentIntent(0)).rejects.toThrow();
    await expect(gateway.createPaymentIntent(10.5)).rejects.toThrow();
  });
});

describe('checkoutReducer', () => {
  it('ignores duplicate submits while processing', () => {
    const processing = checkoutReducer({ status: 'idle' }, { type: 'submitted' });
    expect(checkoutReducer(processing, { type: 'submitted' })).toBe(processing);
  });
});

describe('validateCheckout', () => {
  const valid: CheckoutFormValues = {
    fullName: 'Thandi Nkosi',
    email: 'thandi@example.test',
    phone: '082 123 4567',
    address: '1 Long Street',
    city: 'Cape Town',
    province: 'Western Cape',
    postalCode: '8001',
    cardName: 'T Nkosi',
    cardNumber: TEST_CARDS.success,
    expiry: '12/30',
    cvc: '123',
  };
  const now = new Date(2026, 10, 20);

  it('accepts a complete South African order', () => {
    expect(validateCheckout(valid, now)).toEqual({});
    expect(validateCheckout({ ...valid, phone: '+27821234567' }, now)).toEqual({});
  });

  it('flags every empty field', () => {
    expect(Object.keys(validateCheckout(emptyCheckoutForm, now)).sort()).toEqual(Object.keys(emptyCheckoutForm).sort());
  });

  it.each<[keyof CheckoutFormValues, string]>([
    ['email', 'not-an-email'],
    ['phone', '12345'],
    ['postalCode', '800'],
    ['province', 'Narnia'],
    ['cardNumber', '4242 4242 4242 4241'],
    ['expiry', '01/20'],
    ['cvc', '12'],
  ])('rejects invalid %s', (field, value) => {
    expect(validateCheckout({ ...valid, [field]: value }, now)).toHaveProperty(field);
  });
});
