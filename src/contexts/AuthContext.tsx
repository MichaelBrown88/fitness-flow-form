import React, { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, collection, query, limit, getDocs, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getDb } from '@/services/firebase';
import { getOrgSettings, type OrgSettings } from '@/services/organizations';
import type { UserProfile } from '@/types/auth';
import { isStaffRole } from '@/types/auth';
import { AuthContext } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { 
  startImpersonation as startImpersonationService, 
  endImpersonation as endImpersonationService,
  getImpersonationSession,
  type ImpersonationSession 
} from '@/services/platform/impersonation';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationSession | null>(null);
  
  // Track if sign out was manual (to avoid clearing storage on manual sign out)
  const manualSignOutRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);
  
  // Restore impersonation session on mount
  useEffect(() => {
    const existingSession = getImpersonationSession();
    if (existingSession) {
      setImpersonation(existingSession);
      logger.info('[Auth] Restored impersonation session', { org: existingSession.targetOrgName });
    }
  }, []);

  const refreshSettings = async (): Promise<void> => {
    if (profile?.organizationId) {
      try {
        const settings = await getOrgSettings(profile.organizationId);
        setOrgSettings(settings);
      } catch (err) {
        // Log error but don't throw - settings will load on next navigation
        // Using logger for consistency with project rules
        const { logger } = await import('@/lib/utils/logger');
        logger.error('Failed to fetch org settings:', err instanceof Error ? err.message : String(err));
        // Settings will use defaults on next page load
      }
    }
  };

  // Clear all local auth storage (helper function)
  const clearLocalAuthStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB for Firebase
      if ('indexedDB' in window && indexedDB.databases) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name && (db.name.includes('firebase') || db.name.includes('firestore'))) {
              indexedDB.deleteDatabase(db.name);
              logger.debug(`Cleared IndexedDB: ${db.name}`);
            }
          });
        }).catch(err => {
          logger.warn('Failed to clear IndexedDB:', err);
        });
      }
      
      logger.info('Cleared local authentication storage');
    } catch (error) {
      logger.error('Error clearing local storage:', error);
    }
  };

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getDb();
    
    let unsubProfile: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // 1. Cleanup old listeners
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }
      if (unsubSettings) { unsubSettings(); unsubSettings = null; }

      // 2. Handle manual deletion/signout detection
      const hadUserBefore = previousUserIdRef.current !== null;
      const userWasDeleted = hadUserBefore && !firebaseUser && !manualSignOutRef.current;
      
      if (userWasDeleted) {
        logger.warn('User account was deleted - clearing local auth state');
        clearLocalAuthStorage();
        previousUserIdRef.current = null;
      }
      
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setProfile(null);
        setOrgSettings(null);
        setLoading(false);
        previousUserIdRef.current = null;
        return;
      }

      previousUserIdRef.current = firebaseUser.uid;

      // 3. Subscribe to User Profile
      const profileRef = doc(db, 'userProfiles', firebaseUser.uid);
      unsubProfile = onSnapshot(profileRef, async (profileSnap) => {
        let currentProfile: UserProfile;

        if (profileSnap.exists()) {
          currentProfile = profileSnap.data() as UserProfile;
          // Apply safety defaults
          if (!currentProfile.role) currentProfile.role = 'org_admin';
          
          // Legacy Auto-Heal: If onboarding is NOT complete, check if they have assessments
          if (currentProfile.onboardingCompleted === false) {
            try {
              const assessmentsRef = collection(db, 'coaches', firebaseUser.uid, 'assessments');
              const assessmentSnap = await getDocs(query(assessmentsRef, limit(1)));
              
              if (!assessmentSnap.empty) {
                logger.info('[AUTH] Legacy user detected with assessments. Auto-completing onboarding.');
                await updateDoc(profileRef, { 
                  onboardingCompleted: true,
                  updatedAt: new Date()
                });
                // Snapshot will trigger again with updated data
                return;
              }
            } catch (err) {
              logger.debug('[AUTH] Legacy check skipped:', err);
            }
          }
        } else {
          // Check if this is a magic link sign-in (client) — do NOT auto-provision as org_admin
          const isMagicLink = isSignInWithEmailLink(getFirebaseAuth(), window.location.href)
            || window.location.pathname.startsWith('/portal');
          
          if (isMagicLink) {
            // Client profile should be pre-created by coach invite Cloud Function
            // If missing, create a minimal client profile (will be linked during onboarding)
            logger.warn('[AUTH] Client magic link user has no profile — creating minimal client profile');
            currentProfile = {
              uid: firebaseUser.uid,
              organizationId: '', // Will be set by invite flow
              role: 'client',
              displayName: firebaseUser.displayName || firebaseUser.email || 'Client',
            };
          } else {
            // Staff sign-up: provision as org_admin (existing behavior)
            currentProfile = {
              uid: firebaseUser.uid,
              organizationId: `org-${firebaseUser.uid}`,
              role: 'org_admin',
              displayName: firebaseUser.displayName || 'Coach',
              onboardingCompleted: false
            };
          }
          setDoc(profileRef, currentProfile, { merge: true })
            .catch(e => logger.warn('[AUTH] Profile sync skipped:', e));
        }

        setProfile(currentProfile);

        // 4. Subscribe to Org Settings
        if (currentProfile.organizationId) {
          if (unsubSettings) unsubSettings();
          const orgRef = doc(db, 'organizations', currentProfile.organizationId);
          unsubSettings = onSnapshot(orgRef, (orgSnap) => {
            if (orgSnap.exists()) {
              const orgData = orgSnap.data();
              setOrgSettings({
                name: orgData.name || 'Your Organization',
                brandColor: orgData.brandColor || '#03dee2',
                gradientId: orgData.gradientId || 'purple-indigo',
                logoUrl: orgData.logoUrl,
                modules: (() => {
                  const raw = {
                    parq: true,
                    bodycomp: true,
                    fitness: true,
                    posture: true,
                    overheadSquat: true,
                    hinge: true,
                    lunge: true,
                    mobility: true,
                    strength: true,
                    lifestyle: true,
                    ...(orgData.modules || {})
                  } as Record<string, boolean>;
                  // Migrate legacy 'inbody' key → 'bodycomp'
                  if ('inbody' in raw && !('bodycomp' in (orgData.modules || {}))) {
                    raw.bodycomp = raw.inbody as boolean;
                  }
                  delete raw.inbody;
                  return raw;
                })() as OrgSettings['modules'],
                equipmentConfig: orgData.equipmentConfig,
                onboardingCompletedAt: orgData.onboardingCompletedAt
              } as OrgSettings);
            }
            setLoading(false);
          }, (err) => {
            logger.error('Settings snapshot error:', err.message);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      }, (err) => {
        logger.error('Profile snapshot error:', err.message);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const auth = getFirebaseAuth();
    const db = getDb();
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    
    // Update display name
    await updateProfile(newUser, { displayName });
    
    // Create user profile document
    const userProfile: UserProfile = {
      uid: newUser.uid,
      organizationId: `org-${newUser.uid}`, // Initial org tied to user
      role: 'org_admin',
      displayName,
      onboardingCompleted: false, // Explicitly set to false for new users
    };
    
    await setDoc(doc(db, 'userProfiles', newUser.uid), userProfile);
    
    // Create initial organization document (minimal, will be populated during onboarding)
    await setDoc(doc(db, 'organizations', `org-${newUser.uid}`), {
      name: '', // Will be set during onboarding
      ownerId: newUser.uid,
      subscription: {
        plan: 'starter',
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        billingEmail: email,
        clientSeats: 10, // Default, will be updated in Phase 1
      },
      createdAt: new Date(),
      // onboardingCompletedAt will be set when onboarding is complete
    });
    
    // State will be updated by onAuthStateChanged listener
  };

  /** Send a magic link email for client portal access */
  const sendClientMagicLink = async (email: string) => {
    const auth = getFirebaseAuth();
    const actionCodeSettings = {
      url: `${window.location.origin}/portal/login?email=${encodeURIComponent(email)}`,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // Store email locally so we can complete sign-in when the link is clicked
    window.localStorage.setItem('emailForSignIn', email);
  };

  // Handle magic link sign-in on mount (if returning from email link)
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        // Prompt the user for their email if not stored (different device)
        email = window.prompt('Please confirm your email address:');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            logger.info('[Auth] Magic link sign-in completed');
          })
          .catch((err) => {
            logger.error('[Auth] Magic link sign-in failed:', err);
          });
      }
    }
  }, []);

  const signOut = async () => {
    const auth = getFirebaseAuth();
    // Mark as manual sign out so we don't clear storage unnecessarily
    manualSignOutRef.current = true;
    // End any active impersonation session
    if (impersonation) {
      await endImpersonationService();
      setImpersonation(null);
    }
    await firebaseSignOut(auth);
    // Clear storage on manual sign out too (optional - can remove if you want to keep cache)
    clearLocalAuthStorage();
  };

  // Impersonation handlers (platform admins only)
  const handleStartImpersonation = useCallback(async (
    targetOrgId: string, 
    targetOrgName: string, 
    reason?: string
  ) => {
    if (!user || !profile) {
      throw new Error('Must be logged in to impersonate');
    }
    
    const session = await startImpersonationService(
      user.uid,
      user.email || 'unknown',
      targetOrgId,
      targetOrgName,
      reason
    );
    
    setImpersonation(session);
    logger.info('[Auth] Impersonation started', { org: targetOrgName });
  }, [user, profile]);

  const handleEndImpersonation = useCallback(async () => {
    await endImpersonationService();
    setImpersonation(null);
    logger.info('[Auth] Impersonation ended');
  }, []);

  // Effective organization ID - uses impersonated org when in impersonation mode
  const effectiveOrgId = impersonation?.targetOrgId || profile?.organizationId || null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      orgSettings, 
      loading, 
      signIn, 
      signUp, 
      signOut,
      sendClientMagicLink,
      refreshSettings,
      impersonation,
      startImpersonation: handleStartImpersonation,
      endImpersonation: handleEndImpersonation,
      effectiveOrgId,
    }}>
      {children}
    </AuthContext.Provider>
  );
}




