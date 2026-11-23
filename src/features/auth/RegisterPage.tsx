import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link as RouterLink, Navigate, useHref, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppSelector } from '../../app/hooks';
import { useSignUpMutation } from '../../services/supabaseAuthApi';
import { useNotify } from '../../shared/notifications/NotificationsContext';
import { isSignUpEnabled } from '../../shared/supabaseConfig';
import { selectIsAuthenticated } from './authSlice';
import { PasswordField } from './components/PasswordField';
import { safeRedirectPath } from './LoginPage';
import {
  NAME_MAX,
  PASSWORD_HINT,
  REGISTER_FIELD_ORDER,
  emptyRegisterValues,
  validateRegister,
  type RegisterErrors,
  type RegisterField,
  type RegisterValues,
} from './registerForm';
import { authErrorMessage } from './supabaseMappers';

const Shell = ({ children }: { children: ReactNode }) => (
  <Box sx={{ display: 'grid', placeItems: 'center', py: { xs: 2, md: 6 } }}>
    <Paper component="section" aria-labelledby="register-heading" sx={{ p: { xs: 3, sm: 5 }, width: '100%', maxWidth: 480 }}>
      {children}
    </Paper>
  </Box>
);

/** Shown after sign-up when Supabase wants the email confirmed first. */
const CheckYourInbox = ({ email }: { email: string }) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <Shell>
      <Typography id="register-heading" ref={headingRef} tabIndex={-1} variant="h4" component="h1" gutterBottom sx={{ outline: 'none' }}>
        Check your inbox
      </Typography>
      <Typography sx={{ mb: 2 }}>
        If <strong>{email}</strong> is new to us, a confirmation link is on its way. Tap it and you will land back
        here, signed in.
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Nothing after a few minutes? Peek in spam, or sign in if you already have an account.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button component={RouterLink} to="/" variant="contained">
          Back to the shop
        </Button>
        <Button component={RouterLink} to="/login" variant="outlined">
          Sign in
        </Button>
      </Box>
    </Shell>
  );
};

export const RegisterPage = () => {
  const [signUp, { isLoading, error }] = useSignUpMutation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();
  const redirectTo = safeRedirectPath((location.state as { from?: unknown } | null)?.from);
  // App root including the GitHub Pages base path: where the confirmation link should land.
  const appRoot = useHref('/');

  const [values, setValues] = useState<RegisterValues>(emptyRegisterValues);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const refs = useRef<Partial<Record<RegisterField, HTMLInputElement | null>>>({});

  if (pendingEmail) return <CheckYourInbox email={pendingEmail} />;
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  const enabled = isSignUpEnabled();

  const update = (field: RegisterField) => (value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    // After the first submit, re-validate as they type so errors clear as soon as they are fixed.
    if (submitted) setErrors(validateRegister(next));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const found = validateRegister(values);
    setErrors(found);
    const first = REGISTER_FIELD_ORDER.find((f) => found[f]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    try {
      const result = await signUp({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        redirectTo: new URL(appRoot, window.location.origin).href,
      }).unwrap();
      if (result.kind === 'signed-in') {
        notify(`Welcome to the shoal, ${result.session.user.firstName}. Your account is ready.`);
        navigate(redirectTo, { replace: true });
      } else {
        setPendingEmail(result.email);
      }
    } catch {
      // Shown below from the mutation's `error`. Clear the passwords, keep everything else.
      setValues((v) => ({ ...v, password: '', confirmPassword: '' }));
    }
  };

  const nameField = (field: 'firstName' | 'lastName', label: string, autoComplete: string) => (
    <TextField
      label={label}
      name={field}
      autoComplete={autoComplete}
      value={values[field]}
      onChange={(e) => update(field)(e.target.value)}
      error={Boolean(errors[field])}
      helperText={errors[field] || ' '}
      required
      inputRef={(el: HTMLInputElement | null) => {
        refs.current[field] = el;
      }}
      slotProps={{ htmlInput: { maxLength: NAME_MAX } }}
    />
  );

  return (
    <Shell>
      <Typography id="register-heading" variant="h4" component="h1" gutterBottom>
        Create an account
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        One account, every order in one place. Takes less time than finding parking in Rosebank.
      </Typography>

      {!enabled ? (
        <>
          <Alert severity="info" role="note" sx={{ mb: 3 }}>
            Sign-up is not switched on for this copy of the store yet. You can still shop and check out with the
            demo account.
          </Alert>
          <Button component={RouterLink} to="/login" state={{ from: redirectTo }} variant="contained">
            Sign in with the demo account
          </Button>
        </>
      ) : (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} role="alert">
              {authErrorMessage(error, 'We could not create your account. Please try again.')}
            </Alert>
          )}

          <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              {nameField('firstName', 'First name', 'given-name')}
              {nameField('lastName', 'Last name', 'family-name')}
            </Box>
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => update('email')(e.target.value)}
              error={Boolean(errors.email)}
              helperText={errors.email || ' '}
              required
              inputRef={(el: HTMLInputElement | null) => {
                refs.current.email = el;
              }}
              slotProps={{ htmlInput: { maxLength: 254, autoCapitalize: 'none', spellCheck: false } }}
            />
            <PasswordField
              label="Password"
              autoComplete="new-password"
              value={values.password}
              onChange={update('password')}
              error={errors.password}
              hint={PASSWORD_HINT}
              inputRef={(el) => {
                refs.current.password = el;
              }}
            />
            <PasswordField
              label="Confirm password"
              name="confirmPassword"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={update('confirmPassword')}
              error={errors.confirmPassword}
              inputRef={(el) => {
                refs.current.confirmPassword = el;
              }}
            />
            <Typography variant="body2" color="text.secondary">
              We only use your name and email to run your account and send order updates. No spam, promise.
            </Typography>
            <Button type="submit" variant="contained" size="large" disabled={isLoading} sx={{ mt: 1 }}>
              {isLoading ? 'Creating your account…' : 'Create account'}
            </Button>
          </Box>
        </>
      )}

      <Typography sx={{ mt: 3 }}>
        Already have an account?{' '}
        <Link component={RouterLink} to="/login" state={{ from: redirectTo }}>
          Sign in
        </Link>
      </Typography>
    </Shell>
  );
};

export default RegisterPage;
