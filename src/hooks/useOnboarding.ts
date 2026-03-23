/**
 * useOnboarding Hook
 *
 * Flow (indices):
 *   0  Identity (name + email — no auth)
 *   1  Business (BusinessInfoStep)
 *   2  Account (password / social — verify email sent here)
 *   3  Equipment (EquipmentStep)
 *   4  Team (TeamRosterStep) for gym / gym_chain; PackageSelectionStep for solo_coach
 *   5  PackageSelectionStep (gym only)
 *   6  Success (OnboardingSuccess)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { doc, setDoc, getDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { sendEmailVerification, EmailAuthProvider, linkWithCredential, GoogleAuthProvider, OAuthProvider, updateProfile } from 'firebase/auth';
import { getDb, getFirebaseAuth } from '@/services/firebase';
import { logOnboardingStep } from '@/services/platform/platformMetrics';
import { getMonthlyPrice, getPriceInSmallestUnit } from '@/lib/pricing/config';
import {
  REGION_TO_CURRENCY,
  DEFAULT_REGION,
  FREE_TIER_MONTHLY_AI_CREDITS,
  FREE_TIER_CLIENT_LIMIT,
  GYM_TRIAL_CLIENT_CAP,
  getPaidTierForPackageTrack,
} from '@/constants/pricing';
import { logger } from '@/lib/utils/logger';
import { isTestEmail, makeTestEmailUnique } from '@/lib/utils/testAccountHelper';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import type {
  IdentityData,
  BusinessProfileData,
  EquipmentConfig,
  BrandingConfig,
  OnboardingData,
} from '@/types/onboarding';

/** Form steps use 0–5; step 6 is success. */
const TOTAL_STEPS = 6;
const DEFAULT_GRADIENT = 'volt';
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
  handleEquipmentSkip: () => void;
  handleTeamNext: (coachRosterNotes: string) => void;
  handlePlanNext: (payload: Pick<BrandingConfig, 'clientSeats' | 'packageTrack' | 'gradientId'>) => void;
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

  const [step, setStep] = useState(() => loadSession()?.step ?? 0);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>(() => loadSession()?.data ?? {});
  const [inviteOrganizationId, setInviteOrganizationId] = useState<string | null>(null);

  const resumedRef = useRef(false);
  const inviteCheckedRef = useRef(false);
  const completingRef = useRef(false);

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

    let cancelled = false;
    const db = getDb();
    getDoc(doc(db, 'invitations', inviteToken)).then((snap) => {
      if (cancelled || !snap.exists()) return;
      const data = snap.data();
      if (data.status !== 'pending') return;
      if (data.expiresAt?.toDate && data.expiresAt.toDate() < new Date()) return;
      if (data.expiresAt instanceof Date && data.expiresAt < new Date()) return;

      setInviteOrganizationId(data.organizationId);
      logger.info('Invite token accepted', { organizationId: data.organizationId });
    }).catch((err) => {
      if (!cancelled) {
        logger.warn('Failed to validate invite token:', err instanceof Error ? err.message : String(err));
      }
    });
    return () => {
      cancelled = true;
    };
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
    logOnboardingStep(1);
  }, [user]);

  /* ---------- Step 1: Business ---------- */
  const handleBusinessNext = useCallback((data: BusinessProfileData) => {
    setOnboardingData((prev) => ({ ...prev, businessProfile: data }));
    setStep(2); // → Account Creation
    logOnboardingStep(2);
  }, []);

  /* ---------- Step 3: Equipment ---------- */
  const handleEquipmentNext = useCallback((data: EquipmentConfig) => {
    setOnboardingData((prev) => ({ ...prev, equipment: data }));
    setStep(4);
    logOnboardingStep(4);
  }, []);

  /* ---------- Step 3: Equipment skip ---------- */
  const handleEquipmentSkip = useCallback(() => {
    setOnboardingData((prev) => ({
      ...prev,
      equipment: {
        scanner: false,
        treadmill: false,
        dynamometer: false,
        bodyCompositionMethod: 'measurements',
        gripStrengthEnabled: false,
        gripStrengthMethod: 'none',
        configPending: true,
      } as EquipmentConfig & { configPending: boolean },
    }));
    setStep(4);
    logOnboardingStep(4);
  }, []);

  /* ---------- Step 4 (gym): Team roster → Plan ---------- */
  const handleTeamNext = useCallback((coachRosterNotes: string) => {
    setOnboardingData((prev) => ({ ...prev, teamRoster: coachRosterNotes }));
    setStep(5);
    logOnboardingStep(5);
  }, []);

  /* ---------- Step 2: Account Creation — advances to Equipment (step 3) ---------- */

  const advanceAfterAccountCreation = useCallback(() => {
    setStep(3); // → Equipment step
    logOnboardingStep(3);
  }, []);

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
      const auth = getFirebaseAuth();

      try {
        if (auth.currentUser?.isAnonymous) {
          // Sandbox trial user — link the anonymous account to a real credential
          setSavingMessage('Upgrading your trial account...');
          const credential = EmailAuthProvider.credential(emailToUse, password);
          const linkedUser = auth.currentUser;
          await linkWithCredential(linkedUser, credential);
          await updateProfile(linkedUser, { displayName });
          logger.info('Anonymous account linked with email credential');
        } else {
          await signUp(emailToUse, password, displayName);
          logger.info('Account created – advancing to equipment step');
        }

        // Send verification email (non-blocking)
        try {
          if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
            logger.info('Verification email sent');
          }
        } catch (verifyErr) {
          logger.warn('Verification email failed (non-fatal):', verifyErr);
        }

        advanceAfterAccountCreation();
      } catch (signUpErr: unknown) {
        const code = signUpErr && typeof signUpErr === 'object' && 'code' in signUpErr
          ? (signUpErr as { code: string }).code : null;

        if (code === 'auth/email-already-in-use') {
          setSavingMessage('Email exists – signing you in...');
          try {
            await signIn(emailToUse, password);
            logger.info('Signed in – advancing to equipment step');
            advanceAfterAccountCreation();
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
  }, [onboardingData, signUp, signIn, advanceAfterAccountCreation]);

  const handleAccountCreateWithGoogle = useCallback(async () => {
    setAccountError(null);
    setSaving(true);
    setSavingMessage('Signing in with Google...');
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser?.isAnonymous) {
        const { linkWithPopup } = await import('firebase/auth');
        await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
        logger.info('Anonymous account linked with Google');
      } else {
        await signInWithGoogle();
        logger.info('Google sign-in successful – advancing to equipment step');
      }
      advanceAfterAccountCreation();
    } catch (err) {
      logger.error('Google sign-in failed:', err);
      setAccountError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setSaving(false);
      setSavingMessage('');
    }
  }, [signInWithGoogle, advanceAfterAccountCreation]);

  const handleAccountCreateWithApple = useCallback(async () => {
    setAccountError(null);
    setSaving(true);
    setSavingMessage('Signing in with Apple...');
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser?.isAnonymous) {
        const { linkWithPopup } = await import('firebase/auth');
        await linkWithPopup(auth.currentUser, new OAuthProvider('apple.com'));
        logger.info('Anonymous account linked with Apple');
      } else {
        await signInWithApple();
        logger.info('Apple sign-in successful – advancing to equipment step');
      }
      advanceAfterAccountCreation();
    } catch (err) {
      logger.error('Apple sign-in failed:', err);
      setAccountError(err instanceof Error ? err.message : 'Apple sign-in failed.');
    } finally {
      setSaving(false);
      setSavingMessage('');
    }
  }, [signInWithApple, advanceAfterAccountCreation]);

  /* ---------- Back ---------- */
  const handleBack = useCallback(() => {
    setStep((s) => {
      if (s <= 0) return 0;
      if (s === 5) return 4;
      return s - 1;
    });
  }, []);

  /* ---------- Complete Onboarding ---------- */
  const completeOnboarding = useCallback(async (finalData: Partial<OnboardingData>) => {
    if (!user || !profile) return;
    if (completingRef.current) return;
    completingRef.current = true;

    setSaving(true);
    setSavingMessage('Finalising your setup...');

    try {
      const db = getDb();
      const orgId = profile.organizationId;
      const region = finalData.businessProfile?.region ?? DEFAULT_REGION;
      const currency = REGION_TO_CURRENCY[region];
      const bizType = finalData.businessProfile?.type || 'solo_coach';
      const isSolo = bizType === 'solo_coach';
      const interestSeats = finalData.branding?.clientSeats || DEFAULT_SEATS;
      const monthlyAmount = getMonthlyPrice(region, interestSeats);
      const amountCents = getPriceInSmallestUnit(monthlyAmount, currency);
      const gymTrialTier = getPaidTierForPackageTrack(GYM_TRIAL_CLIENT_CAP, 'gym');

      logger.info('Completing onboarding', { orgId, region, bizType, interestSeats });

      const equipmentConfig = finalData.equipment
        ? {
            bodyComposition: { enabled: finalData.equipment.scanner ?? false },
            gripStrength: { enabled: finalData.equipment.dynamometer ?? false },
            cardioEquipment: { enabled: finalData.equipment.treadmill ?? false },
            heartRateSensor: { enabled: false },
          }
        : undefined;

      const billingEmail = finalData.identity?.email || user.email || '';

      const subscriptionSolo = {
        plan: 'starter' as const,
        planKind: 'solo_free' as const,
        status: 'active' as const,
        clientCap: FREE_TIER_CLIENT_LIMIT,
        clientSeats: FREE_TIER_CLIENT_LIMIT,
        trialClientCap: deleteField(),
        trialEndsAt: deleteField(),
        monthlyAiCredits: FREE_TIER_MONTHLY_AI_CREDITS,
        region,
        currency,
        packageTrack: finalData.branding?.packageTrack ?? 'solo',
        clientCount: interestSeats,
        amountCents: region === 'GB' ? 0 : amountCents,
        amountFils: currency === 'KWD' ? amountCents : undefined,
        billingEmail,
      };

      const subscriptionGym = {
        plan: 'starter' as const,
        planKind: 'gym_trial' as const,
        status: 'trial' as const,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        clientCap: GYM_TRIAL_CLIENT_CAP,
        trialClientCap: GYM_TRIAL_CLIENT_CAP,
        clientSeats: GYM_TRIAL_CLIENT_CAP,
        monthlyAiCredits: gymTrialTier.monthlyAiCredits,
        region,
        currency,
        packageTrack: 'gym' as const,
        clientCount: interestSeats,
        amountCents,
        amountFils: currency === 'KWD' ? amountCents : undefined,
        billingEmail,
      };

      setSavingMessage('Saving configuration...');
      // Invited coaches join an existing org — do not merge subscription/DPA onto the
      // personal shell org or the target org from the client (org writes require isOrgAdmin).
      if (!inviteOrganizationId) {
        await setDoc(doc(db, 'organizations', orgId), {
          name: finalData.businessProfile?.name || '',
          type: bizType,
          region,
          gradientId: finalData.branding?.gradientId || DEFAULT_GRADIENT,
          equipmentConfig,
          customBrandingEnabled: false,
          coachRosterNotes: finalData.teamRoster?.trim() || deleteField(),
          subscription: isSolo ? subscriptionSolo : subscriptionGym,
          onboardingCompletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          dpa: {
            accepted: true,
            version: 1,
            acceptedByUid: user.uid,
            acceptedAt: serverTimestamp(),
            note: 'Implicit acceptance of Data Processing Agreement at onboarding completion.',
          },
        }, { merge: true });
      }

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
        updatedAt: serverTimestamp(),
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
          {
            userId: user.uid,
            organizationId: inviteOrganizationId ?? orgId,
            data: finalData,
            completedAt: serverTimestamp(),
          },
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
      completingRef.current = false;
      setSaving(false);
    }
  }, [user, profile, refreshSettings, inviteOrganizationId, searchParams]);

  const handlePlanNext = useCallback(
    (branding: Pick<BrandingConfig, 'clientSeats' | 'packageTrack' | 'gradientId'>) => {
      setOnboardingData((prev) => {
        const finalBranding: BrandingConfig = {
          gradientId: branding.gradientId ?? prev.branding?.gradientId ?? DEFAULT_GRADIENT,
          clientSeats: branding.clientSeats,
          packageTrack: branding.packageTrack,
        };
        const finalData: Partial<OnboardingData> = { ...prev, branding: finalBranding };
        void completeOnboarding(finalData);
        return finalData;
      });
    },
    [completeOnboarding],
  );

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
    handleEquipmentSkip,
    handleTeamNext,
    handlePlanNext,
    handleAccountCreateWithPassword,
    handleAccountCreateWithGoogle,
    handleAccountCreateWithApple,
    handleBack,
  };
}
