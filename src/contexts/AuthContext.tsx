import React, { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  signOut as firebaseSignOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, collection, query, limit, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getDb, googleProvider, appleProvider } from '@/services/firebase';
import { getOrgSettings, type OrgSettings } from '@/services/organizations';
import type { UserProfile } from '@/types/auth';
import { isStaffRole } from '@/types/auth';
import { AuthContext } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import {
  deriveInitialStaffDisplayName,
  GENERIC_STAFF_DISPLAY_PLACEHOLDER,
  staffPreferredFullDisplayName,
} from '@/lib/utils/staffDisplayName';
import { provisionStaffShellOrg } from '@/lib/auth/provisionStaffShellOrg';
import {
  syncCoachRosterFromProfile,
  shouldSyncCoachRosterRole,
} from '@/services/coachManagement';
import { CLIENT_EMAIL_LOOKUP_LIMIT } from '@/constants/firestoreQueryLimits';
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
  /** Avoid hammering Firestore when roster self-sync hits permission-denied (e.g. rules not deployed). */
  const coachRosterPermissionDeniedUntilRef = useRef(0);
  /** Skip redundant roster writes when profile snapshot fires with unchanged coach fields. */
  const lastSuccessfulCoachRosterSyncSigRef = useRef('');
  
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

          if (
            currentProfile.displayName === GENERIC_STAFF_DISPLAY_PLACEHOLDER &&
            firebaseUser.email
          ) {
            const suggested = deriveInitialStaffDisplayName(
              firebaseUser.email,
              firebaseUser.displayName,
            );
            if (suggested !== GENERIC_STAFF_DISPLAY_PLACEHOLDER) {
              void updateDoc(profileRef, {
                displayName: suggested,
                updatedAt: serverTimestamp(),
              }).catch((e) => logger.warn('[AUTH] displayName heal skipped:', e));
              currentProfile = { ...currentProfile, displayName: suggested };
            }
          }
          
          // Auto-heal: If onboarding not complete but org has assessments, mark onboarding complete
          if (
            currentProfile.onboardingCompleted === false &&
            currentProfile.organizationId
          ) {
            try {
              const assessmentsRef = collection(
                db,
                'organizations',
                currentProfile.organizationId,
                'assessments'
              );
              const assessmentSnap = await getDocs(query(assessmentsRef, limit(1)));
              if (!assessmentSnap.empty) {
                logger.info('[AUTH] User has org assessments; auto-completing onboarding.');
                await updateDoc(profileRef, {
                  onboardingCompleted: true,
                  updatedAt: serverTimestamp(),
                });
                return;
              }
            } catch (err) {
              logger.debug('[AUTH] Onboarding check skipped:', err);
            }
          }
        } else {
          // Check if this is a magic link sign-in (client) — do NOT auto-provision as org_admin
          const isMagicLink = isSignInWithEmailLink(getFirebaseAuth(), window.location.href)
            || window.location.pathname.startsWith('/r/');
          
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
              displayName: deriveInitialStaffDisplayName(
                firebaseUser.email,
                firebaseUser.displayName,
              ),
              onboardingCompleted: false
            };
          }
          setDoc(profileRef, currentProfile, { merge: true })
            .catch(e => logger.warn('[AUTH] Profile sync skipped:', e));
        }

        setProfile(currentProfile);

        if (
          currentProfile.organizationId &&
          shouldSyncCoachRosterRole(currentProfile.role) &&
          firebaseUser
        ) {
          const displayName = staffPreferredFullDisplayName(currentProfile, firebaseUser);
          const coachSyncSig = `${currentProfile.organizationId}|${firebaseUser.uid}|${displayName}|${firebaseUser.email ?? ''}|${currentProfile.role}`;
          if (Date.now() < coachRosterPermissionDeniedUntilRef.current) {
            /* cooldown after permission-denied */
          } else if (coachSyncSig === lastSuccessfulCoachRosterSyncSigRef.current) {
            /* already synced this payload */
          } else {
            void syncCoachRosterFromProfile({
              organizationId: currentProfile.organizationId,
              uid: firebaseUser.uid,
              displayName,
              email: firebaseUser.email,
              profileRole: currentProfile.role,
            })
              .then(() => {
                lastSuccessfulCoachRosterSyncSigRef.current = coachSyncSig;
              })
              .catch((e: unknown) => {
                const code =
                  e && typeof e === 'object' && 'code' in e
                    ? String((e as { code: unknown }).code)
                    : '';
                if (code === 'permission-denied') {
                  coachRosterPermissionDeniedUntilRef.current = Date.now() + 5 * 60 * 1000;
                }
                logger.debug('[AUTH] Coach roster sync skipped:', e);
              });
          }
        }

        // 4. Subscribe to Org Settings
        if (currentProfile.organizationId) {
          if (unsubSettings) unsubSettings();
          const orgRef = doc(db, 'organizations', currentProfile.organizationId);
          unsubSettings = onSnapshot(orgRef, (orgSnap) => {
            if (orgSnap.exists()) {
              const orgData = orgSnap.data();
              setOrgSettings({
                name: orgData.name || 'Your Organization',
                type: orgData.type,
                region: orgData.region,
                brandColor: orgData.brandColor || '#03dee2',
                gradientId: orgData.gradientId || 'volt',
                logoUrl: orgData.logoUrl,
                customBrandingEnabled: orgData.customBrandingEnabled,
                subscription: orgData.subscription,
                assessmentCredits:
                  typeof orgData.assessmentCredits === 'number' ? orgData.assessmentCredits : undefined,
                trialAssessmentsRemaining:
                  typeof orgData.trialAssessmentsRemaining === 'number'
                    ? orgData.trialAssessmentsRemaining
                    : undefined,
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
                onboardingCompletedAt: orgData.onboardingCompletedAt,
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

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;

    await updateProfile(newUser, { displayName });

    await provisionStaffShellOrg(db, {
      uid: newUser.uid,
      email,
      displayName,
    });
  };

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();
    const result = await signInWithPopup(auth, googleProvider);
    const newUser = result.user;
    const db = getDb();

    const profileRef = doc(db, 'userProfiles', newUser.uid);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      await provisionStaffShellOrg(db, {
        uid: newUser.uid,
        email: newUser.email || '',
        displayName: deriveInitialStaffDisplayName(newUser.email, newUser.displayName),
      });
    }
  };

  const signInWithApple = async () => {
    const auth = getFirebaseAuth();
    const result = await signInWithPopup(auth, appleProvider);
    const newUser = result.user;
    const db = getDb();

    const profileRef = doc(db, 'userProfiles', newUser.uid);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      await provisionStaffShellOrg(db, {
        uid: newUser.uid,
        email: newUser.email || '',
        displayName: deriveInitialStaffDisplayName(newUser.email, newUser.displayName),
      });
    }
  };

  /** Send a magic link email for client access.
   *  If returnUrl is provided, the link will redirect there after auth.
   *  Defaults to the current page URL. */
  const sendClientMagicLink = async (email: string, returnUrl?: string) => {
    const auth = getFirebaseAuth();
    const fallback = `${window.location.origin}${window.location.pathname}`;
    const actionCodeSettings = {
      url: returnUrl || fallback,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
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
          .then(async (credential) => {
            window.localStorage.removeItem('emailForSignIn');
            logger.info('[Auth] Magic link sign-in completed');

            // Link firebaseUid to the client's org profile doc (one-time, non-blocking)
            try {
              const clientUid = credential.user.uid;
              const clientEmail = credential.user.email || email;
              const db = getDb();

              // Find the client profile doc by email across all orgs
              const {
                collectionGroup,
                where: fbWhere,
                getDocs: fbGetDocs,
                query: fbQuery,
                updateDoc: fbUpdate,
                limit: fbLimit,
              } = await import('firebase/firestore');
              const clientQ = fbQuery(
                collectionGroup(db, 'clients'),
                fbWhere('email', '==', clientEmail),
                fbLimit(CLIENT_EMAIL_LOOKUP_LIMIT),
              );
              const clientSnap = await fbGetDocs(clientQ);
              for (const clientDoc of clientSnap.docs) {
                if (!clientDoc.data().firebaseUid) {
                  await fbUpdate(clientDoc.ref, { firebaseUid: clientUid });
                  logger.info('[Auth] Linked firebaseUid to client profile', { docPath: clientDoc.ref.path });
                }
              }
            } catch (linkErr) {
              logger.warn('[Auth] Failed to link firebaseUid to client profile (non-fatal):', linkErr);
            }
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
      signInWithGoogle,
      signInWithApple,
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




