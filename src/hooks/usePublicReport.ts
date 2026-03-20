/**
 * Real-time subscription to a public report by token.
 * Used by PublicReportViewer so client PWA updates when coach saves assessment.
 */

import { useState, useEffect } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { SnapshotSummary } from '@/services/publicReports';
import { subscribeToPublicReport } from '@/services/publicReports';
import { computeScores, buildRoadmap } from '@/lib/scoring';
import { generateCoachPlan } from '@/lib/recommendations';
import { logger } from '@/lib/utils/logger';

export interface UsePublicReportResult {
  formData: FormData | null;
  scores: ScoreSummary | null;
  previousFormData: FormData | undefined;
  previousScores: ScoreSummary | null;
  snapshotSummaries: SnapshotSummary[];
  orgDetails: { name: string; logoUrl?: string } | null;
  plan: import('@/lib/recommendations').CoachPlan | null;
  error: string | null;
  loading: boolean;
  clientName: string;
  /** AI-generated "what changed" narrative — set after coach first shares the report */
  changeNarrative: string | null;
}

function parseDoc(
  data: import('@/services/publicReports').PublicReportDoc,
): {
  formData: FormData;
  scores: ScoreSummary;
  previousFormData: FormData | undefined;
  previousScores: ScoreSummary | null;
  snapshotSummaries: SnapshotSummary[];
} {
  const fd = data.formData;
  const s = computeScores(fd);
  let previousFormData: FormData | undefined;
  let previousScores: ScoreSummary | null = null;
  if (data.previousFormData) {
    try {
      previousScores = computeScores(data.previousFormData);
      previousFormData = data.previousFormData;
    } catch {
      logger.debug('[usePublicReport] Could not compute previous scores');
    }
  }
  const snapshotSummaries = data.snapshotSummaries ?? [];
  return { formData: fd, scores: s, previousFormData, previousScores, snapshotSummaries };
}

export function usePublicReport(token: string | undefined): UsePublicReportResult {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [scores, setScores] = useState<ScoreSummary | null>(null);
  const [previousFormData, setPreviousFormData] = useState<FormData | undefined>(undefined);
  const [previousScores, setPreviousScores] = useState<ScoreSummary | null>(null);
  const [snapshotSummaries, setSnapshotSummaries] = useState<SnapshotSummary[]>([]);
  const [orgDetails, setOrgDetails] = useState<{ name: string; logoUrl?: string } | null>(null);
  const [plan, setPlan] = useState<import('@/lib/recommendations').CoachPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [changeNarrative, setChangeNarrative] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid report link.');
      setLoading(false);
      setFormData(null);
      setScores(null);
      setPreviousFormData(undefined);
      setPreviousScores(null);
      setSnapshotSummaries([]);
      setOrgDetails(null);
      setPlan(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToPublicReport(
      token,
      (data) => {
        if (!data) {
          setError('This report is no longer available or has expired.');
          setLoading(false);
          setFormData(null);
          setScores(null);
          setPreviousFormData(undefined);
          setPreviousScores(null);
          setSnapshotSummaries([]);
          setOrgDetails(null);
          setPlan(null);
          return;
        }
        if (data.revoked) {
          setError('This report is no longer available.');
          setLoading(false);
          setFormData(null);
          setScores(null);
          setPreviousFormData(undefined);
          setPreviousScores(null);
          setSnapshotSummaries([]);
          setOrgDetails(null);
          setPlan(null);
          return;
        }

        if (data.clientName) {
          document.title = `${data.clientName}'s Fitness Report | One Assess`;
        }

        const { formData: fd, scores: s, previousFormData: prevFd, previousScores: prevS, snapshotSummaries: summaries } = parseDoc(data);
        setFormData(fd);
        setScores(s);
        setPreviousFormData(prevFd);
        setPreviousScores(prevS);
        setSnapshotSummaries(summaries);
        setChangeNarrative(data.changeNarrative ?? null);
        setLoading(false);

        if (data.organizationId) {
          import('@/services/organizations')
            .then(({ getOrgSettings }) => getOrgSettings(data.organizationId!))
            .then((settings) => {
              if (settings.customBrandingEnabled === false) {
                setOrgDetails(null);
              } else {
                setOrgDetails({ name: settings.name, logoUrl: settings.logoUrl });
              }
              if (settings.name && data.clientName) {
                document.title = `${data.clientName}'s Fitness Report | ${settings.name}`;
              }
            })
            .catch((orgErr) => {
              logger.warn('[usePublicReport] Failed to fetch organization branding:', orgErr);
            });
        }

        generateCoachPlan(fd, s)
          .then((result) => setPlan(result))
          .catch((e) => logger.error('Error generating coach plan:', e));
      },
    );

    return () => unsubscribe();
  }, [token]);

  const clientName = formData?.fullName ?? 'Client';

  return {
    formData,
    scores,
    previousFormData,
    previousScores,
    snapshotSummaries,
    orgDetails,
    plan,
    error,
    loading,
    clientName,
    changeNarrative,
  };
}
