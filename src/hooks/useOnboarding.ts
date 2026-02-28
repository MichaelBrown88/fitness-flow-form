/**
 * useOnboarding Hook
 *
 * Manages the 5-step onboarding flow:
 *   0  Identity (name + email only — no auth)
 *   1  Business (BusinessInfoStep)
 *   2  Equipment (EquipmentStep)
 *   3  Plan (PackageSelectionStep)
 *   4  Account (password + social sign-in — creates Firebase Auth account)
 *   5  Success (OnboardingSuccess)
 *
 * Account creation is deferred to the final step so users see value
 * before committing. Email is captured early for abandoned-flow recovery.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { getDb, getFirebaseAuth } from '@/services/firebase';
import { calculateMonthlyFee } from '@/lib/pricing';
import { logger } from '@/lib/utils/logger';
import { isTestEmail, makeTestEmailUnique } from '@/lib/utils/testAccountHelper';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { BUSINESS_TYPES } from '@/types/onboarding';
import type {
  IdentityData,
  BusinessProfileData,
  EquipmentConfig,
  BrandingConfig,
  OnboardingData,
  SubscriptionPlan,
} from '@/types/onboarding';

const TOTAL_STEPS = 5; // 0-4 form steps; 5 = success screen
const DEFAULT_GRADIENT = 'purple-indigo';
const DEFAULT_SEATS = 15;

export interface UseOnboardingResult {
  step: number;
  isComplete: boolean;
  saving: boolean;
  savingMessage: string;
  loading: boolean;
  identityError: string | null;
  accountError: string | null;
  onboardingData: Partial<OnboardingData>;

  handleIdentityNext: (data: Pick<IdentityData, 'firstName' | 'lastName' | 'email'>) => void;
  handleBusinessNext: (data: BusinessProfileData) => void;
  handleEquipmentNext: (data: EquipmentConfig) => void;
  handleCapacityNext: (seats: number) => void;
  handleAccountCreateWithPassword: (password: string) => Promise<void>;
  handleAccountCreateWithGoogle: () => Promise<void>;
  handleAccountCreateWithApple: () => Promise<void>;
  handleBack: () => void;
}

function loadSession(): { step: number; data: Partial<OnboardingData> } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.ONBOARDING_SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(step: number, data: Partial<OnboardingData>) {
  try {
    sessionStorage.setItem(STORAGE_KEYS.ONBOARDING_SESSION, JSON.stringify({ step, data }));
  } catch {
    // quota exceeded
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.ONBOARDING_SESSION);
  } catch {
    // noop
  }
}

export function useOnboarding(): UseOnboardingResult {
  const { user, profile, orgSettings, loading, refreshSettings, signUp, signIn, signInWithGoogle, signInWithApple } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(0);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});
  const [inviteOrganizationId, setInviteOrganizationId] = useState<string | null>(null);

  const resumedRef = useRef(false);
  const inviteCheckedRef = useRef(false);

  /* ---------- Resume from sessionStorage ---------- */
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    const session = loadSession();
    if (session) {
      logger.debug('Resuming onboarding from session', 'Onboarding', session);
      setStep(session.step);
      setOnboardingData(session.data);
    }
  }, []);

  /* ---------- Detect invite token ---------- */
  useEffect(() => {
    if (inviteCheckedRef.current) return;
    const inviteToken = searchParams.get('invite');
    if (!inviteToken) return;
    inviteCheckedRef.current = true;

    const db = getDb();
    getDoc(doc(db, 'invitations', inviteToken)).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status !== 'pending') return;
      if (data.expiresAt?.toDate && data.expiresAt.toDate() < new Date()) return;
      if (data.expiresAt instanceof Date && data.expiresAt < new Date()) return;

      setInviteOrganizationId(data.organizationId);
      logger.info('Invite token accepted', { organizationId: data.organizationId });
    }).catch((err) => {
      logger.warn('Failed to validate invite token:', err instanceof Error ? err.message : String(err));
    });
  }, [searchParams]);

  /* ---------- Persist session ---------- */
  useEffect(() => {
    if (step > 0 && step < TOTAL_STEPS) {
      saveSession(step, onboardingData);
    }
  }, [step, onboardingData]);

  /* ---------- Redirect if already completed ---------- */
  useEffect(() => {
    if (loading || !user || !profile) return;
    const completed = profile.onboardingCompleted || orgSettings?.onboardingCompletedAt;
    if (completed && !hasCheckedStatus) {
      logger.info('Onboarding already completed – redirecting to dashboard.');
      navigate('/dashboard', { replace: true });
    }
    setHasCheckedStatus(true);
  }, [user, profile, orgSettings, loading, navigate, hasCheckedStatus]);

  const getSubscriptionPlan = useCallback((): SubscriptionPlan => {
    const bt = onboardingData.businessProfile?.type;
    return BUSINESS_TYPES.find(b => b.value === bt)?.recommendedPlan || 'starter';
  }, [onboardingData.businessProfile?.type]);

  /* ---------- Step 0: Identity (no auth) ---------- */
  const handleIdentityNext = useCallback((data: Pick<IdentityData, 'firstName' | 'lastName' | 'email'>) => {
    setIdentityError(null);
    setOnboardingData((prev) => ({
      ...prev,
      identity: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: '',
        acceptedTerms: false,
      },
    }));

    // If already logged in (resumed session), skip ahead
    if (user) {
      setStep(1);
      return;
    }

    setStep(1);
  }, [user]);

  /* ---------- Step 1: Business ---------- */
  const handleBusinessNext = useCallback((data: BusinessProfileData) => {
    setOnboardingData((prev) => ({ ...prev, businessProfile: data }));
    setStep(2);
  }, []);

  /* ---------- Step 2: Equipment ---------- */
  const handleEquipmentNext = useCallback((data: EquipmentConfig) => {
    setOnboardingData((prev) => ({ ...prev, equipment: data }));
    setStep(3);
  }, []);

  /* ---------- Step 3: Plan — just stores data, advances to account step ---------- */
  const handleCapacityNext = useCallback((seats: number) => {
    setOnboardingData((prev) => ({
      ...prev,
      branding: { gradientId: DEFAULT_GRADIENT, clientSeats: seats } as BrandingConfig,
    }));

    // If already authenticated (e.g., resumed or social sign-in from login), skip account step
    if (user) {
      completeOnboarding({
        ...onboardingData,
        branding: { gradientId: DEFAULT_GRADIENT, clientSeats: seats } as BrandingConfig,
      });
      return;
    }

    setStep(4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingData, user]);

  /* ---------- Step 4: Account Creation ---------- */

  const createAccountAndComplete = useCallback(async () => {
    const finalData: Partial<OnboardingData> = {
      ...onboardingData,
    };
    await completeOnboarding(finalData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingData]);

  const handleAccountCreateWithPassword = useCallback(async (password: string) => {
    setAccountError(null);
    setSaving(true);
    setSavingMessage('Creating your account...');

    try {
      const identity = onboardingData.identity;
      if (!identity) throw new Error('Identity data missing');

      const originalEmail = identity.email.trim();
      const emailToUse =
        import.meta.env.DEV && isTestEmail(originalEmail)
          ? makeTestEmailUnique(originalEmail)
          : originalEmail;

      const displayName = `${identity.firstName} ${identity.lastName}`.trim();

      try {
        await signUp(emailToUse, password, displayName);
        logger.info('Account created – completing onboarding');

        // Send verification email (non-blocking)
        try {
          const auth = getFirebaseAuth();
          if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
            logger.info('Verification email sent');
          }
        } catch (verifyErr) {
          logger.warn('Verification email failed (non-fatal):', verifyErr);
        }

        await createAccountAndComplete();
      } catch (signUpErr: unknown) {
        const code = signUpErr && typeof signUpErr === 'object' && 'code' in signUpErr
          ? (signUpErr as { code: string }).code : null;

        if (code === 'auth/email-already-in-use') {
          setSavingMessage('Email exists – signing you in...');
          try {
            await signIn(emailToUse, password);
            logger.info('Signed in – completing onboarding');
            await createAccountAndComplete();
          } catch (signInErr: unknown) {
            const siCode = signInErr && typeof signInErr === 'object' && 'code' in signInErr
              ? (signInErr as { code: string }).code : null;

            if (siCode === 'auth/wrong-password' || siCode === 'auth/invalid-credential') {
              setAccountError('This email is already registered. Check your password or go to the login page.');
            } else {
              setAccountError(signInErr instanceof Error ? signInErr.message : 'Sign-in failed.');
            }
          }
        } else {
          throw signUpErr;
        }
      }
    } catch (err) {
      logger.error('Account creation failed:', err);
      setAccountError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
      setSavingMessage('');
    }
  }, [onboardingData, signUp, signIn, createAccountAndComplete]);

  const handleAccountCreateWithGoogle = useCallback(async () => {
    setAccountError(null);
    setSaving(true);
    setSavingMessage('Signing in with Google...');
    try {
      await signInWithGoogle();
      logger.info('Google sign-in successful – completing onboarding');
      await createAccountAndComplete();
    } catch (err) {
      logger.error('Google sign-in failed:', err);
      setAccountError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setSaving(false);
      setSavingMessage('');
    }
  }, [signInWithGoogle, createAccountAndComplete]);

  const handleAccountCreateWithApple = useCallback(async () => {
    setAccountError(null);
    setSaving(true);
    setSavingMessage('Signing in with Apple...');
    try {
      await signInWithApple();
      logger.info('Apple sign-in successful – completing onboarding');
      await createAccountAndComplete();
    } catch (err) {
      logger.error('Apple sign-in failed:', err);
      setAccountError(err instanceof Error ? err.message : 'Apple sign-in failed.');
    } finally {
      setSaving(false);
      setSavingMessage('');
    }
  }, [signInWithApple, createAccountAndComplete]);

  /* ---------- Back ---------- */
  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  /* ---------- Complete Onboarding ---------- */
  const completeOnboarding = useCallback(async (finalData: Partial<OnboardingData>) => {
    if (!user || !profile) return;

    setSaving(true);
    setSavingMessage('Finalising your setup...');

    try {
      const db = getDb();
      const orgId = profile.organizationId;
      const plan = getSubscriptionPlan();
      const seats = finalData.branding?.clientSeats || DEFAULT_SEATS;
      const monthlyFee = calculateMonthlyFee(plan, seats);

      logger.info('Completing onboarding', { orgId, plan, seats });

      const equipmentConfig = finalData.equipment
        ? {
            bodyComposition: { enabled: finalData.equipment.scanner ?? false },
            gripStrength: { enabled: finalData.equipment.dynamometer ?? false },
            cardioEquipment: { enabled: finalData.equipment.treadmill ?? false },
            heartRateSensor: { enabled: false },
          }
        : undefined;

      setSavingMessage('Saving configuration...');
      await setDoc(doc(db, 'organizations', orgId), {
        name: finalData.businessProfile?.name || '',
        type: finalData.businessProfile?.type || 'solo_coach',
        gradientId: finalData.branding?.gradientId || DEFAULT_GRADIENT,
        equipmentConfig,
        subscription: {
          plan,
          status: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          clientSeats: seats,
          amountFils: Math.ceil(monthlyFee * 1000),
          billingEmail: finalData.identity?.email || user.email || '',
        },
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });

      const isActiveCoach = finalData.businessProfile?.type === 'solo_coach'
        ? true
        : (finalData.businessProfile?.isActiveCoach ?? true);

      const profileUpdate: Record<string, unknown> = {
        onboardingCompleted: true,
        isActiveCoach,
        displayName: finalData.identity
          ? `${finalData.identity.firstName} ${finalData.identity.lastName}`
          : profile.displayName,
        email: finalData.identity?.email || user.email || null,
        updatedAt: new Date(),
      };

      if (inviteOrganizationId) {
        profileUpdate.organizationId = inviteOrganizationId;
        profileUpdate.role = 'coach';

        const inviteToken = searchParams.get('invite');
        if (inviteToken) {
          await setDoc(doc(db, 'invitations', inviteToken), { status: 'accepted' }, { merge: true });
        }
      }

      await setDoc(doc(db, 'userProfiles', user.uid), profileUpdate, { merge: true });

      try {
        await setDoc(
          doc(db, 'onboarding_sessions', user.uid),
          { userId: user.uid, organizationId: orgId, data: finalData, completedAt: new Date() },
          { merge: true },
        );
      } catch (auditErr) {
        logger.warn('Audit record write failed (non-critical):', auditErr instanceof Error ? auditErr.message : String(auditErr));
      }

      try { await refreshSettings(); } catch (err) {
        logger.warn('Settings refresh after onboarding failed:', err instanceof Error ? err.message : String(err));
      }

      clearSession();
      setIsComplete(true);
      setStep(TOTAL_STEPS);
    } catch (error) {
      logger.error('Failed to complete onboarding:', error);
      setSavingMessage('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, profile, getSubscriptionPlan, refreshSettings, inviteOrganizationId, searchParams]);

  return {
    step,
    isComplete,
    saving,
    savingMessage,
    loading,
    identityError,
    accountError,
    onboardingData,

    handleIdentityNext,
    handleBusinessNext,
    handleEquipmentNext,
    handleCapacityNext,
    handleAccountCreateWithPassword,
    handleAccountCreateWithGoogle,
    handleAccountCreateWithApple,
    handleBack,
  };
}
