/**
 * Renders client-selection step when there is no client in context,
 * then setup (confirm client + drafts), optional session plan, then capture (PhaseFormContent).
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useFormContext } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { resolveClientDisplayNameFromOrgClientDoc } from '@/services/clientProfiles';
import { getDraft } from '@/hooks/useAssessmentDraft';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import {
  isAssessmentSetupConfirmedInSession,
  parseEditAssessmentPayload,
  readPartialAssessmentRecord,
  removeAssessmentSetupConfirmed,
  removeEditAssessment,
  removePartialAssessment,
  removePrefillClient,
} from '@/lib/assessment/assessmentSessionStorage';
import { shouldSkipSessionPlanWizard } from '@/lib/assessment/assessmentGateUtils';
import { PhaseFormContent } from './PhaseFormContent';
import { AssessmentClientStep } from './AssessmentClientStep';
import { AssessmentPlanWizard } from './AssessmentPlanWizard';
import { AssessmentSetupStep } from './AssessmentSetupStep';

function hasClientInStorage(): boolean {
  try {
    const draft = getDraft();
    if (draft?.clientName?.trim()) return true;
    const parsedEdit = parseEditAssessmentPayload();
    if (parsedEdit?.formData?.fullName?.trim()) return true;
    const partialRec = readPartialAssessmentRecord();
    if (partialRec?.clientName?.trim()) return true;
  } catch {
    // ignore
  }
  return false;
}

export function AssessmentGate({
  demoTrigger,
  sidebarOpen,
  setSidebarOpen,
}: {
  demoTrigger?: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const { formData, updateFormData } = useFormContext();
  const { profile } = useAuth();
  const { toast } = useToast();
  const clientResolutionFailedRef = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [skippedClientStep, setSkippedClientStep] = useState(false);
  const [forceClientStep, setForceClientStep] = useState(false);
  const [setupConfirmed, setSetupConfirmed] = useState(() => isAssessmentSetupConfirmedInSession());
  const [sessionPlanComplete, setSessionPlanComplete] = useState(() => shouldSkipSessionPlanWizard());
  const hasClientFromUrl = useMemo(() => searchParams.get('client') ?? null, [searchParams]);

  useEffect(() => {
    if (!hasClientFromUrl) return;
    const rawDecoded = decodeURIComponent(hasClientFromUrl);
    const orgId = profile?.organizationId;
    if (!orgId) return;

    let cancelled = false;
    void (async () => {
      try {
        const resolved = await resolveClientDisplayNameFromOrgClientDoc(orgId, rawDecoded);
        if (cancelled) return;
        updateFormData({ fullName: resolved ?? rawDecoded });
      } catch {
        if (cancelled) return;
        updateFormData({ fullName: rawDecoded });
        if (!clientResolutionFailedRef.current) {
          clientResolutionFailedRef.current = true;
          toast({
            title: "Couldn't confirm client",
            description: `Using "${rawDecoded}" — double-check the client name before continuing.`,
            variant: 'destructive',
          });
        }
      }
      if (cancelled) return;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('client');
        return next;
      }, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [hasClientFromUrl, profile?.organizationId, updateFormData, setSearchParams]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEYS.IS_DEMO) === 'true') {
        sessionStorage.setItem(STORAGE_KEYS.ASSESSMENT_SETUP_CONFIRMED, '1');
        setSetupConfirmed(true);
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  const hasClientContext = useMemo(() => {
    if (forceClientStep) return false;
    if (hasClientFromUrl) return true;
    if (formData.fullName?.trim()) return true;
    if (hasClientInStorage()) return true;
    return false;
  }, [forceClientStep, formData.fullName, hasClientFromUrl]);

  const showForm = hasClientContext || skippedClientStep;

  const needsSessionPlan =
    showForm &&
    !sessionPlanComplete &&
    !shouldSkipSessionPlanWizard() &&
    formData.assessmentPlan == null;

  const handlePlanWizardDone = useCallback(() => {
    setSessionPlanComplete(true);
  }, []);

  useEffect(() => {
    if (shouldSkipSessionPlanWizard()) {
      setSessionPlanComplete(true);
    }
  }, []);

  const isResolvingUrlClient = Boolean(hasClientFromUrl && !formData.fullName?.trim());

  const handleSetupComplete = useCallback(() => {
    setSetupConfirmed(true);
  }, []);

  const handleChangeClientFromSetup = useCallback(() => {
    removeAssessmentSetupConfirmed();
    removePrefillClient();
    removePartialAssessment();
    removeEditAssessment();
    updateFormData({ fullName: '' });
    setSetupConfirmed(false);
    setSkippedClientStep(false);
    setForceClientStep(true);
  }, [updateFormData]);

  if (showForm && !setupConfirmed) {
    return (
      <AssessmentSetupStep
        isResolvingClient={isResolvingUrlClient}
        onComplete={handleSetupComplete}
        onChangeClient={handleChangeClientFromSetup}
      />
    );
  }

  if (showForm && needsSessionPlan) {
    return <AssessmentPlanWizard onComplete={handlePlanWizardDone} />;
  }

  if (showForm) {
    return (
      <PhaseFormContent
        demoTrigger={demoTrigger}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
    );
  }

  return (
    <AssessmentClientStep
      onContinue={(choseNewClient) => {
        setForceClientStep(false);
        if (choseNewClient) setSkippedClientStep(true);
      }}
    />
  );
}
