import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import {
  fetchRemoteAssessmentSession,
  submitRemoteAssessmentFields,
} from '@/services/remoteAssessmentClient';
import { logger } from '@/lib/utils/logger';
import type { RemotePostureView } from '@/lib/types/remoteAssessment';
import { RemoteWizardShell } from '@/components/remote/RemoteWizardShell';
import {
  RemoteBasicInfoStep,
  INITIAL_BASIC_INFO,
  isBasicInfoValid,
  type BasicInfoState,
} from '@/components/remote/steps/RemoteBasicInfoStep';
import {
  PublicRemoteLifestyleFields,
  INITIAL_LIFESTYLE_REMOTE,
  type LifestyleRemoteState,
} from '@/components/remote/PublicRemoteLifestyleFields';
import { RemoteParQStep } from '@/components/remote/steps/RemoteParQStep';
import {
  RemoteBodyCompStep,
  type BodyCompStatus,
} from '@/components/remote/steps/RemoteBodyCompStep';
import { RemotePostureStep } from '@/components/remote/steps/RemotePostureStep';
import { parqQuestions } from '@/components/ParQQuestionnaire';

const STEPS = [
  { id: 'basicInfo', label: 'Basic Info' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'parq', label: 'Health Screening' },
  { id: 'bodyComp', label: 'Body Comp' },
  { id: 'posture', label: 'Posture' },
] as const;

function lifestyleToFields(lifestyle: LifestyleRemoteState, allowed: Set<string>): Record<string, string> {
  const out: Record<string, string> = {};
  const entries: [keyof LifestyleRemoteState, string][] = [
    ['activityLevel', lifestyle.activityLevel],
    ['sleepArchetype', lifestyle.sleepArchetype],
    ['stressLevel', lifestyle.stressLevel],
    ['nutritionHabits', lifestyle.nutritionHabits],
    ['hydrationHabits', lifestyle.hydrationHabits],
    ['stepsPerDay', lifestyle.stepsPerDay.trim()],
    ['sedentaryHours', lifestyle.sedentaryHours.trim()],
    ['caffeineCupsPerDay', lifestyle.caffeineCupsPerDay.trim()],
    ['alcoholFrequency', lifestyle.alcoholFrequency],
    ['medicationsFlag', lifestyle.medicationsFlag],
    ['medicationsNotes', lifestyle.medicationsNotes.trim()],
  ];
  for (const [k, v] of entries) {
    if (!allowed.has(k) || !v) continue;
    out[k] = v;
  }
  return out;
}

export default function PublicRemoteAssessment() {
  const { token } = useParams<{ token: string }>();

  // Session
  const [checking, setChecking] = useState(true);
  const [allowedKeys, setAllowedKeys] = useState<Set<string>>(new Set());

  // Wizard navigation
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step state
  const [basicInfo, setBasicInfo] = useState<BasicInfoState>(INITIAL_BASIC_INFO);
  const [lifestyle, setLifestyle] = useState<LifestyleRemoteState>(INITIAL_LIFESTYLE_REMOTE);
  const [parqAnswers, setParqAnswers] = useState<Record<string, string>>({});
  const [bodyCompStatus, setBodyCompStatus] = useState<BodyCompStatus>('pending');
  const [bodyCompFields, setBodyCompFields] = useState<Record<string, string>>({});
  const [postureSkipped, setPostureSkipped] = useState(false);
  const [postureConsentGiven, setPostureConsentGiven] = useState(false);
  const [posturePaths, setPosturePaths] = useState<Partial<Record<RemotePostureView, string>>>({});

  useEffect(() => {
    if (!token) { setChecking(false); return; }
    let cancelled = false;
    void (async () => {
      const res = await fetchRemoteAssessmentSession(token);
      if (cancelled) return;
      if (res.ok) {
        setAllowedKeys(new Set(res.allowedKeys));
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Per-step validity
  const isCurrentStepValid = useMemo(() => {
    switch (currentStep) {
      case 0: return isBasicInfoValid(basicInfo);
      case 1: return !!lifestyle.activityLevel;
      case 2: {
        const visible = parqQuestions.filter(q => {
          if (!q.conditional) return true;
          return basicInfo.gender === q.conditional.showWhen.value;
        });
        return visible.every(q => (parqAnswers[q.id] ?? '') !== '');
      }
      case 3: return bodyCompStatus === 'skipped' || bodyCompStatus === 'confirmed';
      case 4: return postureSkipped || Object.keys(posturePaths).length > 0;
      default: return false;
    }
  }, [currentStep, basicInfo, lifestyle, parqAnswers, bodyCompStatus, postureSkipped, posturePaths]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      void handleSubmitAll();
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const handleSubmitAll = async () => {
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const fields: Record<string, string> = {
        ...basicInfo,
        ...lifestyleToFields(lifestyle, allowedKeys),
        ...parqAnswers,
      };
      if (bodyCompStatus === 'confirmed') {
        Object.assign(fields, bodyCompFields);
      }
      if (!postureSkipped) {
        for (const [view, path] of Object.entries(posturePaths)) {
          if (path) fields[`postureRemotePath_${view}`] = path;
        }
      }
      // Remove empty strings
      for (const k of Object.keys(fields)) {
        if (!fields[k]) delete fields[k];
      }
      await submitRemoteAssessmentFields(token, fields);
      setSubmitted(true);
    } catch (err) {
      logger.error('[PublicRemoteAssessment] Submit failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading / invalid / submitted states
  if (!token) {
    return (
      <AppShell title="Remote check-in" mode="public">
        <div className="max-w-md mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
          {ASSESSMENT_COPY.REMOTE_INVALID}
        </div>
      </AppShell>
    );
  }

  if (checking) {
    return (
      <AppShell title="Remote check-in" mode="public">
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-sm">Checking your link...</p>
        </div>
      </AppShell>
    );
  }

  if (allowedKeys.size === 0) {
    return (
      <AppShell title="Remote check-in" mode="public">
        <div className="max-w-md mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
          {ASSESSMENT_COPY.REMOTE_INVALID}
        </div>
      </AppShell>
    );
  }

  if (submitted) {
    return (
      <AppShell title="Remote check-in" mode="public">
        <div className="max-w-md mx-auto px-4 py-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-950 p-4">
              <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Thanks</h2>
          <p className="text-sm text-muted-foreground">{ASSESSMENT_COPY.REMOTE_THANKS}</p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/">Home</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <RemoteBasicInfoStep value={basicInfo} onChange={setBasicInfo} />;
      case 1:
        return (
          <PublicRemoteLifestyleFields
            value={lifestyle}
            onChange={setLifestyle}
            allowedKeys={allowedKeys}
          />
        );
      case 2:
        return (
          <RemoteParQStep
            value={parqAnswers}
            onChange={(patch) => setParqAnswers((prev) => ({ ...prev, ...patch }))}
            gender={basicInfo.gender}
          />
        );
      case 3:
        return (
          <RemoteBodyCompStep
            token={token}
            status={bodyCompStatus}
            fields={bodyCompFields}
            onStatusChange={setBodyCompStatus}
            onFieldsChange={setBodyCompFields}
          />
        );
      case 4:
        return (
          <RemotePostureStep
            token={token}
            skipped={postureSkipped}
            consentGiven={postureConsentGiven}
            posturePaths={posturePaths}
            onSkip={() => setPostureSkipped((v) => !v)}
            onConsentGiven={() => setPostureConsentGiven(true)}
            onPosturePathsChange={setPosturePaths}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppShell title="Assessment" mode="public">
      <RemoteWizardShell
        steps={[...STEPS]}
        currentStep={currentStep}
        isValid={isCurrentStepValid}
        isSubmitting={submitting}
        onBack={handleBack}
        onNext={handleNext}
      >
        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}
        {renderStep()}
      </RemoteWizardShell>
    </AppShell>
  );
}
