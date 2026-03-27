/**
 * Onboarding Page
 *
 * Flow: Identity → Business → Account → Equipment → [Gym: Team] → Plan → Success
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Seo } from '@/components/seo/Seo';
import { SEO_NOINDEX_ONBOARDING } from '@/constants/seo';
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
  const location = useLocation();
  const {
    step,
    isComplete,
    saving,
    savingMessage,
    loading,
    identityError,
    accountError,
    planError,
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

  const funnelSeo = (
    <Seo
      pathname={location.pathname}
      title={SEO_NOINDEX_ONBOARDING.title}
      description={SEO_NOINDEX_ONBOARDING.description}
      noindex
    />
  );

  if (loading) {
    return (
      <>
        {funnelSeo}
        <div
          className="min-h-screen flex items-center justify-center bg-background"
          role="status"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">Loading onboarding</span>
          <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
        </div>
      </>
    );
  }

  if (isComplete || step >= SUCCESS_STEP) {
    return (
      <>
        {funnelSeo}
        <OnboardingLayout progressSteps={[]} activeProgressIndex={-1} onBack={undefined}>
          <OnboardingSuccess businessName={onboardingData.businessProfile?.name || 'Your Business'} />
        </OnboardingLayout>
      </>
    );
  }

  const blockingOverlay =
    saving && savingMessage ? { message: savingMessage } : null;

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
            completionError={planError}
            completingSetup={saving}
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
            completionError={planError}
            completingSetup={saving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {funnelSeo}
      <ErrorBoundary>
        <OnboardingLayout
          progressSteps={progress.steps}
          activeProgressIndex={progress.activeIndex}
          onBack={step > 0 && !saving ? handleBack : undefined}
          blockingOverlay={blockingOverlay}
        >
          {renderStep()}
        </OnboardingLayout>
      </ErrorBoundary>
    </>
  );
}
