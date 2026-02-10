/**
 * Route guard for staff-only pages (coach and org_admin).
 * Redirects to /portal if a client accidentally navigates here.
 * Redirects to /login if not authenticated.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function RequireStaffAuth({ children }: { children: JSX.Element }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Checking coach session...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // Client navigated to staff area → redirect to client portal
  if (profile?.role === 'client') {
    return <Navigate to="/portal" replace />;
  }

  return children;
}
