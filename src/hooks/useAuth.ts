import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types/auth';
import { isStaffRole } from '@/types/auth';
import type { OrgSettings } from '@/services/organizations';
import type { ImpersonationSession } from '@/services/platform/impersonation';

export interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  orgSettings: OrgSettings | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Send a magic link email for client portal access */
  sendClientMagicLink: (email: string) => Promise<void>;
  refreshSettings: () => Promise<void>;
  /** Impersonation state (platform admins only) */
  impersonation: ImpersonationSession | null;
  /** Start impersonating an organization */
  startImpersonation: (targetOrgId: string, targetOrgName: string, reason?: string) => Promise<void>;
  /** End current impersonation session */
  endImpersonation: () => Promise<void>;
  /** Get the effective organization ID (impersonated or real) */
  effectiveOrgId: string | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

/** Convenience: check if the current user is a staff member (coach or admin) */
export function useIsStaff(): boolean {
  const { profile } = useAuth();
  return !!profile && isStaffRole(profile.role);
}

/** Convenience: check if the current user is a client */
export function useIsClient(): boolean {
  const { profile } = useAuth();
  return profile?.role === 'client';
}
