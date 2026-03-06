/**
 * Renders client-selection step when there is no client in context,
 * otherwise renders the assessment form (PhaseFormContent).
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFormContext } from '@/contexts/FormContext';
import { getDraft } from '@/hooks/useAssessmentDraft';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { PhaseFormContent } from './PhaseFormContent';
import { AssessmentClientStep } from './AssessmentClientStep';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [skippedClientStep, setSkippedClientStep] = useState(false);

  const hasClientFromUrl = useMemo(() => searchParams.get('client') ?? null, [searchParams]);

  useEffect(() => {
    if (!hasClientFromUrl) return;
    const name = decodeURIComponent(hasClientFromUrl);
    updateFormData({ fullName: name });
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('client');
      return next;
    }, { replace: true });
  }, [hasClientFromUrl, updateFormData, setSearchParams]);

  const hasClientContext = useMemo(() => {
    if (hasClientFromUrl) return true;
    if (formData.fullName?.trim()) return true;
    if (hasClientInStorage()) return true;
    return false;
  }, [formData.fullName, hasClientFromUrl]);

  const showForm = hasClientContext || skippedClientStep;

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
