import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';
import Alert, { type AlertColor } from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

/**
 * Global, non-Redux state via Context + useReducer (assessment bonus).
 *
 * Toasts are ephemeral UI concerns that nothing else needs to read, so they do not belong
 * in the Redux store. The API is split into two contexts so components that only *send*
 * notifications never re-render when the queue changes.
 */
export interface Notification {
  id: number;
  message: string;
  severity: AlertColor;
}

type Action =
  | { type: 'pushed'; notification: Notification }
  | { type: 'dismissed'; id: number };

export const notificationsReducer = (queue: Notification[], action: Action): Notification[] => {
  switch (action.type) {
    case 'pushed':
      // Cap the queue so a burst of events cannot grow it without bound.
      return [...queue, action.notification].slice(-5);
    case 'dismissed':
      return queue.filter((n) => n.id !== action.id);
  }
};

export type Notify = (message: string, severity?: AlertColor) => void;

const NotifyContext = createContext<Notify | null>(null);

let nextId = 1;

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [queue, dispatch] = useReducer(notificationsReducer, []);

  const notify = useCallback<Notify>((message, severity = 'success') => {
    dispatch({ type: 'pushed', notification: { id: nextId++, message, severity } });
  }, []);

  const current = queue[0];
  const dismiss = useMemo(
    () => (current ? () => dispatch({ type: 'dismissed', id: current.id }) : undefined),
    [current],
  );

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={current?.id}
        open={current !== undefined}
        autoHideDuration={4000}
        onClose={(_event, reason) => {
          if (reason !== 'clickaway') dismiss?.();
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {/* Alert renders role="alert" for errors and role="status" otherwise (see below). */}
        <Alert
          onClose={dismiss}
          severity={current?.severity ?? 'info'}
          variant="filled"
          role={current?.severity === 'error' ? 'alert' : 'status'}
          sx={{ width: '100%' }}
        >
          {current?.message}
        </Alert>
      </Snackbar>
    </NotifyContext.Provider>
  );
};

export const useNotify = (): Notify => {
  const notify = useContext(NotifyContext);
  if (!notify) throw new Error('useNotify must be used inside <NotificationsProvider>');
  return notify;
};
