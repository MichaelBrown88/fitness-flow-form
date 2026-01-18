/**
 * useOnboarding Hook
 * 
 * Extracted from Onboarding.tsx to separate logic from UI.
 * Handles multi-step onboarding flow, account creation, and organization setup.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { uploadOrgLogo } from '@/services/organizations';
import { calculateMonthlyFee } from '@/lib/pricing';
import { addCoachToOrganization, createCoachInvitationLink } from '@/services/coachManagement';
import { logger } from '@/lib/utils/logger';
import { isTestEmail, makeTestEmailUnique } from '@/lib/utils/testAccountHelper';
import { BUSINESS_TYPES } from '@/types/onboarding';
import type {
  IdentityData,
  BusinessProfileData,
  MarketingData,
  BrandingConfig,
  EquipmentConfig,
  TeamSetupData,
  OnboardingData,
  SubscriptionPlan,
} from '@/types/onboarding';

export interface UseOnboardingResult {
  // State
  step: number;
  isComplete: boolean;
  saving: boolean;
  savingMessage: string;
  loading: boolean;
  onboardingData: Partial<OnboardingData>;
  
  // Handlers
  handleWelcomeNext: () => void;
  handleIdentityNext: (data: IdentityData) => Promise<void>;
  handleBusinessNext: (data: Partial<BusinessProfileData>) => void;
  handleLocationNext: (data: Partial<BusinessProfileData>) => void;
  handleMarketingNext: (data: MarketingData) => void;
  handleBrandingNext: (data: Partial<BrandingConfig>) => void;
  handleEquipmentNext: (data: EquipmentConfig) => void;
  handleTeamSetupNext: (data: TeamSetupData) => void;
  handleCapacityNext: (seats: number) => Promise<void>;
  handleBack: () => void;
  handleBypassOnboarding: () => Promise<void>;
  
  // Computed
  getCurrentStep: () => number;
  getSubscriptionPlan: () => SubscriptionPlan;
}

export function useOnboarding(): UseOnboardingResult {
  const { user, profile, orgSettings, loading, refreshSettings, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  
  // Step state
  const [step, setStep] = useState(0);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Loading/saving state
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('Setting up your account...');

  // Onboarding data state
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({
    identity: undefined,
    businessProfile: undefined,
    marketing: undefined,
    branding: undefined,
    equipment: undefined,
    teamSetup: undefined,
  });

  // Debug logging
  useEffect(() => {
    logger.debug('NEW ONBOARDING FLOW v2.0 LOADED', 'Onboarding', { currentStep: step, totalSteps: 8 });
  }, [step]);

  // Check onboarding status and resume if needed
  useEffect(() => {
    if (loading || !user || !profile) return;
    
    const completed = profile.onboardingCompleted || orgSettings?.onboardingCompletedAt;
    
    if (completed && !hasCheckedStatus) {
      logger.info('User has already completed onboarding. Redirecting to dashboard...');
      navigate('/dashboard', { replace: true });
    }
    
    setHasCheckedStatus(true);
  }, [user, profile, orgSettings, loading, navigate, hasCheckedStatus]);

  // Bypass onboarding for legacy users
  const handleBypassOnboarding = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSavingMessage('Bypassing onboarding...');
    try {
      logger.info('Legacy user bypass requested');
      await updateDoc(doc(getDb(), 'userProfiles', user.uid), {
        onboardingCompleted: true,
        updatedAt: new Date(),
      });
      if (profile?.organizationId) {
        await updateDoc(doc(getDb(), 'organizations', profile.organizationId), {
          onboardingCompletedAt: new Date()
        });
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      logger.error('Bypass failed:', err);
    } finally {
      setSaving(false);
    }
  }, [user, profile, navigate]);

  // Step handlers
  const handleWelcomeNext = useCallback(() => {
    setStep(1);
  }, []);

  const handleIdentityNext = useCallback(async (data: IdentityData) => {
    setOnboardingData((prev) => ({ ...prev, identity: data }));

    if (!user) {
      try {
        setSaving(true);
        setSavingMessage('Creating your account...');
        
        const originalEmail = data.email.trim();
        const emailToUse = import.meta.env.DEV && isTestEmail(originalEmail)
          ? makeTestEmailUnique(originalEmail)
          : originalEmail;
        
        if (emailToUse !== originalEmail) {
          logger.debug(`Using unique test email: ${emailToUse} (original: ${originalEmail})`);
          setOnboardingData((prev) => ({
            ...prev,
            identity: { ...data, email: emailToUse }
          }));
        }
        
        try {
          await signUp(
            emailToUse,
            data.password,
            `${data.firstName} ${data.lastName}`.trim()
          );
          
          logger.info('Account created successfully, continuing onboarding');
          setSaving(false);
          setSavingMessage('');
          setStep(2);
        } catch (signUpError: unknown) {
          const errorCode = signUpError && typeof signUpError === 'object' && 'code' in signUpError 
            ? (signUpError as { code: string }).code 
            : null;
          
          if (errorCode === 'auth/email-already-in-use') {
            logger.info('Email already exists, attempting to sign in...');
            setSavingMessage('Email already exists. Signing you in...');
            
            try {
              await signIn(emailToUse, data.password);
              logger.info('Signed in successfully, continuing onboarding');
              setSaving(false);
              setSavingMessage('');
              setStep(2);
            } catch (signInError: unknown) {
              const signInMessage = signInError instanceof Error 
                ? signInError.message 
                : 'Unable to sign in. This email is already registered. Please use the correct password or try a different email.';
              
              const signInErrorCode = signInError && typeof signInError === 'object' && 'code' in signInError 
                ? (signInError as { code: string }).code 
                : null;
              
              if (signInErrorCode === 'auth/wrong-password' || signInErrorCode === 'auth/invalid-credential') {
                setSavingMessage('This email is already registered. Please check your password or go to the login page.');
              } else if (signInErrorCode === 'auth/user-not-found') {
                setSavingMessage('This email is not registered. Please check your email address.');
              } else {
                setSavingMessage(signInMessage);
              }
              
              logger.error('Sign in failed:', signInError instanceof Error ? signInError.message : String(signInError));
              setSaving(false);
            }
          } else {
            throw signUpError;
          }
        }
      } catch (error) {
        logger.error('Failed to create account:', error);
        setSaving(false);
        setSavingMessage(error instanceof Error ? error.message : String(error));
      }
    } else {
      setStep(2);
    }
  }, [user, signUp, signIn]);

  const handleBusinessNext = useCallback((data: Partial<BusinessProfileData>) => {
    setOnboardingData((prev) => ({
      ...prev,
      businessProfile: { ...prev.businessProfile, ...data } as BusinessProfileData,
    }));
    setStep(3);
  }, []);

  const handleLocationNext = useCallback((data: Partial<BusinessProfileData>) => {
    setOnboardingData((prev) => ({
      ...prev,
      businessProfile: { ...prev.businessProfile, ...data } as BusinessProfileData,
    }));
    setStep(4);
  }, []);

  const handleMarketingNext = useCallback((data: MarketingData) => {
    setOnboardingData((prev) => ({ ...prev, marketing: data }));
    setStep(5);
  }, []);

  const handleBrandingNext = useCallback((data: Partial<BrandingConfig>) => {
    setOnboardingData((prev) => ({
      ...prev,
      branding: { ...prev.branding, ...data } as BrandingConfig,
    }));
    setStep(6);
  }, []);

  const handleEquipmentNext = useCallback((data: EquipmentConfig) => {
    setOnboardingData((prev) => ({ ...prev, equipment: data }));
    setStep(7);
  }, []);

  const handleTeamSetupNext = useCallback((data: TeamSetupData) => {
    setOnboardingData((prev) => ({ ...prev, teamSetup: data }));
    setStep(8);
  }, []);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep(step - 1);
    }
  }, [step]);

  // Get subscription plan based on business type
  const getSubscriptionPlan = useCallback((): SubscriptionPlan => {
    const businessType = onboardingData.businessProfile?.type;
    const config = BUSINESS_TYPES.find(b => b.value === businessType);
    return config?.recommendedPlan || 'starter';
  }, [onboardingData.businessProfile?.type]);

  // Complete onboarding and save all data
  const completeOnboarding = useCallback(async (finalData: Partial<OnboardingData>) => {
    if (!user || !profile) return;

    setSaving(true);
    setSavingMessage('Finalizing your setup...');

    try {
      const db = getDb();
      const orgId = profile.organizationId;
      const plan = getSubscriptionPlan();
      const seats = finalData.branding?.clientSeats || 15;
      const monthlyFee = calculateMonthlyFee(plan, seats);
      
      logger.info('Finalizing onboarding for org:', orgId, { plan, seats, monthlyFee });

      // Upload logo if provided
      let logoUrl: string | undefined;
      if (finalData.branding?.logoFile) {
        setSavingMessage('Uploading your logo...');
        try {
          logoUrl = await uploadOrgLogo(orgId, finalData.branding.logoFile);
          logger.debug('Logo uploaded successfully');
        } catch (logoError) {
          logger.error('Logo upload failed, continuing without logo:', logoError);
        }
      }

      // Map equipment config
      const equipmentConfig = finalData.equipment ? {
        bodyComposition: { enabled: finalData.equipment.scanner ?? false },
        gripStrength: { enabled: finalData.equipment.dynamometer ?? false },
        cardioEquipment: { enabled: finalData.equipment.treadmill ?? false },
        heartRateSensor: { enabled: false },
      } : undefined;

      // Update organization
      setSavingMessage('Saving your configuration...');
      await updateDoc(doc(db, 'organizations', orgId), {
        name: finalData.businessProfile?.name || '',
        type: finalData.businessProfile?.type || 'solo_coach',
        address: finalData.businessProfile?.address || '',
        city: finalData.businessProfile?.city || null,
        state: finalData.businessProfile?.state || null,
        zip: finalData.businessProfile?.zip || null,
        phone: finalData.identity?.phone || '',
        website: finalData.businessProfile?.website || null,
        instagram: finalData.businessProfile?.instagram || null,
        logoUrl: logoUrl || null,
        gradientId: finalData.branding?.gradientId || 'purple-indigo',
        equipmentConfig,
        subscription: {
          plan,
          status: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          clientSeats: seats,
          amountFils: Math.ceil(monthlyFee * 1000),
          billingEmail: finalData.identity?.email || user.email || '',
        },
        marketing: finalData.marketing ? {
          referralSource: finalData.marketing.referralSource || null,
          primaryGoal: finalData.marketing.primaryGoal || null,
        } : null,
        businessAge: finalData.businessProfile?.businessAge || null,
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      });

      // Update user profile
      await updateDoc(doc(db, 'userProfiles', user.uid), {
        onboardingCompleted: true,
        displayName: finalData.identity
          ? `${finalData.identity.firstName} ${finalData.identity.lastName}`
          : finalData.businessProfile?.name || profile.displayName,
        email: finalData.identity?.email || user.email || null,
        updatedAt: new Date(),
      });

      // Add coaches from team setup
      if (finalData.teamSetup && !finalData.teamSetup.skipped && finalData.teamSetup.coachEmails.length > 0) {
        setSavingMessage('Adding coaches to your organization...');
        const coachResults = await Promise.allSettled(
          finalData.teamSetup.coachEmails.map(async (email) => {
            try {
              const result = await addCoachToOrganization(orgId, email);
              if (result.success) {
                return { email, success: true, coachUid: result.coachUid };
              } else {
                const inviteLink = await createCoachInvitationLink(orgId, email);
                return { email, success: false, inviteLink, error: result.error };
              }
            } catch (error) {
              logger.error(`Error processing coach ${email}:`, error);
              try {
                const inviteLink = await createCoachInvitationLink(orgId, email);
                return { email, success: false, inviteLink, error: error instanceof Error ? error.message : 'Unknown error' };
              } catch (inviteError) {
                logger.error(`Error creating invitation for ${email}:`, inviteError);
                return { email, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
              }
            }
          })
        );

        const successful = coachResults.filter(r => r.status === 'fulfilled' && 'value' in r && r.value.success).length;
        const withInvites = coachResults.filter(r => r.status === 'fulfilled' && 'value' in r && !r.value.success && r.value.inviteLink).length;
        logger.info(`Onboarding: Added ${successful} existing coaches, created ${withInvites} invitation links`);
        
        const inviteLinks: Array<{ email: string; link: string }> = [];
        coachResults.forEach(r => {
          if (r.status === 'fulfilled' && 'value' in r && !r.value.success && r.value.inviteLink) {
            inviteLinks.push({ email: r.value.email, link: r.value.inviteLink });
          }
        });
        
        if (inviteLinks.length > 0) {
          await updateDoc(doc(db, 'organizations', orgId), {
            pendingCoachInvitations: inviteLinks,
            updatedAt: new Date(),
          });
        }
      }

      // Save onboarding session for audit/recovery
      await setDoc(doc(db, 'onboarding_sessions', user.uid), {
        userId: user.uid,
        organizationId: orgId,
        data: finalData,
        completedAt: new Date(),
      }, { merge: true });

      // Refresh settings
      try {
        await refreshSettings();
        logger.info('Onboarding completed successfully - settings refreshed');
      } catch (err) {
        logger.warn('Onboarding completed but settings refresh failed:', err instanceof Error ? err.message : String(err));
      }

      setIsComplete(true);
      setStep(9);
    } catch (error) {
      logger.error('Failed to complete onboarding:', error);
      setSavingMessage('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, profile, getSubscriptionPlan, refreshSettings]);

  const handleCapacityNext = useCallback(async (seats: number) => {
    const finalData = {
      ...onboardingData,
      branding: {
        ...onboardingData.branding,
        clientSeats: seats,
      } as BrandingConfig,
    };
    await completeOnboarding(finalData);
  }, [onboardingData, completeOnboarding]);

  // Computed: Get current step for progress indicator
  const getCurrentStep = useCallback(() => {
    if (step === 0) return -1; // Welcome - no progress dots
    if (step >= 9) return -1; // Success - no progress dots
    return step - 1; // Steps 1-8 map to progress dots 0-7
  }, [step]);

  return {
    // State
    step,
    isComplete,
    saving,
    savingMessage,
    loading,
    onboardingData,
    
    // Handlers
    handleWelcomeNext,
    handleIdentityNext,
    handleBusinessNext,
    handleLocationNext,
    handleMarketingNext,
    handleBrandingNext,
    handleEquipmentNext,
    handleTeamSetupNext,
    handleCapacityNext,
    handleBack,
    handleBypassOnboarding,
    
    // Computed
    getCurrentStep,
    getSubscriptionPlan,
  };
}
