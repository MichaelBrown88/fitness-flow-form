/**
 * Onboarding Page
 * 
 * Multi-step onboarding flow for new users and organizations.
 * Uses useOnboarding hook for all logic and state management.
 */

import { useOnboarding } from '@/hooks/useOnboarding';
import {
  OnboardingLayout,
  WelcomeStep,
  IdentityStep,
  BusinessInfoStep,
  LocationStep,
  MarketingStep,
  BrandingStep,
  EquipmentStep,
  TeamSetupStep,
  PackageSelectionStep,
  OnboardingSuccess,
} from '@/components/onboarding';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function Onboarding() {
  const {
    step,
    isComplete,
    saving,
    savingMessage,
    loading,
    onboardingData,
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
    getCurrentStep,
    getSubscriptionPlan,
  } = useOnboarding();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  // Success state
  if (isComplete || step === 8) {
    return (
      <OnboardingLayout currentStep={-1} onBack={undefined}>
        <OnboardingSuccess businessName={onboardingData.businessProfile?.name || 'Your Business'} />
      </OnboardingLayout>
    );
  }

  // Saving state overlay
  if (saving) {
    return (
      <OnboardingLayout currentStep={-1} onBack={undefined}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500">{savingMessage}</p>
        </div>
      </OnboardingLayout>
    );
  }

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 0:
        return <WelcomeStep onNext={handleWelcomeNext} />;
      case 1:
        return (
          <IdentityStep
            data={onboardingData.identity}
            onNext={handleIdentityNext}
            error={savingMessage && savingMessage.includes('email') ? savingMessage : null}
          />
        );
      case 2:
        return (
          <BusinessInfoStep
            data={onboardingData.businessProfile}
            onNext={handleBusinessNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <LocationStep
            data={onboardingData.businessProfile}
            onNext={handleLocationNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <MarketingStep
            data={onboardingData.marketing}
            onNext={handleMarketingNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <BrandingStep
            data={onboardingData.branding}
            companyName={onboardingData.businessProfile?.name}
            onNext={handleBrandingNext}
            onBack={handleBack}
          />
        );
      case 6:
        return (
          <EquipmentStep
            data={onboardingData.equipment}
            onNext={handleEquipmentNext}
            onBack={handleBack}
          />
        );
      case 7:
        return (
          <TeamSetupStep
            data={onboardingData.teamSetup}
            subscriptionPlan={getSubscriptionPlan()}
            onNext={handleTeamSetupNext}
            onBack={handleBack}
          />
        );
      case 8:
        return (
          <PackageSelectionStep
            data={onboardingData.branding}
            businessType={onboardingData.businessProfile?.type}
            onNext={handleCapacityNext}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <OnboardingLayout
        currentStep={getCurrentStep()}
        onBack={step > 0 ? handleBack : undefined}
        onBypass={handleBypassOnboarding}
      >
        {renderStep()}
      </OnboardingLayout>
    </ErrorBoundary>
  );
}
