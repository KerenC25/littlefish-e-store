import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

interface StatusMessageProps {
  title: string;
  description?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  /** `alert` interrupts screen readers (errors); `status` is polite (empty states). */
  role?: 'alert' | 'status';
  illustration?: ReactNode;
}

/** One component for empty and error states, so both look and behave consistently. */
export const StatusMessage = ({
  title,
  description,
  actionLabel,
  onAction,
  role = 'status',
  illustration,
}: StatusMessageProps) => (
  <Box
    role={role}
    sx={{
      display: 'grid',
      justifyItems: 'center',
      gap: 1.5,
      py: 8,
      px: 2,
      textAlign: 'center',
    }}
  >
    {illustration && (
      <Box aria-hidden sx={{ fontSize: 56, lineHeight: 1 }}>
        {illustration}
      </Box>
    )}
    <Typography variant="h6" component="p" fontWeight={700}>
      {title}
    </Typography>
    {description && (
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        {description}
      </Typography>
    )}
    {actionLabel && onAction && (
      <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
        {actionLabel}
      </Button>
    )}
  </Box>
);
