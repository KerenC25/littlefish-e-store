import { isValidEmail } from '../../shared/utils/validation';
import { isValidCvc, isValidExpiry, passesLuhn } from './payment/cardValidation';

export const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
] as const;

export interface CheckoutFormValues {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

export type CheckoutFormErrors = Partial<Record<keyof CheckoutFormValues, string>>;

export const emptyCheckoutForm: CheckoutFormValues = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  cardName: '',
  cardNumber: '',
  expiry: '',
  cvc: '',
};

/** SA numbers: 0XX XXX XXXX or +27 XX XXX XXXX, spaces optional. */
const SA_PHONE = /^(\+27|0)[1-8]\d{8}$/;
const SA_POSTAL_CODE = /^\d{4}$/;

/** Pure validation: returns a message per invalid field. Empty object means valid. */
export const validateCheckout = (v: CheckoutFormValues, now: Date = new Date()): CheckoutFormErrors => {
  const errors: CheckoutFormErrors = {};
  const required = (key: keyof CheckoutFormValues, message: string) => {
    if (!v[key].trim()) errors[key] = message;
  };

  required('fullName', 'Enter your full name');
  if (!isValidEmail(v.email)) errors.email = 'Enter a valid email address';
  if (!SA_PHONE.test(v.phone.replace(/\s/g, ''))) errors.phone = 'Enter a South African number, e.g. 082 123 4567';
  required('address', 'Enter your street address');
  required('city', 'Enter your city or town');
  if (!PROVINCES.includes(v.province as (typeof PROVINCES)[number])) errors.province = 'Choose a province';
  if (!SA_POSTAL_CODE.test(v.postalCode.trim())) errors.postalCode = 'Postal codes have 4 digits';

  required('cardName', 'Enter the name on the card');
  if (!passesLuhn(v.cardNumber)) errors.cardNumber = 'That card number does not look right';
  if (!isValidExpiry(v.expiry, now)) errors.expiry = 'Use MM/YY, and the card must not be expired';
  if (!isValidCvc(v.cvc, v.cardNumber)) errors.cvc = 'Enter the 3 or 4 digit security code';

  return errors;
};
