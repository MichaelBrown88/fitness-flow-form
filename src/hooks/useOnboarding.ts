/**
 * useOnboarding Hook
 *
 * Manages the simplified 4-step onboarding flow:
 *   0  Account (IdentityStep)
 *   1  Business (BusinessInfoStep)
 *   2  Equipment (EquipmentStep)
 *   3  Plan (PackageSelectionStep)
 *   4  Success (OnboardingSuccess)
 *
 * Handles account creation, mid-flow persistence (sessionStorage),
 * and final organisation + profile writes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { doc, setDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TOTAL_STEPS = 4; // 0-3 form steps; 4 = success screen
const DEFAULT_GRADIENT = 'purple-indigo';
const DEFAULT_SEATS = 15;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseOnboardingResult {
  // State
  step: number;
  isComplete: boolean;
  saving: boolean;
  savingMessage: string;
  loading: boolean;
  identityError: string | null;
  onboardingData: Partial<OnboardingData>;

  // Handlers (one per step + back)
  handleIdentityNext: (data: IdentityData) => Promise<void>;
  handleBusinessNext: (data: BusinessProfileData) => void;
  handleEquipmentNext: (data: EquipmentConfig) => void;
  handleCapacityNext: (seats: number) => Promise<void>;
  handleBack: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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
    sessionStorage.setItem(
      STORAGE_KEYS.ONBOARDING_SESSION,
      JSON.stringify({ step, data }),
    );
  } catch {
    // Silently fail – quota exceeded etc.
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.ONBOARDING_SESSION);
  } catch {
    // noop
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useOnboarding(): UseOnboardingResult {
  const { user, profile, orgSettings, loading, refreshSettings, signUp, signIn } = useAuth();
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState(0);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Loading / saving
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [identityError, setIdentityError] = useState<string | null>(null);

  // Onboarding data
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});

  // Avoid double-firing effects
  const resumedRef = useRef(false);

  /* ---------- Resume from sessionStorage on mount ---------- */
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

  /* ---------- Persist to sessionStorage on every step/data change ---------- */
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

  /* ---------- Helpers ---------- */

  const getSubscriptionPlan = useCallback((): SubscriptionPlan => {
    const bt = onboardingData.businessProfile?.type;
    return BUSINESS_TYPES.find(b => b.value === bt)?.recommendedPlan || 'starter';
  }, [onboardingData.businessProfile?.type]);

  /* ---------- Step handlers ---------- */

  /** Step 0  Account */
  const handleIdentityNext = useCallback(async (data: IdentityData) => {
    setIdentityError(null);
    setOnboardingData((prev) => ({ ...prev, identity: data }));

    // If already logged in, just advance
    if (user) {
      setStep(1);
      return;
    }

    // Create account
    try {
      setSaving(true);
      setSavingMessage('Creating your account...');

      const originalEmail = data.email.trim();
      const emailToUse =
        import.meta.env.DEV && isTestEmail(originalEmail)
          ? makeTestEmailUnique(originalEmail)
          : originalEmail;

      if (emailToUse !== originalEmail) {
        logger.debug(`Using unique test email: ${emailToUse}`);
        setOnboardingData((prev) => ({
          ...prev,
          identity: { ...data, email: emailToUse },
        }));
      }

      try {
        await signUp(emailToUse, data.password, `${data.firstName} ${data.lastName}`.trim());
        logger.info('Account created – continuing onboarding');
        setStep(1);
      } catch (signUpErr: unknown) {
        const code =
          signUpErr && typeof signUpErr === 'object' && 'code' in signUpErr
            ? (signUpErr as { code: string }).code
            : null;

        if (code === 'auth/email-already-in-use') {
          setSavingMessage('Email exists – signing you in...');
          try {
            await signIn(emailToUse, data.password);
            logger.info('Signed in – continuing onboarding');
            setStep(1);
          } catch (signInErr: unknown) {
            const siCode =
              signInErr && typeof signInErr === 'object' && 'code' in signInErr
                ? (signInErr as { code: string }).code
                : null;

            if (siCode === 'auth/wrong-password' || siCode === 'auth/invalid-credential') {
              setIdentityError('This email is already registered. Check your password or go to the login page.');
            } else if (siCode === 'auth/user-not-found') {
              setIdentityError('Email not found. Please double-check.');
            } else {
              setIdentityError(
                signInErr instanceof Error ? signInErr.message : 'Sign-in failed. Please try again.',
              );
            }
          }
        } else {
          throw signUpErr;
        }
      }
    } catch (err) {
      logger.error('Account creation failed:', err);
      setIdentityError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
      setSavingMessage('');
    }
  }, [user, signUp, signIn]);

  /** Step 1  Business */
  const handleBusinessNext = useCallback((data: BusinessProfileData) => {
    setOnboardingData((prev) => ({ ...prev, businessProfile: data }));
    setStep(2);
  }, []);

  /** Step 2  Equipment */
  const handleEquipmentNext = useCallback((data: EquipmentConfig) => {
    setOnboardingData((prev) => ({ ...prev, equipment: data }));
    setStep(3);
  }, []);

  /** Step 3  Plan / Capacity  triggers completeOnboarding */
  const handleCapacityNext = useCallback(async (seats: number) => {
    const finalData: Partial<OnboardingData> = {
      ...onboardingData,
      branding: {
        gradientId: DEFAULT_GRADIENT,
        clientSeats: seats,
      } as BrandingConfig,
    };
    await completeOnboarding(finalData);
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [onboardingData]);

  /** Back button */
  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  /* ---------- Final save ---------- */

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

      // Map equipment config
      const equipmentConfig = finalData.equipment
        ? {
            bodyComposition: { enabled: finalData.equipment.scanner ?? false },
            gripStrength: { enabled: finalData.equipment.dynamometer ?? false },
            cardioEquipment: { enabled: finalData.equipment.treadmill ?? false },
            heartRateSensor: { enabled: false },
          }
        : undefined;

      // Update organisation (merge: true so it works whether doc exists or not)
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

      // Derive isActiveCoach: solo coaches are always active; gym/gym_chain uses explicit choice
      const isActiveCoach = finalData.businessProfile?.type === 'solo_coach'
        ? true
        : (finalData.businessProfile?.isActiveCoach ?? true);

      // Update user profile (merge: true for same reason)
      await setDoc(doc(db, 'userProfiles', user.uid), {
        onboardingCompleted: true,
        isActiveCoach,
        displayName: finalData.identity
          ? `${finalData.identity.firstName} ${finalData.identity.lastName}`
          : profile.displayName,
        email: finalData.identity?.email || user.email || null,
        updatedAt: new Date(),
      }, { merge: true });

      // Save audit record (non-critical — don't let it fail the whole flow)
      try {
        await setDoc(
          doc(db, 'onboarding_sessions', user.uid),
          {
            userId: user.uid,
            organizationId: orgId,
            data: finalData,
            completedAt: new Date(),
          },
          { merge: true },
        );
      } catch (auditErr) {
        logger.warn('Audit record write failed (non-critical):', auditErr instanceof Error ? auditErr.message : String(auditErr));
      }

      // Refresh auth context settings
      try {
        await refreshSettings();
      } catch (err) {
        logger.warn('Settings refresh after onboarding failed:', err instanceof Error ? err.message : String(err));
      }

      // Clean up session persistence
      clearSession();

      setIsComplete(true);
      setStep(TOTAL_STEPS); // step 4 = success screen
    } catch (error) {
      logger.error('Failed to complete onboarding:', error);
      setSavingMessage('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, profile, getSubscriptionPlan, refreshSettings]);

  /* ---------- Return ---------- */

  return {
    step,
    isComplete,
    saving,
    savingMessage,
    loading,
    identityError,
    onboardingData,

    handleIdentityNext,
    handleBusinessNext,
    handleEquipmentNext,
    handleCapacityNext,
    handleBack,
  };
}
