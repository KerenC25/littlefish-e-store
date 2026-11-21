import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAppSelector } from '../../app/hooks';
import { useNotify } from '../../shared/notifications/NotificationsContext';
import { getErrorMessage } from '../../shared/utils/errors';
import { useLoginMutation } from './authApi';
import { selectIsAuthenticated } from './authSlice';

/** Only allow redirects to in-app paths, never to another origin (open-redirect guard). */
export const safeRedirectPath = (from: unknown): string =>
  typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';

export const DEMO_CREDENTIALS = { username: 'emilys', password: 'emilyspass' } as const;

export const LoginPage = () => {
  const [login, { isLoading, error }] = useLoginMutation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();
  const redirectTo = safeRedirectPath((location.state as { from?: unknown } | null)?.from);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);

  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  const usernameError = touched && username.trim() === '' ? 'Enter your username' : '';
  const passwordError = touched && password === '' ? 'Enter your password' : '';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!username.trim() || !password) return;
    try {
      const user = await login({ username, password }).unwrap();
      notify(`Howzit, ${user.firstName}. You are signed in.`);
      navigate(redirectTo, { replace: true });
    } catch {
      // Rendered below from the mutation's `error`. Clear the password, keep the username.
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

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
            {getErrorMessage(error, 'Those details did not work. Please try again.')}
          </Alert>
        )}

        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={Boolean(usernameError)}
            helperText={usernameError || ' '}
            required
            slotProps={{ htmlInput: { maxLength: 64, autoCapitalize: 'none', spellCheck: false } }}
          />
          <TextField
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(passwordError)}
            helperText={passwordError || ' '}
            required
            slotProps={{
              htmlInput: { maxLength: 128 },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff aria-hidden /> : <Visibility aria-hidden />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button type="submit" variant="contained" size="large" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </Box>

        {/* Static hint, not an urgent message: override Alert's default role="alert". */}
        <Alert severity="info" variant="outlined" role="note" sx={{ mt: 3 }}>
          Demo account (DummyJSON): <strong>{DEMO_CREDENTIALS.username}</strong> /{' '}
          <strong>{DEMO_CREDENTIALS.password}</strong>
          <Button
            size="small"
            onClick={() => {
              setUsername(DEMO_CREDENTIALS.username);
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
