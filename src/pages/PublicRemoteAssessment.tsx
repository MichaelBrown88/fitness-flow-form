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
import type { RemoteAssessmentScope, RemotePostureView } from '@/lib/types/remoteAssessment';
import {
  PublicRemoteLifestyleFields,
  INITIAL_LIFESTYLE_REMOTE,
  type LifestyleRemoteState,
} from '@/components/remote/PublicRemoteLifestyleFields';
import { PublicRemotePostureFields } from '@/components/remote/PublicRemotePostureFields';

function lifestyleToFields(
  lifestyle: LifestyleRemoteState,
  allowed: Set<string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const entries: [keyof LifestyleRemoteState, string][] = [
    ['activityLevel', lifestyle.activityLevel],
    ['sleepArchetype', lifestyle.sleepArchetype],
    ['stressLevel', lifestyle.stressLevel],
    ['nutritionHabits', lifestyle.nutritionHabits],
    ['hydrationHabits', lifestyle.hydrationHabits],
    ['stepsPerDay', lifestyle.stepsPerDay.trim()],
  ];
  for (const [k, v] of entries) {
    if (!allowed.has(k) || !v) continue;
    out[k] = v;
  }
  return out;
}

export default function PublicRemoteAssessment() {
  const { token } = useParams<{ token: string }>();
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<{
    scope: RemoteAssessmentScope;
    allowedKeys: Set<string>;
  } | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lifestyle, setLifestyle] = useState<LifestyleRemoteState>(INITIAL_LIFESTYLE_REMOTE);
  const [posturePaths, setPosturePaths] = useState<Partial<Record<RemotePostureView, string>>>({});
  const [postureConsentGiven, setPostureConsentGiven] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setSession(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetchRemoteAssessmentSession(token);
      if (cancelled) return;
      if (res.ok) {
        setSession({ scope: res.scope, allowedKeys: new Set(res.allowedKeys) });
      } else {
        setSession(null);
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const title = useMemo(() => {
    if (!session) return 'Remote check-in';
    if (session.scope === 'posture') return 'Progress photos';
    if (session.scope === 'lifestyle_posture') return 'Remote check-in';
    return 'Lifestyle check-in';
  }, [session]);

  const showLifestyle = session && (session.scope === 'lifestyle' || session.scope === 'lifestyle_posture');
  const showPosture = session && (session.scope === 'posture' || session.scope === 'lifestyle_posture');

  const handleSubmitAll = async () => {
    if (!token || !session) return;
    setError(null);
    setSubmitting(true);
    try {
      const fields: Record<string, string> = {};
      if (showLifestyle) {
        Object.assign(fields, lifestyleToFields(lifestyle, session.allowedKeys));
      }
      if (showPosture) {
        for (const [view, path] of Object.entries(posturePaths)) {
          if (path) fields[`postureRemotePath_${view}`] = path;
        }
      }
      await submitRemoteAssessmentFields(token, fields);
      setSubmitted(true);
    } catch (err) {
      logger.error('[PublicRemoteAssessment] Submit failed:', err);
      setError(ASSESSMENT_COPY.REMOTE_INVALID);
    } finally {
      setSubmitting(false);
    }
  };

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
          <p className="text-sm">Checking your link…</p>
        </div>
      </AppShell>
    );
  }

  if (!session) {
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

  const onLifestyleNext =
    session.scope === 'lifestyle_posture' && step === 0
      ? () => setStep(1)
      : undefined;

  const showPostureUi = showPosture && (session.scope !== 'lifestyle_posture' || step === 1);
  const showLifestyleUi = showLifestyle && (session.scope !== 'lifestyle_posture' || step === 0);

  return (
    <AppShell title={title} mode="public">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <p className="text-sm text-muted-foreground">
          Your coach sent you this private link. Only share updates you are comfortable including.
        </p>
        {showLifestyleUi ? (
          <PublicRemoteLifestyleFields
            value={lifestyle}
            onChange={setLifestyle}
            allowedKeys={session.allowedKeys}
          />
        ) : null}
        {session.scope === 'lifestyle_posture' && step === 0 ? (
          <Button type="button" className="w-full" onClick={() => onLifestyleNext?.()}>
            {ASSESSMENT_COPY.REMOTE_CONTINUE_TO_PHOTOS}
          </Button>
        ) : null}
        {showPostureUi && token ? (
          !postureConsentGiven ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-5 space-y-4">
              <p className="text-sm font-medium text-foreground">About your posture photos</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your coach has invited you to upload posture photos as part of your fitness assessment. These photos are stored securely and are visible only to your coach and their organisation.
              </p>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                This is not a medical assessment. Posture observations are for fitness coaching context only and do not constitute a clinical diagnosis. You can request deletion of your data at any time.
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  onChange={(e) => { if (e.target.checked) setPostureConsentGiven(true); }}
                />
                <span className="text-sm text-foreground">I understand and consent to my photos being used for this fitness assessment.</span>
              </label>
            </div>
          ) : (
            <PublicRemotePostureFields token={token} value={posturePaths} onChange={setPosturePaths} />
          )
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {(session.scope !== 'lifestyle_posture' || step === 1) && (
          <Button
            type="button"
            className="w-full"
            disabled={submitting}
            onClick={() => void handleSubmitAll()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Submit'
            )}
          </Button>
        )}
      </div>
    </AppShell>
  );
}
