import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types/auth';
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
