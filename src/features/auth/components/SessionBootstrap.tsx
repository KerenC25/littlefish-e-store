import { useEffect } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { restoreSession } from '../authThunks';

/** Restores a persisted session once on start-up. Renders nothing. */
export const SessionBootstrap = () => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    void dispatch(restoreSession());
  }, [dispatch]);
  return null;
};
