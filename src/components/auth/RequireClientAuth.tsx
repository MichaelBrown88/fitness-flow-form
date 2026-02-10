/**
 * Route guard for client-only pages.
 * Redirects to /portal/login if not authenticated or not a client.
 * Redirects to /dashboard if a staff member accidentally navigates here.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isStaffRole } from '@/types/auth';

export function RequireClientAuth({ children }: { children: JSX.Element }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Loading your portal...
      </div>
    );
  }

  // Not logged in → client login page
  if (!user) {
    return (
      <Navigate
        to="/portal/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // Staff member navigated to client portal → redirect to dashboard
  if (profile && isStaffRole(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
