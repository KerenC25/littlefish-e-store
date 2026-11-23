import { useEffect } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { useNotify } from '../../../shared/notifications/NotificationsContext';
import { completeEmailConfirmation, restoreSession } from '../authThunks';
import { parseConfirmationFragment } from '../supabaseMappers';

/** Removes auth tokens from the address bar (and so from history, bookmarks and screenshots). */
const clearFragment = () => {
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, '', `${pathname}${search}`);
};

/**
 * Runs once on start-up. Either finishes an email confirmation (tokens in the URL fragment)
 * or restores a persisted session. Renders nothing.
 */
export const SessionBootstrap = () => {
  const dispatch = useAppDispatch();
  const notify = useNotify();

  useEffect(() => {
    const hash = typeof window === 'undefined' ? '' : window.location.hash;
    if (parseConfirmationFragment(hash).kind === 'none') {
      void dispatch(restoreSession());
      return;
    }
    // Strip first, synchronously, so the tokens never linger even if what follows fails.
    clearFragment();
    void dispatch(completeEmailConfirmation(hash))
      .unwrap()
      .then((outcome) => {
        if (outcome.kind === 'signed-in') notify(`Email confirmed. Welcome to the shoal, ${outcome.firstName}.`);
        else if (outcome.kind === 'error') notify(outcome.message, 'error');
      });
  }, [dispatch, notify]);

  return null;
};
