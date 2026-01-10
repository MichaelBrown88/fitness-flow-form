import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    if (profile?.organizationId) {
      try {
        const settings = await getOrgSettings(profile.organizationId);
        setOrgSettings(settings);
      } catch (err) {
        console.error('Failed to fetch org settings:', err);
      }
    }
  };

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
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
    return () => unsubscribe();
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
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, orgSettings, loading, signIn, signUp, signOut, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
}




