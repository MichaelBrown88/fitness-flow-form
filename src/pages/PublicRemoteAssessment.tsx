import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RemoteIntakeLayout } from '@/components/remote/RemoteIntakeLayout';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import {
  fetchRemoteAssessmentSession,
  submitRemoteAssessmentFields,
} from '@/services/remoteAssessmentClient';
import { logger } from '@/lib/utils/logger';
import type { RemotePostureView, RemoteSessionFailReason } from '@/lib/types/remoteAssessment';
import { RemoteMobileShell } from '@/components/remote/RemoteMobileShell';
import { RemoteIntakeWelcome } from '@/components/remote/RemoteIntakeWelcome';
import {
  RemoteMobileChoiceField,
  RemoteMobileTextField,
  RemoteMobileYesNoField,
} from '@/components/remote/RemoteMobileField';
import { RemoteMobileDateWheelPicker } from '@/components/remote/RemoteMobileDateWheelPicker';
import { RemotePostureIntroIllustration } from '@/components/remote/RemotePostureIntroIllustration';
import { RemotePostureGuidedCapture } from '@/components/remote/RemotePostureGuidedCapture';
import { RemoteIntakeSuccess } from '@/components/remote/RemoteIntakeSuccess';
import {
  INITIAL_LIFESTYLE_REMOTE,
  type LifestyleRemoteState,
} from '@/components/remote/PublicRemoteLifestyleFields';
import { initialBasicFromPrefill } from '@/lib/remote/remoteIntakePrefill';
import type { RemoteBasicInfoPrefill } from '@/lib/remote/remoteIntakePrefill';
import {
  buildRemoteIntakeScreens,
  isScreenValid,
  screenSubtitle,
  screenTitle,
  type RemoteIntakeScreen,
} from '@/lib/remote/remoteIntakeFlow';
import type { BasicInfoState } from '@/components/remote/steps/RemoteBasicInfoStep';

const REMOTE_INTAKE_COMPLETE_KEY = 'remote-intake-complete';

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

function isScreenValidWithMeds(
  screen: RemoteIntakeScreen,
  basic: BasicInfoState,
  lifestyle: LifestyleRemoteState,
  parq: Record<string, string>,
  posturePaths: Partial<Record<RemotePostureView, string>>,
): boolean {
  if (
    screen.kind === 'text' &&
    screen.field === 'medicationsNotes' &&
    lifestyle.medicationsFlag !== 'yes'
  ) {
    return true;
  }
  if (screen.kind === 'text' && screen.field === 'fullName') {
    return basic.fullName.trim().length >= 2;
  }
  if (screen.kind === 'text' && screen.field === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(basic.email.trim());
  }
  return isScreenValid(screen, basic, lifestyle, parq, posturePaths);
}

export default function PublicRemoteAssessment() {
  const { token } = useParams<{ token: string }>();

  const [checking, setChecking] = useState(true);
  const [sessionFailReason, setSessionFailReason] = useState<RemoteSessionFailReason | null>(null);
  const [allowedKeys, setAllowedKeys] = useState<Set<string>>(new Set());
  const [prefill, setPrefill] = useState<RemoteBasicInfoPrefill>({});

  const [screenIndex, setScreenIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postureCaptureOpen, setPostureCaptureOpen] = useState(false);

  const [basicInfo, setBasicInfo] = useState<BasicInfoState>(() => initialBasicFromPrefill({}));
  const [lifestyle, setLifestyle] = useState<LifestyleRemoteState>(INITIAL_LIFESTYLE_REMOTE);
  const [parqAnswers, setParqAnswers] = useState<Record<string, string>>({});
  const [posturePaths, setPosturePaths] = useState<Partial<Record<RemotePostureView, string>>>({});

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetchRemoteAssessmentSession(token);
      if (cancelled) return;
      if (res.ok) {
        setSessionFailReason(null);
        setAllowedKeys(new Set(res.allowedKeys));
        const p = res.prefill ?? {};
        setPrefill(p);
        setBasicInfo(initialBasicFromPrefill(p));
      } else {
        setSessionFailReason(res.reason);
        setAllowedKeys(new Set());
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const screens = useMemo(() => {
    const built = buildRemoteIntakeScreens({
      allowedKeys,
      prefill,
      gender: basicInfo.gender,
    });
    return built.filter((s) => {
      if (s.kind === 'text' && s.field === 'medicationsNotes') {
        return lifestyle.medicationsFlag === 'yes';
      }
      return true;
    });
  }, [allowedKeys, prefill, basicInfo.gender, lifestyle.medicationsFlag]);

  const currentScreen = screens[screenIndex];
  const progress = screens.length > 0 ? (screenIndex + 1) / screens.length : 0;

  const currentValid = useMemo(() => {
    if (!currentScreen) return false;
    return isScreenValidWithMeds(currentScreen, basicInfo, lifestyle, parqAnswers, posturePaths);
  }, [currentScreen, basicInfo, lifestyle, parqAnswers, posturePaths]);

  const postureCapturedCount = Object.keys(posturePaths).length;

  const primaryDisabled = useMemo(() => {
    if (!currentScreen) return true;
    if (currentScreen.kind === 'posture' && postureCapturedCount === 0) {
      return false;
    }
    return !currentValid;
  }, [currentScreen, currentValid, postureCapturedCount]);

  const intakeLayout =
    currentScreen &&
    currentScreen.kind !== 'welcome' &&
    currentScreen.kind !== 'group'
      ? 'centered'
      : 'default';

  const intakeTitle = useMemo(() => {
    if (!currentScreen) return undefined;
    if (currentScreen.kind === 'dateOfBirth') {
      return ASSESSMENT_COPY.REMOTE_INTAKE_DOB_TITLE;
    }
    if (currentScreen.kind === 'posture') {
      return ASSESSMENT_COPY.REMOTE_INTAKE_POSTURE_TITLE;
    }
    return screenTitle(currentScreen);
  }, [currentScreen]);

  const intakeSubtitle = useMemo(() => {
    if (!currentScreen) return undefined;
    if (currentScreen.kind === 'dateOfBirth') {
      return currentScreen.readOnly
        ? 'We already have this from your coach — tap Next to confirm.'
        : ASSESSMENT_COPY.REMOTE_INTAKE_DOB_HINT;
    }
    if (currentScreen.kind === 'posture') {
      if (postureCapturedCount > 0) {
        return ASSESSMENT_COPY.REMOTE_INTAKE_POSTURE_DONE(postureCapturedCount);
      }
      return ASSESSMENT_COPY.REMOTE_INTAKE_POSTURE_PREP;
    }
    return screenSubtitle(currentScreen);
  }, [currentScreen, postureCapturedCount]);

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
      for (const [view, path] of Object.entries(posturePaths)) {
        if (path) fields[`postureRemotePath_${view}`] = path;
      }
      for (const k of Object.keys(fields)) {
        if (!fields[k]) delete fields[k];
      }
      await submitRemoteAssessmentFields(token, fields);
      sessionStorage.setItem(REMOTE_INTAKE_COMPLETE_KEY, '1');
      setSubmitted(true);
    } catch (err) {
      logger.error('[PublicRemoteAssessment] Submit failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (!currentScreen) return;
    if (currentScreen.kind === 'posture' && Object.keys(posturePaths).length === 0) {
      setPostureCaptureOpen(true);
      return;
    }
    if (screenIndex >= screens.length - 1) {
      void handleSubmitAll();
      return;
    }
    setScreenIndex((i) => i + 1);
  };

  const goBack = () => {
    setScreenIndex((i) => Math.max(0, i - 1));
  };

  if (!token) {
    return (
      <RemoteIntakeLayout>
        <p className="text-center text-sm text-muted-foreground">{ASSESSMENT_COPY.REMOTE_INVALID}</p>
      </RemoteIntakeLayout>
    );
  }

  if (checking) {
    return <RemoteIntakeLayout loading />;
  }

  if (allowedKeys.size === 0) {
    const failCopy =
      sessionFailReason === 'expired'
        ? ASSESSMENT_COPY.REMOTE_EXPIRED
        : sessionFailReason === 'disabled'
          ? ASSESSMENT_COPY.REMOTE_UNAVAILABLE
          : sessionFailReason === 'network'
            ? ASSESSMENT_COPY.REMOTE_NETWORK
            : ASSESSMENT_COPY.REMOTE_INVALID;
    return (
      <RemoteIntakeLayout>
        <div className="mx-auto max-w-sm space-y-3 text-center">
          <h2 className="text-lg font-semibold text-foreground">Link not working</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{failCopy}</p>
        </div>
      </RemoteIntakeLayout>
    );
  }

  if (submitted) {
    return (
      <RemoteIntakeLayout>
        <RemoteIntakeSuccess />
      </RemoteIntakeLayout>
    );
  }

  if (postureCaptureOpen && token) {
    return (
      <RemotePostureGuidedCapture
        token={token}
        onComplete={(paths) => {
          setPosturePaths(paths);
          setPostureCaptureOpen(false);
          if (screenIndex < screens.length - 1) {
            setScreenIndex((i) => i + 1);
          } else {
            void handleSubmitAll();
          }
        }}
        onClose={() => setPostureCaptureOpen(false)}
      />
    );
  }

  const renderScreenBody = () => {
    if (!currentScreen) return null;
    switch (currentScreen.kind) {
      case 'dateOfBirth':
        return (
          <RemoteMobileDateWheelPicker
            value={basicInfo.dateOfBirth}
            onChange={(iso) => setBasicInfo((prev) => ({ ...prev, dateOfBirth: iso }))}
            readOnly={currentScreen.readOnly}
          />
        );
      case 'text':
        if (currentScreen.domain === 'basic') {
          const field = currentScreen.field as keyof BasicInfoState;
          return (
            <RemoteMobileTextField
              label={currentScreen.label}
              showLabel={false}
              value={basicInfo[field]}
              onChange={(v) => setBasicInfo((prev) => ({ ...prev, [field]: v }))}
              type={currentScreen.inputType}
              placeholder={currentScreen.placeholder}
              autoComplete={currentScreen.autoComplete}
              inputMode={currentScreen.inputMode}
              readOnly={currentScreen.readOnly}
            />
          );
        }
        {
          const field = currentScreen.field as keyof LifestyleRemoteState;
          return (
            <RemoteMobileTextField
              label={currentScreen.label}
              showLabel={false}
              value={lifestyle[field]}
              onChange={(v) => setLifestyle((prev) => ({ ...prev, [field]: v }))}
              type={currentScreen.inputType}
              placeholder={currentScreen.placeholder}
              inputMode={currentScreen.inputMode}
            />
          );
        }
      case 'select':
        if (currentScreen.domain === 'basic') {
          const field = currentScreen.field as keyof BasicInfoState;
          return (
            <RemoteMobileChoiceField
              value={basicInfo[field]}
              onChange={(v) => setBasicInfo((prev) => ({ ...prev, [field]: v }))}
              options={currentScreen.options}
            />
          );
        }
        {
          const field = currentScreen.field as keyof LifestyleRemoteState;
          return (
            <RemoteMobileChoiceField
              value={lifestyle[field]}
              onChange={(v) => setLifestyle((prev) => ({ ...prev, [field]: v }))}
              options={currentScreen.options}
            />
          );
        }
      case 'group':
        return (
          <div className="space-y-4">
            {currentScreen.fields.map((f) => (
              <RemoteMobileTextField
                key={f.field}
                label={f.label}
                value={lifestyle[f.field]}
                onChange={(v) => setLifestyle((prev) => ({ ...prev, [f.field]: v }))}
                placeholder={f.placeholder}
                inputMode="numeric"
              />
            ))}
          </div>
        );
      case 'parq':
        return (
          <RemoteMobileYesNoField
            label={currentScreen.label}
            value={parqAnswers[currentScreen.questionId] ?? ''}
            onChange={(v) =>
              setParqAnswers((prev) => ({ ...prev, [currentScreen.questionId]: v }))
            }
          />
        );
      case 'posture':
        return (
          <div className="flex w-full flex-col items-center gap-6">
            {postureCapturedCount === 0 ? (
              <>
                <RemotePostureIntroIllustration />
                <p className="max-w-sm text-center text-base leading-relaxed text-foreground/90">
                  {ASSESSMENT_COPY.REMOTE_INTAKE_POSTURE_BODY}
                </p>
                <p className="max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
                  {ASSESSMENT_COPY.REMOTE_INTAKE_POSTURE_TIP}
                </p>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full max-w-sm rounded-2xl text-base"
                onClick={() => setPostureCaptureOpen(true)}
              >
                {ASSESSMENT_COPY.REMOTE_INTAKE_POSTURE_RETAKE}
              </Button>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const primaryLabel =
    currentScreen?.kind === 'posture' && postureCapturedCount === 0
      ? ASSESSMENT_COPY.REMOTE_INTAKE_POSTURE_START
      : screenIndex >= screens.length - 1
        ? 'Submit'
        : 'Next';

  const intakeBrandHeader = (
    <header className="shrink-0 border-b border-border/60 px-4 py-3">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
          aria-hidden
        >
          OA
        </div>
        <span className="text-sm font-semibold tracking-tight">One Assess</span>
      </div>
    </header>
  );

  if (currentScreen?.kind === 'welcome') {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
        {intakeBrandHeader}
        <RemoteIntakeWelcome onStart={goNext} loading={submitting} />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      {intakeBrandHeader}
      <div className="flex min-h-0 flex-1 flex-col">
        <RemoteMobileShell
          progress={progress}
          title={intakeTitle}
          subtitle={intakeSubtitle}
          layout={intakeLayout}
          primaryLabel={primaryLabel}
          primaryDisabled={primaryDisabled}
          primaryLoading={submitting}
          onPrimary={goNext}
          showBack={screenIndex > 0}
          onBack={goBack}
          className="flex-1"
        >
          {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
          {renderScreenBody()}
        </RemoteMobileShell>
      </div>
    </div>
  );
}
