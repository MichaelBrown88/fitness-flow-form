import { useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Org-admin nav items (Billing, Org admin) are gated on `profile.role`.
 * After auth listener churn or Firestore snapshot timing, `profile` can be briefly null
 * while `user` is still set, which hides those items until the next snapshot.
 * This hook keeps admin chrome stable for the current session uid until we definitively
 * learn the user is coach or client.
 */
export function useOrgAdminNavVisibility(): boolean {
  const { user, profile } = useAuth();
  const sessionUidRef = useRef<string | null>(null);
  const lastOrgAdminUidRef = useRef<string | null>(null);

  if (!user?.uid) {
    sessionUidRef.current = null;
    lastOrgAdminUidRef.current = null;
    return false;
  }

  if (sessionUidRef.current !== user.uid) {
    sessionUidRef.current = user.uid;
    lastOrgAdminUidRef.current = null;
  }

  const role = profile?.role;

  if (role === 'org_admin') {
    lastOrgAdminUidRef.current = user.uid;
    return true;
  }

  if (role === 'coach' || role === 'client') {
    lastOrgAdminUidRef.current = null;
    return false;
  }

  return lastOrgAdminUidRef.current === user.uid;
}
