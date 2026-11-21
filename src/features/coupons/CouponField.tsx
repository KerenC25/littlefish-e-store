import { useId, useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { brand as tokens } from '../../app/theme';
import { selectCartTotals } from '../cart/cartSlice';
import { findCoupon, validateCoupon } from './coupons';
import { couponApplied, couponRemoved, selectCouponCode } from './couponSlice';

/** Apply / remove a coupon. Shared by the cart dialog and checkout. */
export const CouponField = ({ disabled = false }: { disabled?: boolean }) => {
  const dispatch = useAppDispatch();
  const code = useAppSelector(selectCouponCode);
  const { subtotalCents, couponIssue } = useAppSelector(selectCartTotals);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const check = validateCoupon(input, subtotalCents);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    dispatch(couponApplied(check.coupon.code));
    setInput('');
    setError(null);
  };

  if (code) {
    const coupon = findCoupon(code);
    return (
      <Box
        role="status"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          borderRadius: '14px',
          bgcolor: couponIssue ? '#FFF4E5' : tokens.mintWash,
          border: 1,
          borderColor: couponIssue ? '#FFD08A' : 'transparent',
        }}
      >
        <LocalOfferOutlinedIcon aria-hidden sx={{ color: tokens.tealDeep }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={800}>{code} applied</Typography>
          <Typography variant="body2" color="text.secondary">
            {couponIssue ?? coupon?.description}
          </Typography>
        </Box>
        <Button size="small" onClick={() => dispatch(couponRemoved())} disabled={disabled} aria-label={`Remove coupon ${code}`}>
          Remove
        </Button>
      </Box>
    );
  }

  return (
    // A real <form> so Enter applies the code; nested inside checkout's form it would be
    // invalid HTML, so checkout renders this outside its payment form.
    <Box component="form" onSubmit={apply} noValidate aria-label="Coupon">
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          id={fieldId}
          label="Coupon code"
          size="small"
          value={input}
          onChange={(e) => {
            setInput(e.target.value.toUpperCase().slice(0, 20));
            if (error) setError(null);
          }}
          error={Boolean(error)}
          helperText={error ?? 'Psst: try LEKKER10.'}
          disabled={disabled}
          fullWidth
          slotProps={{ htmlInput: { autoCapitalize: 'characters', spellCheck: false, autoComplete: 'off' } }}
        />
        <Button type="submit" variant="outlined" disabled={disabled || !input.trim()} sx={{ height: 40, flexShrink: 0 }}>
          Apply
        </Button>
      </Box>
    </Box>
  );
};
