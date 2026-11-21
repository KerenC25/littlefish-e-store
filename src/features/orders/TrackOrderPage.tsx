import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppSelector } from '../../app/hooks';
import { findOrderForLookup, selectAllOrders } from './ordersSlice';

/** Guest order lookup: reference + email, like a courier's tracking form. */
export const TrackOrderPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orders = useAppSelector(selectAllOrders);
  const [reference, setReference] = useState(() => (params.get('ref') ?? '').slice(0, 20).toUpperCase());
  const [email, setEmail] = useState('');
  const [notFound, setNotFound] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const order = findOrderForLookup(orders, reference, email);
    if (!order) {
      setNotFound(true);
      return;
    }
    // The verified email travels in history state, never in the URL.
    navigate(`/orders/${order.reference}`, { state: { verifiedEmail: email } });
  };

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: { xs: 2, md: 6 } }}>
      <Paper component="section" aria-labelledby="track-heading" sx={{ p: { xs: 3, sm: 5 }, width: '100%', maxWidth: 480 }}>
        <Typography id="track-heading" variant="h4" component="h1" gutterBottom>
          Track an order
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Pop in your order reference and the email you used. No queue, no hold music.
        </Typography>

        {notFound && (
          <Alert severity="error" role="alert" sx={{ mb: 2 }}>
            We could not find an order with that reference and email. Check both and try again.
          </Alert>
        )}

        <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Order reference"
            name="reference"
            placeholder="LFM-1A2B3C4D"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value.toUpperCase().slice(0, 20));
              setNotFound(false);
            }}
            required
            slotProps={{ htmlInput: { autoCapitalize: 'characters', spellCheck: false } }}
          />
          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value.slice(0, 254));
              setNotFound(false);
            }}
            required
          />
          <Button type="submit" variant="contained" color="secondary" size="large" disabled={!reference.trim() || !email.trim()}>
            Find my order
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default TrackOrderPage;
