import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Link from '@mui/material/Link';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { validateCoupon } from '../coupons/coupons';
import { couponRemoved, selectCouponCode } from '../coupons/couponSlice';
import type { OrderDraft } from '../orders/types';
import { StatusMessage } from '../../shared/components/StatusMessage';
import { formatZar } from '../../shared/utils/money';
import { selectCurrentUser } from '../auth/authSlice';
import { selectCartItems, selectCartTotals } from '../cart/cartSlice';
import { CartSummary } from '../cart/components/CartSummary';
import {
  PROVINCES,
  emptyCheckoutForm,
  matchProvince,
  validateCheckout,
  type CheckoutFormErrors,
  type CheckoutFormValues,
} from './checkoutForm';
import { formatCardNumber, formatExpiry, digitsOnly } from './payment/cardValidation';
import { TEST_CARDS } from './payment/mockPaymentGateway';
import { useCheckout } from './useCheckout';
import { AddressAutocomplete } from './address/AddressAutocomplete';
import { AddressMap } from './address/AddressMap';
import type { AddressSuggestion } from '../../services/geocodingApi';

/** Fields in visual order, used to focus the first invalid one on submit. */
const FIELD_ORDER: (keyof CheckoutFormValues)[] = [
  'fullName',
  'email',
  'phone',
  'address',
  'city',
  'province',
  'postalCode',
  'cardName',
  'cardNumber',
  'expiry',
  'cvc',
];

const formatters: Partial<Record<keyof CheckoutFormValues, (v: string) => string>> = {
  cardNumber: formatCardNumber,
  expiry: formatExpiry,
  cvc: (v) => digitsOnly(v).slice(0, 4),
  postalCode: (v) => digitsOnly(v).slice(0, 4),
};

export const CheckoutPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const items = useAppSelector(selectCartItems);
  const totals = useAppSelector(selectCartTotals);
  const { state, pay, authenticate } = useCheckout();

  const [values, setValues] = useState<CheckoutFormValues>(() => ({
    ...emptyCheckoutForm,
    fullName: user ? `${user.firstName} ${user.lastName}` : '',
    email: user?.email ?? '',
    cardName: user ? `${user.firstName} ${user.lastName}` : '',
  }));
  const [errors, setErrors] = useState<CheckoutFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [couponNotice, setCouponNotice] = useState<string | null>(null);
  const [mapPoint, setMapPoint] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const dispatch = useAppDispatch();
  const couponCode = useAppSelector(selectCouponCode);
  const formRef = useRef<HTMLFormElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  const processing = state.status === 'processing';

  useEffect(() => {
    if (state.status === 'succeeded') resultHeadingRef.current?.focus();
    // Never keep sensitive card data around after an attempt.
    if (state.status === 'failed' || state.status === 'succeeded') {
      setValues((v) => ({ ...v, cardNumber: '', cvc: '' }));
    }
  }, [state.status]);

  if (state.status === 'succeeded') {
    const { receipt } = state;
    return (
      <Paper sx={{ p: { xs: 3, md: 6 }, textAlign: 'center', maxWidth: 640, mx: 'auto' }}>
        <Typography fontSize={56} aria-hidden>
          🐟
        </Typography>
        <Typography ref={resultHeadingRef} tabIndex={-1} variant="h4" component="h1" gutterBottom sx={{ outline: 'none' }}>
          Payment successful
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Done. Your order is already being packed.
        </Typography>
        <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'auto auto', justifyContent: 'center', columnGap: 3, rowGap: 1, mb: 4 }}>
          <Typography component="dt" color="text.secondary">Order reference</Typography>
          <Typography component="dd" fontWeight={700} sx={{ m: 0 }}>{receipt.reference}</Typography>
          <Typography component="dt" color="text.secondary">Amount paid</Typography>
          <Typography component="dd" fontWeight={700} sx={{ m: 0 }}>{formatZar(receipt.amountCents)}</Typography>
          <Typography component="dt" color="text.secondary">Paid with</Typography>
          <Typography component="dd" fontWeight={700} sx={{ m: 0 }}>{`${receipt.brand} ending ${receipt.last4}`}</Typography>
        </Box>
        <Alert severity={receipt.emailSent ? 'success' : 'warning'} role="note" sx={{ mb: 3, textAlign: 'left' }}>
          {receipt.emailSent ? (
            <>
              Confirmation sent to <strong>{receipt.email}</strong>.{' '}
              <Link component={RouterLink} to="/inbox">
                Open the demo inbox
              </Link>
            </>
          ) : (
            'Your order is placed, but the confirmation email did not go through. Your order page has everything.'
          )}
        </Alert>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button component={RouterLink} to={`/orders/${receipt.reference}`} variant="contained" color="secondary">
            Track your order
          </Button>
          <Button component={RouterLink} to="/" variant="outlined">
            Back to the shop
          </Button>
        </Box>
      </Paper>
    );
  }

  if (items.length === 0) {
    return (
      <StatusMessage
        illustration="🛒"
        title="Nothing to check out yet"
        description="Your cart is empty. The shop, happily, is not."
      />
    );
  }

  const update = (key: keyof CheckoutFormValues) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const format = formatters[key];
    const next = { ...values, [key]: format ? format(e.target.value) : e.target.value };
    setValues(next);
    // After the first submit, re-validate as the user fixes things.
    if (submitted) setErrors(validateCheckout(next));
  };

  const patch = (changes: Partial<CheckoutFormValues>) => {
    const next = { ...values, ...changes };
    setValues(next);
    if (submitted) setErrors(validateCheckout(next));
  };

  const typeAddress = (street: string) => {
    patch({ address: street });
    setMapPoint(null); // typed by hand: the pin may no longer match
  };

  /** Picking a suggestion fills the whole address block; anything unknown keeps what was typed. */
  const pickAddress = (s: AddressSuggestion) => {
    patch({
      address: s.street,
      city: s.city || values.city,
      province: matchProvince(s.province) || values.province,
      postalCode: s.postalCode || values.postalCode,
    });
    setMapPoint({ lat: s.lat, lon: s.lon, label: s.label });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validateCheckout(values);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((key) => found[key]);
    if (firstInvalid) {
      // Move focus to the first problem so keyboard and screen-reader users land on it.
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    // Last-moment coupon check (expiry is time-based, so the cart total alone cannot know).
    if (couponCode) {
      const check = validateCoupon(couponCode, totals.subtotalCents);
      if (!check.ok) {
        dispatch(couponRemoved());
        setCouponNotice(`${check.message} We removed it, so please check the new total.`);
        return;
      }
    }
    setCouponNotice(null);

    const draft: OrderDraft = {
      userId: user?.id ?? null,
      customerName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.replace(/\s/g, ''),
      address: {
        street: values.address.trim(),
        city: values.city.trim(),
        province: values.province,
        postalCode: values.postalCode.trim(),
      },
      lines: items.map(({ productId, title, thumbnail, unitPriceCents, quantity }) => ({
        productId,
        title,
        thumbnail,
        unitPriceCents,
        quantity,
      })),
      totals: {
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        shippingCents: totals.shippingCents,
        totalCents: totals.totalCents,
        vatCents: totals.vatCents,
        couponCode: totals.couponCode,
      },
    };
    void pay(
      totals.totalCents,
      { number: values.cardNumber, expiry: values.expiry, cvc: values.cvc, holderName: values.cardName },
      draft,
    );
  };

  const field = (key: keyof CheckoutFormValues, label: string, props: TextFieldProps = {}) => (
    <TextField
      name={key}
      id={`checkout-${key}`}
      label={label}
      value={values[key]}
      onChange={update(key)}
      error={Boolean(errors[key])}
      helperText={errors[key] ?? ' '}
      required
      fullWidth
      disabled={processing}
      {...props}
    />
  );

  const errorCount = Object.keys(errors).length;

  return (
    <Box component="section" aria-labelledby="checkout-heading">
      <Typography id="checkout-heading" variant="h4" component="h1" gutterBottom>
        Checkout
      </Typography>

      <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', md: '1.6fr 1fr' }, alignItems: 'start' }}>
        <Paper component="form" ref={formRef} noValidate onSubmit={handleSubmit} sx={{ p: { xs: 2, sm: 4 } }} aria-describedby="checkout-errors">
          <Box id="checkout-errors" aria-live="assertive">
            {submitted && errorCount > 0 && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {`Please fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} before we can take your money.`}
              </Alert>
            )}
            {couponNotice && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                {couponNotice}
              </Alert>
            )}
            {state.status === 'failed' && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {state.message}
              </Alert>
            )}
          </Box>

          <Box component="fieldset" disabled={processing} sx={{ border: 0, p: 0, m: 0, mb: 2 }}>
            <Typography component="legend" variant="h6" sx={{ mb: 2 }}>
              Delivery details
            </Typography>
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <Box sx={{ gridColumn: '1 / -1' }}>{field('fullName', 'Full name', { autoComplete: 'name' })}</Box>
              {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
              {field('phone', 'Mobile number', { type: 'tel', autoComplete: 'tel' })}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <AddressAutocomplete
                  value={values.address}
                  onChange={typeAddress}
                  onSelect={pickAddress}
                  error={Boolean(errors.address)}
                  helperText={errors.address}
                  disabled={processing}
                />
                {mapPoint && <AddressMap {...mapPoint} />}
              </Box>
              {field('city', 'City or town', { autoComplete: 'address-level2' })}
              {field('province', 'Province', {
                select: true,
                autoComplete: 'address-level1',
                children: PROVINCES.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                )),
              })}
              {field('postalCode', 'Postal code', {
                autoComplete: 'postal-code',
                slotProps: { htmlInput: { inputMode: 'numeric' } },
              })}
            </Box>
          </Box>

          <Box component="fieldset" disabled={processing} sx={{ border: 0, p: 0, m: 0 }}>
            <Typography component="legend" variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <LockOutlinedIcon fontSize="small" aria-hidden /> Payment
            </Typography>
            <Alert severity="info" variant="outlined" role="note" sx={{ mb: 2 }}>
              This is a simulated gateway, so no real money moves. Try <strong>{TEST_CARDS.success}</strong> (success),{' '}
              <strong>{TEST_CARDS.declined}</strong> (declined) or <strong>{TEST_CARDS.requires3ds}</strong> (bank
              approval). Use any future expiry and any 3-digit CVC.
            </Alert>
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr', sm: '2fr 1fr 1fr' } }}>
              <Box sx={{ gridColumn: '1 / -1' }}>{field('cardName', 'Name on card', { autoComplete: 'cc-name' })}</Box>
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                {field('cardNumber', 'Card number', {
                  autoComplete: 'cc-number',
                  slotProps: { htmlInput: { inputMode: 'numeric', maxLength: 23 } },
                })}
              </Box>
              {field('expiry', 'Expiry (MM/YY)', {
                autoComplete: 'cc-exp',
                placeholder: 'MM/YY',
                slotProps: { htmlInput: { inputMode: 'numeric', maxLength: 5 } },
              })}
              {field('cvc', 'CVC', {
                autoComplete: 'cc-csc',
                slotProps: { htmlInput: { inputMode: 'numeric', maxLength: 4 } },
              })}
            </Box>
          </Box>

          <Button type="submit" variant="contained" size="large" fullWidth disabled={processing} sx={{ mt: 2 }}>
            {processing ? 'Swimming to your bank…' : `Pay ${formatZar(totals.totalCents)}`}
          </Button>
        </Paper>

        {/* A labelled section, not <aside>: complementary landmarks may not sit inside <main>. */}
        <Paper component="section" aria-labelledby="summary-heading" sx={{ p: { xs: 2, sm: 3 }, position: { md: 'sticky' }, top: { md: 88 } }}>
          <Typography id="summary-heading" variant="h6" component="h2" gutterBottom>
            Order summary
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mb: 2 }}>
            {items.map((item) => (
              <Box component="li" key={item.productId} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.75 }}>
                <Typography variant="body2">
                  {item.title} <Typography component="span" variant="body2" color="text.secondary">× {item.quantity}</Typography>
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatZar(item.unitPriceCents * item.quantity)}
                </Typography>
              </Box>
            ))}
          </Box>
          <CartSummary couponDisabled={processing} />
        </Paper>
      </Box>

      <Dialog
        open={state.status === 'authenticating'}
        aria-labelledby="three-ds-title"
        aria-describedby="three-ds-description"
        // A pending bank challenge must be answered explicitly, not dismissed by accident.
        disableEscapeKeyDown
      >
        <DialogTitle id="three-ds-title">Approve on your banking app</DialogTitle>
        <DialogContent>
          <DialogContentText id="three-ds-description">
            Your bank wants to check it is really you before paying{' '}
            {state.status === 'authenticating' ? formatZar(state.amountCents) : ''} to Little Fish Market. In real life
            this is the notification your phone buzzes with. Here, you get two buttons.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => void authenticate(false)} color="inherit">
            Decline
          </Button>
          <Button onClick={() => void authenticate(true)} variant="contained">
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CheckoutPage;
