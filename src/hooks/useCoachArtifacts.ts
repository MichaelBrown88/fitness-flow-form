import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import { logger } from '@/lib/utils/logger';

const SHAREABLES_LIMIT = 20;

export type CoachArtifactRow = {
  token: string;
  clientName: string;
  assessmentId: string;
  updatedAt: Date | null;
  revoked: boolean;
};

/** `publicRoadmaps` mirror doc (doc id = share token). */
export type CoachRoadmapShareRow = {
  token: string;
  clientName: string;
  updatedAt: Date | null;
};

/** Same token as a shared report; public achievements viewer at `/r/:token/achievements`. */
export type CoachAchievementShareRow = {
  token: string;
  clientName: string;
  updatedAt: Date | null;
};

export type CoachShareablePreview =
  | { kind: 'report'; report: CoachArtifactRow }
  | { kind: 'roadmap'; row: CoachRoadmapShareRow }
  | { kind: 'achievements'; row: CoachAchievementShareRow };

export function useCoachArtifacts(coachUid: string | undefined, organizationId: string | undefined) {
  const [reportRows, setReportRows] = useState<CoachArtifactRow[]>([]);
  const [roadmapRows, setRoadmapRows] = useState<CoachRoadmapShareRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const achievementRows: CoachAchievementShareRow[] = useMemo(
    () =>
      reportRows
        .filter((r) => !r.revoked)
        .map((r) => ({
          token: r.token,
          clientName: r.clientName,
          updatedAt: r.updatedAt,
        })),
    [reportRows],
  );

  const refresh = useCallback(async () => {
    if (!coachUid) {
      setReportRows([]);
      setRoadmapRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const db = getDb();

      const [reportSnap, roadmapSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, COLLECTIONS.PUBLIC_REPORTS),
            where('coachUid', '==', coachUid),
            limit(SHAREABLES_LIMIT),
          ),
        ),
        getDocs(
          query(
            collection(db, COLLECTIONS.PUBLIC_ROADMAPS),
            where('coachUid', '==', coachUid),
            limit(SHAREABLES_LIMIT),
          ),
        ),
      ]);

      const reports: CoachArtifactRow[] = [];
      reportSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const docOrg = data.organizationId as string | undefined;
        if (organizationId && docOrg && docOrg !== organizationId) return;
        const updatedAt = data.updatedAt as Timestamp | undefined;
        reports.push({
          token: docSnap.id,
          clientName: typeof data.clientName === 'string' ? data.clientName : 'Client',
          assessmentId: typeof data.assessmentId === 'string' ? data.assessmentId : '',
          updatedAt: updatedAt?.toDate?.() ?? null,
          revoked: data.revoked === true,
        });
      });
      reports.sort((a, b) => {
        const ta = a.updatedAt?.getTime() ?? 0;
        const tb = b.updatedAt?.getTime() ?? 0;
        return tb - ta;
      });
      setReportRows(reports.slice(0, SHAREABLES_LIMIT));

      const roadmaps: CoachRoadmapShareRow[] = [];
      roadmapSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const docOrg = data.organizationId as string | undefined;
        if (organizationId && docOrg && docOrg !== organizationId) return;
        const updatedAt = data.updatedAt as Timestamp | undefined;
        roadmaps.push({
          token: docSnap.id,
          clientName: typeof data.clientName === 'string' ? data.clientName : 'Client',
          updatedAt: updatedAt?.toDate?.() ?? null,
        });
      });
      roadmaps.sort((a, b) => {
        const ta = a.updatedAt?.getTime() ?? 0;
        const tb = b.updatedAt?.getTime() ?? 0;
        return tb - ta;
      });
      setRoadmapRows(roadmaps.slice(0, SHAREABLES_LIMIT));
    } catch (e) {
      logger.error('[useCoachArtifacts] load failed', e);
      setError('load_failed');
      setReportRows([]);
      setRoadmapRows([]);
    } finally {
      setLoading(false);
    }
  }, [coachUid, organizationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** @deprecated Use `reportRows` — kept for quick refactors. */
  const rows = reportRows;

  return {
    reportRows,
    roadmapRows,
    achievementRows,
    rows,
    loading,
    error,
    refresh,
  };
}
