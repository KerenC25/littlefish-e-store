import { useId, useState, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppDispatch } from '../../app/hooks';
import { brand as tokens } from '../../app/theme';
import { SIGNUP_ERRORS, subscribeToNewsletter, type SignupError } from './newsletterSlice';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; message: string } | { kind: 'error'; error: SignupError };

/** Footer sign-up. POPIA-friendly: explicit, unticked consent and a clear way out. */
export const NewsletterSignup = () => {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const statusId = useId();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus({ kind: 'sending' });
    const result = await dispatch(subscribeToNewsletter({ email, consent, honeypot }));
    if (subscribeToNewsletter.fulfilled.match(result)) {
      setStatus({
        kind: 'done',
        message:
          result.payload === 'already-subscribed'
            ? 'You are already in the shoal. Nice.'
            : 'Welcome to the shoal! Your 15% off code is in your inbox.',
      });
      setEmail('');
      setConsent(false);
    } else {
      setStatus({ kind: 'error', error: result.payload ?? 'failed' });
    }
  };

  const error = status.kind === 'error' ? status.error : null;

  return (
    <Box component="section" aria-labelledby="newsletter-heading" sx={{ maxWidth: 520 }}>
      <Typography id="newsletter-heading" component="h2" sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>
        Join the shoal
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        New stock, deals and the odd fish pun. 15% off your next order for signing up.
      </Typography>

      <Box component="form" onSubmit={submit} noValidate aria-describedby={statusId}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <TextField
            label="Email address"
            name="newsletter-email"
            type="email"
            autoComplete="email"
            size="small"
            value={email}
            onChange={(e) => setEmail(e.target.value.slice(0, 254))}
            error={error === 'invalid-email'}
            fullWidth
            sx={{
              // Inside the white input the label needs dark text; once it floats onto the ink
              // footer it switches to light text, so both states keep AA contrast.
              '& .MuiInputLabel-root': { color: 'text.secondary' },
              '& .MuiInputLabel-shrink': { color: tokens.body, bgcolor: tokens.ink, px: 0.5, borderRadius: '4px' },
              '& .MuiInputLabel-shrink.Mui-focused': { color: tokens.mint },
            }}
          />
          <Button type="submit" variant="contained" color="secondary" disabled={status.kind === 'sending'} sx={{ height: 40, flexShrink: 0 }}>
            {status.kind === 'sending' ? 'Joining…' : 'Subscribe'}
          </Button>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              sx={{ color: tokens.body, '&.Mui-checked': { color: tokens.mint } }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: tokens.body }}>
              Yes, send me Little Fish emails. I can unsubscribe any time.
            </Typography>
          }
          sx={{ mt: 1, alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.25 } }}
        />

        {/* Honeypot: off-screen and skipped by keyboard and screen readers. Bots fill it in. */}
        <Box aria-hidden sx={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          <label>
            Company
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </label>
        </Box>

        <Box id={statusId} aria-live="polite" sx={{ minHeight: 24, mt: 0.5 }}>
          {status.kind === 'done' && (
            <Typography variant="body2" sx={{ color: tokens.mint, fontWeight: 600 }}>
              {status.message}{' '}
              <Link component={RouterLink} to="/inbox" sx={{ color: tokens.amber }}>
                Open inbox
              </Link>
            </Typography>
          )}
          {error && (
            <Typography variant="body2" role="alert" sx={{ color: tokens.amberLight, fontWeight: 600 }}>
              {SIGNUP_ERRORS[error]}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};
