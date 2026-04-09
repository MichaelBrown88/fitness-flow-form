/**
 * OrgSetupWizard
 *
 * Catch-up wizard for legacy orgs that were created before multi-tenancy
 * and are missing required fields (type, region, subscription.planKind,
 * equipmentConfig). Shown as a full-screen overlay over the dashboard.
 *
 * Steps are computed from useOrgHealthCheck and skipped if already healthy.
 * Reuses BusinessInfoStep and EquipmentStep from the main onboarding flow.
 */

import { useState, useMemo, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, Building2, Zap, Settings2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrgHealthCheck } from '@/hooks/useOrgHealthCheck';
import { getDb } from '@/services/firebase';
import { OnboardingLayout } from './OnboardingLayout';
import { BusinessInfoStep } from './BusinessInfoStep';
import { EquipmentStep } from './EquipmentStep';
import { buildLegacySubscription } from '@/lib/auth/buildLegacySubscription';
import type { BusinessProfileData, EquipmentConfig } from '@/types/onboarding';
import { ONBOARDING_FLOW_STEPS } from '@/types/onboarding';
import type { OnboardingFlowStepMeta } from '@/types/onboarding';
import { DEFAULT_REGION } from '@/constants/pricing';
import { logger } from '@/lib/utils/logger';

type WizardStep = 'business-info' | 'plan' | 'equipment' | 'complete';

interface PlanStepProps {
  orgType: string;
  onContinue: () => void;
  onSubscribe: () => void;
}

function PlanStep({ orgType, onContinue, onSubscribe }: PlanStepProps) {
  const isSolo = orgType === 'solo_coach';

  if (isSolo) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Your plan</h2>
          <p className="text-sm text-foreground-secondary">
            Solo coaches get the free plan forever — no card required.
          </p>
        </div>
        <div className="rounded-xl border-2 border-foreground bg-background p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-foreground" />
            <span className="font-bold text-foreground">Solo Free</span>
          </div>
          <p className="text-sm text-foreground-secondary">
            Up to 15 active clients, 15 AI scans per month. Free forever.
          </p>
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-apple"
        >
          Looks good — continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Your plan</h2>
        <p className="text-sm text-foreground-secondary">
          Gym and studio accounts get a 14-day free trial to get everything set up.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onContinue}
          className="w-full text-left rounded-xl border-2 border-foreground bg-background p-5 space-y-1 hover:opacity-90 transition-apple"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-foreground" />
              <span className="font-bold text-foreground">Start 14-day trial</span>
            </div>
            <ArrowRight className="w-4 h-4 text-foreground-secondary" />
          </div>
          <p className="text-sm text-foreground-secondary">
            Up to 100 clients and full feature access. No card needed to start.
          </p>
        </button>

        <button
          type="button"
          onClick={onSubscribe}
          className="w-full text-left rounded-xl border border-border bg-muted/40 p-5 space-y-1 hover:bg-muted transition-apple"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground text-sm">I already have a subscription</span>
            <ArrowRight className="w-4 h-4 text-foreground-secondary" />
          </div>
          <p className="text-sm text-foreground-secondary">
            Head to billing to link or manage your existing Stripe subscription.
          </p>
        </button>
      </div>
    </div>
  );
}

interface OrgSetupWizardProps {
  onComplete?: () => void;
}

export function OrgSetupWizard({ onComplete }: OrgSetupWizardProps) {
  const { user, profile, orgSettings } = useAuth();
  const { issues } = useOrgHealthCheck();

  // Derive which steps are needed
  const steps = useMemo<WizardStep[]>(() => {
    const s: WizardStep[] = [];
    if (issues.missingBusinessInfo) s.push('business-info');
    if (issues.missingPlan) s.push('plan');
    if (issues.missingEquipment) s.push('equipment');
    s.push('complete');
    return s;
  }, [issues]);

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // If the only issue is incompleteProfile (all org data already exists), the wizard
  // lands immediately on 'complete' with no steps to run — completeSetup is never
  // called, so onboardingCompleted is never set. Fix it here.
  const currentStep = steps[stepIndex] ?? 'complete';
  useEffect(() => {
    if (currentStep !== 'complete') return;
    if (profile?.onboardingCompleted) return;
    if (!user || !profile?.organizationId) return;
    const db = getDb();
    void updateDoc(doc(db, 'userProfiles', user.uid), {
      onboardingCompleted: true,
      updatedAt: serverTimestamp(),
    }).catch((e) => logger.warn('[OrgSetupWizard] Auto-heal onboardingCompleted failed:', e));
  }, [currentStep, user, profile]);

  // Accumulated data across steps
  const [businessInfo, setBusinessInfo] = useState<BusinessProfileData>({
    name: orgSettings?.name || '',
    type: (orgSettings?.type as BusinessProfileData['type']) || 'solo_coach',
    region: (orgSettings?.region as BusinessProfileData['region']) || DEFAULT_REGION,
    isActiveCoach: true,
  });
  const [equipmentData, setEquipmentData] = useState<EquipmentConfig>({
    scanner: false,
    treadmill: false,
    dynamometer: false,
  });

  const isLastContentStep = steps[stepIndex + 1] === 'complete';

  // Progress steps metadata for sidebar — use actual ONBOARDING_FLOW_STEPS objects
  // so OnboardingLayout's strict prop type is satisfied.
  const progressSteps = useMemo<readonly OnboardingFlowStepMeta[]>(() => {
    const byId = Object.fromEntries(ONBOARDING_FLOW_STEPS.map((s) => [s.id, s]));
    const result: OnboardingFlowStepMeta[] = [];
    if (issues.missingBusinessInfo) result.push(byId['business']!);
    if (issues.missingPlan) result.push(byId['plan']!);
    if (issues.missingEquipment) result.push(byId['equipment']!);
    return result;
  }, [issues]);

  const activeProgressIndex = steps.indexOf(currentStep as WizardStep);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const completeSetup = async (opts: { skipEquipment?: boolean } = {}) => {
    if (!profile?.organizationId || !user) return;
    setSaving(true);
    setSaveError(null);

    const db = getDb();
    const orgId = profile.organizationId;
    const effectiveType = businessInfo.type || orgSettings?.type || 'solo_coach';
    const effectiveRegion = businessInfo.region || orgSettings?.region || DEFAULT_REGION;
    const email = user.email || '';

    try {
      const orgUpdates: Record<string, unknown> = {
        onboardingCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (issues.missingBusinessInfo) {
        orgUpdates.name = businessInfo.name;
        orgUpdates.type = effectiveType;
        orgUpdates.region = effectiveRegion;
      }

      if (issues.missingPlan) {
        orgUpdates.subscription = buildLegacySubscription(effectiveType, effectiveRegion, email);
      }

      if (issues.missingEquipment && !opts.skipEquipment) {
        orgUpdates.equipmentConfig = {
          bodyComposition: { enabled: equipmentData.scanner },
          gripStrength: { enabled: equipmentData.dynamometer },
          cardioEquipment: { enabled: equipmentData.treadmill },
          heartRateSensor: { enabled: false },
        };
      } else if (issues.missingEquipment && opts.skipEquipment) {
        // Provide a sensible all-false default so the check passes next time
        orgUpdates.equipmentConfig = {
          bodyComposition: { enabled: false },
          gripStrength: { enabled: false },
          cardioEquipment: { enabled: false },
          heartRateSensor: { enabled: false },
        };
      }

      await updateDoc(doc(db, 'organizations', orgId), orgUpdates);
      await updateDoc(doc(db, 'userProfiles', user.uid), {
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      });

      logger.info('[OrgSetupWizard] Org setup complete', { orgId });
      goNext(); // advance to 'complete' step
    } catch (e) {
      logger.error('[OrgSetupWizard] Setup failed', e);
      setSaveError(e instanceof Error ? e.message : 'Could not save — please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Complete screen ─────────────────────────────────────────────────────────
  if (currentStep === 'complete') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-foreground" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">You're all set</h2>
            <p className="text-sm text-foreground-secondary">
              Your account is up to date. You can manage billing and settings from the dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={onComplete}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-apple"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Stepped wizard ──────────────────────────────────────────────────────────
  return (
    <OnboardingLayout
      progressSteps={progressSteps}
      activeProgressIndex={activeProgressIndex}
      onBack={stepIndex > 0 ? goBack : undefined}
      blockingOverlay={saving ? { message: 'Saving your setup…' } : null}
    >
      {currentStep === 'business-info' && (
        <BusinessInfoStep
          data={businessInfo}
          onNext={(data) => {
            setBusinessInfo(data);
            goNext();
          }}
          onBack={goBack}
        />
      )}

      {currentStep === 'plan' && (
        <>
          <PlanStep
            orgType={businessInfo.type || orgSettings?.type || 'solo_coach'}
            onContinue={() => {
              if (isLastContentStep) {
                void completeSetup();
              } else {
                goNext();
              }
            }}
            onSubscribe={() => {
              // Mark setup complete with trial sub, then redirect to billing
              void completeSetup().then(() => {
                window.location.href = '/billing';
              });
            }}
          />
          {saveError && (
            <p className="mt-4 text-sm text-red-500 text-center">{saveError}</p>
          )}
        </>
      )}

      {currentStep === 'equipment' && (
        <div className="space-y-6">
          <EquipmentStep
            data={equipmentData}
            onNext={(data) => {
              setEquipmentData(data);
              void completeSetup();
            }}
            onSkip={() => void completeSetup({ skipEquipment: true })}
            onBack={goBack}
          />
          {saveError && (
            <p className="mt-2 text-sm text-red-500 text-center">{saveError}</p>
          )}
        </div>
      )}

      {/* Settings2 icon watermark for context (desktop left panel alternative) */}
      {currentStep === 'business-info' && (
        <div className="hidden lg:flex absolute bottom-8 right-8 items-center gap-2 text-muted-foreground/30">
          <Settings2 className="w-5 h-5" />
          <span className="text-xs font-medium">Account setup</span>
        </div>
      )}
    </OnboardingLayout>
  );
}
