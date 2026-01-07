import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types/auth';
import type { OrgSettings } from '@/services/organizations';

export interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  orgSettings: OrgSettings | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
