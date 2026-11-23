import { useState, type Ref } from 'react';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

interface PasswordFieldProps {
  label: string;
  autoComplete: 'current-password' | 'new-password';
  value: string;
  onChange: (value: string) => void;
  /** Validation error; takes the place of the hint while present. */
  error?: string;
  /** Always-available guidance (e.g. the password rules). */
  hint?: string;
  name?: string;
  inputRef?: Ref<HTMLInputElement>;
}

/** Password input with an accessible show/hide toggle. */
export const PasswordField = ({ label, autoComplete, value, onChange, error = '', hint = '', name = 'password', inputRef }: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      label={label}
      name={name}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={Boolean(error)}
      helperText={error || hint || ' '}
      required
      inputRef={inputRef}
      slotProps={{
        htmlInput: { maxLength: 128 },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                aria-pressed={visible}
                edge="end"
              >
                {visible ? <VisibilityOff aria-hidden /> : <Visibility aria-hidden />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
};
