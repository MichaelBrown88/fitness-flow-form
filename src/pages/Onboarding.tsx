/**
 * Onboarding Page
 *
 * Simplified 4-step flow:
 *   0 Account  ->  1 Business  ->  2 Equipment  ->  3 Plan  ->  Success
 */

import { useOnboarding } from '@/hooks/useOnboarding';
import {
  OnboardingLayout,
  IdentityStep,
  BusinessInfoStep,
  EquipmentStep,
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
    identityError,
    onboardingData,
    handleIdentityNext,
    handleBusinessNext,
    handleEquipmentNext,
    handleCapacityNext,
    handleBack,
  } = useOnboarding();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  // Success state
  if (isComplete || step >= 4) {
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
          <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-500">{savingMessage}</p>
        </div>
      </OnboardingLayout>
    );
  }

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <IdentityStep
            data={onboardingData.identity}
            onNext={handleIdentityNext}
            error={identityError}
          />
        );
      case 1:
        return (
          <BusinessInfoStep
            data={onboardingData.businessProfile}
            onNext={handleBusinessNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <EquipmentStep
            data={onboardingData.equipment}
            onNext={handleEquipmentNext}
            onBack={handleBack}
          />
        );
      case 3:
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
        currentStep={step}
        onBack={step > 0 ? handleBack : undefined}
      >
        {renderStep()}
      </OnboardingLayout>
    </ErrorBoundary>
  );
}
