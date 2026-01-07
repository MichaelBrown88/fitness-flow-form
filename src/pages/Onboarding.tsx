import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  OnboardingLayout,
  BusinessInfoStep,
  BrandingStep,
  EquipmentStep,
  TeamSetupStep,
  OnboardingSuccess,
} from '@/components/onboarding';
import type {
  BusinessProfileData,
  BrandingConfig,
  EquipmentConfig,
  TeamSetupData,
  OnboardingData,
} from '@/types/onboarding';
import { BUSINESS_TYPES } from '@/types/onboarding';
import { logger } from '@/lib/utils/logger';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { uploadOrgLogo } from '@/services/organizations';

export default function Onboarding() {
  const { user, profile, loading, refreshSettings } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('Setting up your account...');

  // Onboarding data state
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({
    businessProfile: undefined,
    branding: undefined,
    equipment: undefined,
    teamSetup: undefined,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/signup', { replace: true });
    }
  }, [user, loading, navigate]);

  // Redirect if onboarding is already complete
  useEffect(() => {
    if (!loading && profile?.onboardingCompleted) {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, loading, navigate]);

  // Get subscription plan based on business type
  const getSubscriptionPlan = () => {
    const businessType = onboardingData.businessProfile?.type;
    const config = BUSINESS_TYPES.find(b => b.value === businessType);
    return config?.recommendedPlan || 'starter';
  };

  // Step handlers
  const handleBusinessInfoNext = (data: BusinessProfileData) => {
    setOnboardingData((prev) => ({ ...prev, businessProfile: data }));
    setCurrentStep(1);
    logger.debug('Business info step completed');
  };

  const handleBrandingNext = (data: BrandingConfig) => {
    setOnboardingData((prev) => ({ ...prev, branding: data }));
    setCurrentStep(2);
    logger.debug('Branding step completed');
  };

  const handleEquipmentNext = (data: EquipmentConfig) => {
    setOnboardingData((prev) => ({ ...prev, equipment: data }));
    setCurrentStep(3);
    logger.debug('Equipment step completed');
  };

  const handleTeamSetupNext = async (data: TeamSetupData) => {
    setOnboardingData((prev) => ({ ...prev, teamSetup: data }));
    
    // Save all onboarding data to Firestore
    await saveOnboardingData({ ...onboardingData, teamSetup: data });
  };

  const saveOnboardingData = async (finalData: Partial<OnboardingData>) => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const db = getDb();
      const orgId = profile.organizationId;

      // Step 1: Upload logo if provided
      let logoUrl: string | undefined;
      if (finalData.businessProfile?.logoFile) {
        setSavingMessage('Uploading your logo...');
        try {
          logoUrl = await uploadOrgLogo(orgId, finalData.businessProfile.logoFile);
          logger.debug('Logo uploaded successfully');
        } catch (logoError) {
          logger.error('Logo upload failed, continuing without logo:', logoError);
        }
      }

      // Step 2: Prepare equipment config in the format OrgSettings expects
      setSavingMessage('Configuring your assessments...');
      const equipmentConfig = finalData.equipment ? {
        bodyComposition: {
          method: finalData.equipment.bodyCompositionMethod === 'none' 
            ? 'measurements' 
            : finalData.equipment.bodyCompositionMethod,
          skinfoldMethod: finalData.equipment.skinfoldMethod,
        },
        gripStrength: {
          method: finalData.equipment.gripStrengthEnabled ? 'dynamometer' : 'none',
          enabled: finalData.equipment.gripStrengthEnabled,
        },
      } : undefined;

      // Step 3: Update organization document
      setSavingMessage('Saving your settings...');
      await updateDoc(doc(db, 'organizations', orgId), {
        // Business info
        name: finalData.businessProfile?.name,
        type: finalData.businessProfile?.type,
        address: finalData.businessProfile?.address,
        phone: finalData.businessProfile?.phone,
        website: finalData.businessProfile?.website || null,
        
        // Logo
        logoUrl: logoUrl || null,
        
        // Branding
        gradientId: finalData.branding?.gradientId || 'purple-indigo',
        
        // Equipment
        equipmentConfig,
        
        // Subscription
        subscription: {
          plan: getSubscriptionPlan(),
          status: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          clientSeats: finalData.branding?.clientSeats || 10,
        },
        
        // Metadata
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 4: Update user profile to mark onboarding as complete
      await updateDoc(doc(db, 'userProfiles', user.uid), {
        onboardingCompleted: true,
        displayName: finalData.businessProfile?.name || profile.displayName,
        updatedAt: new Date(),
      });

      // Step 5: Save onboarding session for audit/recovery
      await setDoc(doc(db, 'onboarding_sessions', user.uid), {
        userId: user.uid,
        organizationId: orgId,
        data: {
          businessProfile: {
            name: finalData.businessProfile?.name,
            type: finalData.businessProfile?.type,
            address: finalData.businessProfile?.address,
            phone: finalData.businessProfile?.phone,
            website: finalData.businessProfile?.website,
          },
          branding: finalData.branding,
          equipment: finalData.equipment,
          teamSetup: finalData.teamSetup,
        },
        completedAt: new Date(),
      });

      // Step 6: Handle coach invites if any
      if (finalData.teamSetup?.coachEmails && finalData.teamSetup.coachEmails.length > 0) {
        setSavingMessage('Preparing invitations...');
        // TODO: Implement coach invitation emails in Phase 6
        logger.info('Coach invitations to send:', finalData.teamSetup.coachEmails);
      }

      // Refresh settings so the app picks up the new configuration
      await refreshSettings();

      logger.info('Onboarding completed successfully');
      setIsComplete(true);
    } catch (error) {
      logger.error('Failed to save onboarding data:', error);
      // TODO: Show error toast
      setSavingMessage('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="animate-pulse text-foreground-secondary">Loading...</div>
      </div>
    );
  }

  // Success state
  if (isComplete) {
    return (
      <OnboardingLayout currentStep={4}>
        <OnboardingSuccess businessName={onboardingData.businessProfile?.name || 'Your Business'} />
      </OnboardingLayout>
    );
  }

  // Saving state overlay
  if (saving) {
    return (
      <OnboardingLayout currentStep={currentStep}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-foreground-secondary">{savingMessage}</p>
        </div>
      </OnboardingLayout>
    );
  }

  // Render current step
  return (
    <OnboardingLayout currentStep={currentStep}>
      {currentStep === 0 && (
        <BusinessInfoStep
          data={onboardingData.businessProfile}
          onNext={handleBusinessInfoNext}
        />
      )}
      {currentStep === 1 && (
        <BrandingStep
          data={onboardingData.branding}
          onNext={handleBrandingNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 2 && (
        <EquipmentStep
          data={onboardingData.equipment}
          onNext={handleEquipmentNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 3 && (
        <TeamSetupStep
          data={onboardingData.teamSetup}
          subscriptionPlan={getSubscriptionPlan()}
          onNext={handleTeamSetupNext}
          onBack={handleBack}
        />
      )}
    </OnboardingLayout>
  );
}
