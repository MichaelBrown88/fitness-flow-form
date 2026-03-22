/**
 * Onboarding Page
 *
 * Flow: Identity → Business → Account → Equipment → [Gym: Team] → Plan → Success
 */

import { useMemo } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import {
  OnboardingLayout,
  IdentityStep,
  BusinessInfoStep,
  EquipmentStep,
  TeamRosterStep,
  PackageSelectionStep,
  AccountCreationStep,
  OnboardingSuccess,
} from '@/components/onboarding';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { getOnboardingProgressState, ONBOARDING_FLOW_STEPS } from '@/types/onboarding';

const SUCCESS_STEP = 6;

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
    handleTeamNext,
    handlePlanNext,
    handleAccountCreateWithPassword,
    handleAccountCreateWithGoogle,
    handleAccountCreateWithApple,
    handleBack,
  } = useOnboarding();

  const progress = useMemo(() => {
    if (step < 0 || step >= SUCCESS_STEP) {
      return { steps: ONBOARDING_FLOW_STEPS, activeIndex: -1 };
    }
    return getOnboardingProgressState(step, onboardingData.businessProfile?.type);
  }, [step, onboardingData.businessProfile?.type]);

  const isGym =
    onboardingData.businessProfile?.type === 'gym' ||
    onboardingData.businessProfile?.type === 'gym_chain';

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-background"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">Loading onboarding</span>
        <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (isComplete || step >= SUCCESS_STEP) {
    return (
      <OnboardingLayout progressSteps={[]} activeProgressIndex={-1} onBack={undefined}>
        <OnboardingSuccess businessName={onboardingData.businessProfile?.name || 'Your Business'} />
      </OnboardingLayout>
    );
  }

  if (saving) {
    return (
      <OnboardingLayout progressSteps={progress.steps} activeProgressIndex={progress.activeIndex} onBack={undefined}>
        <div
          className="flex flex-col items-center justify-center py-16"
          role="status"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">{savingMessage}</span>
          <div className="w-10 h-10 border-2 border-muted border-t-primary rounded-full motion-safe:animate-spin mb-4" aria-hidden />
          <p className="text-sm text-muted-foreground">{savingMessage}</p>
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
        if (isGym) {
          return (
            <TeamRosterStep
              initialValue={onboardingData.teamRoster}
              onNext={handleTeamNext}
              onBack={handleBack}
            />
          );
        }
        return (
          <PackageSelectionStep
            data={onboardingData.branding}
            businessType={onboardingData.businessProfile?.type}
            region={onboardingData.businessProfile?.region ?? 'GB'}
            onNext={handlePlanNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <PackageSelectionStep
            data={onboardingData.branding}
            businessType={onboardingData.businessProfile?.type}
            region={onboardingData.businessProfile?.region ?? 'GB'}
            onNext={handlePlanNext}
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
        progressSteps={progress.steps}
        activeProgressIndex={progress.activeIndex}
        onBack={step > 0 ? handleBack : undefined}
      >
        {renderStep()}
      </OnboardingLayout>
    </ErrorBoundary>
  );
}
