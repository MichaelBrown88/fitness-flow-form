/**
 * Onboarding Page
 *
 * 5-step flow:
 *   0 Identity -> 1 Business -> 2 Account -> 3 Equipment (optional) -> 4 Plan -> Success
 */

import { useOnboarding } from '@/hooks/useOnboarding';
import {
  OnboardingLayout,
  IdentityStep,
  BusinessInfoStep,
  EquipmentStep,
  PackageSelectionStep,
  AccountCreationStep,
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
    accountError,
    onboardingData,
    handleIdentityNext,
    handleBusinessNext,
    handleEquipmentNext,
    handleEquipmentSkip,
    handleCapacityNext,
    handleAccountCreateWithPassword,
    handleAccountCreateWithGoogle,
    handleAccountCreateWithApple,
    handleBack,
  } = useOnboarding();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (isComplete || step >= 5) {
    return (
      <OnboardingLayout currentStep={-1} onBack={undefined}>
        <OnboardingSuccess businessName={onboardingData.businessProfile?.name || 'Your Business'} />
      </OnboardingLayout>
    );
  }

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
          <AccountCreationStep
            email={onboardingData.identity?.email || ''}
            onCreateWithPassword={handleAccountCreateWithPassword}
            onCreateWithGoogle={handleAccountCreateWithGoogle}
            onCreateWithApple={handleAccountCreateWithApple}
            onBack={handleBack}
            error={accountError}
            submitting={saving}
          />
        );
      case 3:
        return (
          <EquipmentStep
            data={onboardingData.equipment}
            onNext={handleEquipmentNext}
            onSkip={handleEquipmentSkip}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <PackageSelectionStep
            data={onboardingData.branding}
            businessType={onboardingData.businessProfile?.type}
            region={onboardingData.businessProfile?.region ?? 'GB'}
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
