import { useState, type FormEvent } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppSelector } from '../../app/hooks';
import { useSignInWithEmailMutation } from '../../services/supabaseAuthApi';
import { useNotify } from '../../shared/notifications/NotificationsContext';
import { getErrorMessage } from '../../shared/utils/errors';
import { useLoginMutation } from './authApi';
import { selectIsAuthenticated } from './authSlice';
import { PasswordField } from './components/PasswordField';
import { authErrorMessage } from './supabaseMappers';

/** Only allow redirects to in-app paths, never to another origin (open-redirect guard). */
export const safeRedirectPath = (from: unknown): string =>
  typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';

export const DEMO_CREDENTIALS = { username: 'emilys', password: 'emilyspass' } as const;

/** Registered customers sign in with their email; the demo account uses a DummyJSON username. */
export const isEmailIdentifier = (identifier: string): boolean => identifier.includes('@');

export const LoginPage = () => {
  const [login, demoLogin] = useLoginMutation();
  const [signInWithEmail, emailLogin] = useSignInWithEmailMutation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();
  const redirectTo = safeRedirectPath((location.state as { from?: unknown } | null)?.from);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [method, setMethod] = useState<'demo' | 'email' | null>(null);

  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  const isLoading = demoLogin.isLoading || emailLogin.isLoading;
  const identifierError = touched && identifier.trim() === '' ? 'Enter your email or username' : '';
  const passwordError = touched && password === '' ? 'Enter your password' : '';

  const errorMessage =
    method === 'email' && emailLogin.error
      ? authErrorMessage(emailLogin.error, 'Those details did not work. Please try again.')
      : method === 'demo' && demoLogin.error
        ? getErrorMessage(demoLogin.error, 'Those details did not work. Please try again.')
        : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    const trimmed = identifier.trim();
    if (!trimmed || !password) return;
    try {
      let firstName: string;
      if (isEmailIdentifier(trimmed)) {
        setMethod('email');
        firstName = (await signInWithEmail({ email: trimmed, password }).unwrap()).user.firstName;
      } else {
        setMethod('demo');
        firstName = (await login({ username: trimmed, password }).unwrap()).firstName;
      }
      notify(`Howzit, ${firstName}. You are signed in.`);
      navigate(redirectTo, { replace: true });
    } catch {
      // Rendered below from the mutation's `error`. Clear the password, keep the identifier.
      setPassword('');
    }
  };

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: { xs: 2, md: 6 } }}>
      <Paper component="section" aria-labelledby="login-heading" sx={{ p: { xs: 3, sm: 5 }, width: '100%', maxWidth: 440 }}>
        <Typography id="login-heading" variant="h4" component="h1" gutterBottom>
          Sign in
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Sign in to check out. No queue, no ticket number, no security question about your first pet.
        </Typography>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
            {errorMessage}
          </Alert>
        )}

        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Email or username"
            name="username"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={Boolean(identifierError)}
            helperText={identifierError || ' '}
            required
            slotProps={{ htmlInput: { maxLength: 254, autoCapitalize: 'none', spellCheck: false } }}
          />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={passwordError}
          />
          <Button type="submit" variant="contained" size="large" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </Box>

        <Typography sx={{ mt: 3 }}>
          New here?{' '}
          <Link component={RouterLink} to="/register" state={{ from: redirectTo }}>
            Create an account
          </Link>
        </Typography>

        {/* Static hint, not an urgent message: override Alert's default role="alert". */}
        <Alert severity="info" variant="outlined" role="note" sx={{ mt: 3 }}>
          Demo account (DummyJSON): <strong>{DEMO_CREDENTIALS.username}</strong> /{' '}
          <strong>{DEMO_CREDENTIALS.password}</strong>
          <Button
            size="small"
            onClick={() => {
              setIdentifier(DEMO_CREDENTIALS.username);
              setPassword(DEMO_CREDENTIALS.password);
            }}
            sx={{ ml: 1 }}
          >
            Fill in
          </Button>
        </Alert>
      </Paper>
    </Box>
  );
};

export default LoginPage;
