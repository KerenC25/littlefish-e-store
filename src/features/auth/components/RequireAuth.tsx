import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../../app/hooks';
import { PageLoader } from '../../../shared/components/PageLoader';
import { StatusMessage } from '../../../shared/components/StatusMessage';
import { selectCurrentUser, selectHasSession, selectIsAuthenticated } from '../authSlice';
import type { Role } from '../types';

interface RequireAuthProps {
  children: ReactNode;
  /** Optional role-based authorisation on top of authentication. */
  roles?: Role[];
}

/**
 * Route guard. Note this is a UX convenience, not the security boundary: the API must
 * enforce the same rules, because anything in the browser can be bypassed.
 */
export const RequireAuth = ({ children, roles }: RequireAuthProps) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const hasSession = useAppSelector(selectHasSession);
  const user = useAppSelector(selectCurrentUser);
  const location = useLocation();

  if (!isAuthenticated) {
    // A refresh token exists but the session is still being restored after reload.
    if (hasSession) return <PageLoader label="Restoring your session" />;
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && (!user?.role || !roles.includes(user.role))) {
    return (
      <StatusMessage role="alert" illustration="🔒" title="Not for you, sorry" description="You do not have access to this page." />
    );
  }

  return <>{children}</>;
};
