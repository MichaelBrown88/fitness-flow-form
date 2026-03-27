/**
 * Renders client-selection step when there is no client in context,
 * otherwise renders the assessment form (PhaseFormContent).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFormContext } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { resolveClientDisplayNameFromOrgClientDoc } from '@/services/clientProfiles';
import { getDraft } from '@/hooks/useAssessmentDraft';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { PhaseFormContent } from './PhaseFormContent';
import { AssessmentClientStep } from './AssessmentClientStep';
import { AssessmentPlanWizard } from './AssessmentPlanWizard';

function hasClientInStorage(): boolean {
  try {
    const draft = getDraft();
    if (draft?.clientName?.trim()) return true;
    const editData = sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
    if (editData) {
      const parsed = JSON.parse(editData) as { formData?: { fullName?: string } };
      if (parsed.formData?.fullName?.trim()) return true;
    }
    const partialData = sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
    if (partialData) {
      const parsed = JSON.parse(partialData) as { clientName?: string };
      if (parsed.clientName?.trim()) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function shouldSkipSessionPlanWizard(): boolean {
  try {
    if (sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT)) return true;
    if (sessionStorage.getItem(STORAGE_KEYS.IS_DEMO) === 'true') return true;
    const editData = sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
    if (editData) {
      const parsed = JSON.parse(editData) as { editType?: string };
      if (parsed.editType?.startsWith('partial-') || parsed.editType === 'manual') return true;
    }
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [skippedClientStep, setSkippedClientStep] = useState(false);
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

  const hasClientContext = useMemo(() => {
    if (hasClientFromUrl) return true;
    if (formData.fullName?.trim()) return true;
    if (hasClientInStorage()) return true;
    return false;
  }, [formData.fullName, hasClientFromUrl]);

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
        if (choseNewClient) setSkippedClientStep(true);
      }}
    />
  );
}
