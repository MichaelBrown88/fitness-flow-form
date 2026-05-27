import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { IntakeReviewSummary } from '@/components/client/IntakeReviewSummary';
import { ConsultationPanel } from '@/components/client/ConsultationPanel';
import { CONSULTATION_COPY } from '@/constants/consultation';
import { clientSlugFromName } from '@/lib/database/paths';
import { listConsultations } from '@/services/consultation';
import type { ConsultationDoc } from '@/lib/consultation/types';
import type { ClientDetailOutletContext } from './ClientDetailLayout';
import { ROUTES } from '@/constants/routes';
import type { FormData } from '@/contexts/FormContext';
import { initialFormData } from '@/types/assessmentForm';

function mergeProfileFormData(profileData: unknown): FormData {
  if (!profileData || typeof profileData !== 'object') {
    return { ...initialFormData };
  }
  return { ...initialFormData, ...(profileData as FormData) };
}

export default function ClientConsultationTab() {
  const { clientName, displayClientName, profile, currentAssessment } =
    useOutletContext<ClientDetailOutletContext>();
  const { effectiveOrgId } = useAuth();
  const orgId = effectiveOrgId ?? '';
  const slug = clientSlugFromName(clientName);

  const [formData, setFormData] = useState<FormData>(() =>
    mergeProfileFormData(profile?.formData ?? currentAssessment?.formData),
  );
  const [history, setHistory] = useState<ConsultationDoc[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    setFormData(mergeProfileFormData(profile?.formData ?? currentAssessment?.formData));
  }, [profile?.formData, currentAssessment?.formData]);

  const updateFormData = useMemo(
    () => (patch: Partial<FormData>) => {
      setFormData((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  useEffect(() => {
    if (!orgId || !slug) return;
    let cancelled = false;
    void listConsultations(orgId, slug).then((docs) => {
      if (!cancelled) setHistory(docs);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId, slug]);

  const assessmentUrl = `${ROUTES.ASSESSMENT}?client=${encodeURIComponent(clientName)}`;

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Consultation — {displayClientName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review home intake and capture consultation notes before physical testing.
          </p>
        </div>
        {profile?.remoteIntakeAwaitingStudio ? (
          <Button asChild>
            <Link to={assessmentUrl}>Continue studio assessment</Link>
          </Button>
        ) : null}
      </div>

      <IntakeReviewSummary formData={formData} />

      <ConsultationPanel
        clientName={clientName}
        formData={formData}
        updateFormData={updateFormData}
        showPrepNotes
        onSaved={() => {
          if (!orgId || !slug) return;
          void listConsultations(orgId, slug).then(setHistory);
        }}
      />

      {history.length > 1 ? (
        <section className="border-t border-border pt-4">
          <button
            type="button"
            className="text-sm font-medium text-foreground hover:underline"
            onClick={() => setHistoryOpen((o) => !o)}
          >
            {CONSULTATION_COPY.historyTitle} ({history.length})
          </button>
          {historyOpen ? (
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {history.slice(1).map((doc) => (
                <li key={doc.id}>
                  Updated{' '}
                  {doc.updatedAt?.toDate?.().toLocaleDateString?.() ?? '—'}
                  {doc.clientGoals.length > 0 ? ` · ${doc.clientGoals.join(', ')}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
