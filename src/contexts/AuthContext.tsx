import React, { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { setDoc } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getDb } from '@/services/firebase';
import { getOrgSettings, type OrgSettings } from '@/services/organizations';
import type { UserRole, UserProfile } from '@/types/auth';
import { AuthContext } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track if sign out was manual (to avoid clearing storage on manual sign out)
  const manualSignOutRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);

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
    
    // Check for stale auth state on mount (user deleted while browser was closed)
    const checkStaleAuth = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          // Try to refresh token - if user was deleted, this will fail
          await currentUser.getIdToken(true);
          previousUserIdRef.current = currentUser.uid;
          
          // Also verify user profile exists in Firestore
          try {
            const profileDoc = await getDoc(doc(getDb(), 'userProfiles', currentUser.uid));
            if (!profileDoc.exists()) {
              // User profile doesn't exist - user was likely deleted
              logger.warn('User profile not found - user may have been deleted');
              clearLocalAuthStorage();
              await firebaseSignOut(auth);
              setUser(null);
              setProfile(null);
              setOrgSettings(null);
              setLoading(false);
              return;
            }
          } catch (profileError) {
            // If we can't check profile, continue anyway (might be network issue)
            logger.debug('Could not verify user profile:', profileError);
          }
        } catch (tokenError) {
          // User was deleted - clear everything
          logger.warn('Stale auth detected - user was deleted:', tokenError);
          clearLocalAuthStorage();
          await firebaseSignOut(auth);
          setUser(null);
          setProfile(null);
          setOrgSettings(null);
          setLoading(false);
        }
      }
    };
    
    // Run check on mount (with slight delay to ensure Firebase is ready)
    const timeoutId = setTimeout(() => {
      void checkStaleAuth();
    }, 100);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Detect if user was deleted (user becomes null but we didn't manually sign out)
      const hadUserBefore = previousUserIdRef.current !== null;
      const userWasDeleted = hadUserBefore && !firebaseUser && !manualSignOutRef.current;
      
      if (userWasDeleted) {
        // User was deleted from Firebase Console - clear all local storage
        logger.warn('User account was deleted - clearing local authentication storage');
        clearLocalAuthStorage();
        previousUserIdRef.current = null;
      }
      
      // Update previous user ID
      if (firebaseUser) {
        previousUserIdRef.current = firebaseUser.uid;
      }
      
      // Reset manual sign out flag after handling
      if (manualSignOutRef.current) {
        manualSignOutRef.current = false;
      }
      
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Validate user still exists by checking token (catch any deletion that happened during session)
        try {
          await firebaseUser.getIdToken(true); // Force token refresh to validate user exists
        } catch (tokenError) {
          // Token refresh failed - user was likely deleted
          logger.warn('Token refresh failed - user may have been deleted:', tokenError);
          clearLocalAuthStorage();
          await firebaseSignOut(auth);
          setUser(null);
          setProfile(null);
          setOrgSettings(null);
          previousUserIdRef.current = null;
          setLoading(false);
          return;
        }
        try {
          const profileDoc = await getDoc(doc(getDb(), 'userProfiles', firebaseUser.uid));
          let currentProfile: UserProfile;
          
          if (profileDoc.exists()) {
            currentProfile = profileDoc.data() as UserProfile;
            
            // Force Admin role for the owner if not set (SaaS Migration Safety)
            if (!currentProfile.role || currentProfile.role === 'coach') {
              currentProfile.role = 'org_admin';
            }
          } else {
            // SaaS Readiness: Automatically grant Admin status to the owner/main coach
            currentProfile = {
              uid: firebaseUser.uid,
              organizationId: `org-${firebaseUser.uid}`, 
              role: 'org_admin', 
              displayName: firebaseUser.displayName || 'Coach',
            };
            
            // Background save
            import('firebase/firestore').then(({ setDoc, doc }) => {
              setDoc(doc(getDb(), 'userProfiles', firebaseUser.uid), currentProfile, { merge: true })
                .catch(e => console.warn('[AUTH] Background profile sync skipped:', e));
            });
          }
          
          // Even if save fails, the state now reflects the correct Admin role
          setProfile(currentProfile);
          
          // Fetch Org Settings - Provide a local fallback if the database is locked
          try {
            const settings = await getOrgSettings(currentProfile.organizationId);
            setOrgSettings(settings);
          } catch (settingsErr) {
            console.warn('[AUTH] Database settings locked, using local defaults:', settingsErr);
            // Fallback to default modules so the UI remains functional
            setOrgSettings({
              name: 'Organization Name',
              brandColor: '#03dee2', // Use a default brand color instead of indigo
              modules: { 
                parq: true,
                inbody: true, 
                fitness: true, 
                posture: true, 
                overheadSquat: true,
                hinge: true,
                lunge: true,
                mobility: true,
                strength: true, 
                lifestyle: true 
              }
            });
          }

        } catch (err) {
          console.error('Failed to fetch user profile:', err);
          setProfile(null);
          setOrgSettings(null);
        }
      } else {
        setProfile(null);
        setOrgSettings(null);
      }
      
      setLoading(false);
    });
    return () => {
      unsubscribe();
      // Cleanup timeout if component unmounts
      if (timeoutId) clearTimeout(timeoutId);
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

  const signOut = async () => {
    const auth = getFirebaseAuth();
    // Mark as manual sign out so we don't clear storage unnecessarily
    manualSignOutRef.current = true;
    await firebaseSignOut(auth);
    // Clear storage on manual sign out too (optional - can remove if you want to keep cache)
    clearLocalAuthStorage();
  };

  return (
    <AuthContext.Provider value={{ user, profile, orgSettings, loading, signIn, signUp, signOut, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
}




