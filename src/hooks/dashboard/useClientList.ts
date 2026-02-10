/**
 * Client List Hook
 *
 * With the upsert model, each assessment summary IS a unique client.
 * This hook maps them to ClientGroup format and enriches each group
 * with retestSchedule data fetched from client profiles.
 */

import { useMemo, useEffect, useState } from 'react';
import type { CoachAssessmentSummary } from '@/services/coachAssessments';
import type { ClientScheduleData } from '@/services/clientProfiles';
import type { ClientGroup } from './types';
import { logger } from '@/lib/utils/logger';

type ScheduleMap = Map<string, ClientScheduleData>;

export function useClientList(
  items: CoachAssessmentSummary[],
  search: string,
  organizationId?: string,
) {
  // Fetch client schedules; bump version to trigger refetch after edits
  const [scheduleMap, setScheduleMap] = useState<ScheduleMap>(new Map());
  const [scheduleVersion, setScheduleVersion] = useState(0);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const { listClientSchedules } = await import('@/services/clientProfiles');
        const map = await listClientSchedules(organizationId);
        if (!cancelled) setScheduleMap(map);
      } catch (err) {
        logger.warn('[useClientList] Failed to load client schedules:', err);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [organizationId, scheduleVersion]);

  const clientGroups = useMemo(() => {
    // Deduplicate by clientName (keep the latest summary per client)
    const byName = new Map<string, CoachAssessmentSummary>();
    for (const item of items) {
      const key = item.clientName.toLowerCase();
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, item);
      } else {
        const existingTime = existing.createdAt?.toDate()?.getTime() || 0;
        const itemTime = item.createdAt?.toDate()?.getTime() || 0;
        if (itemTime > existingTime) {
          byName.set(key, item);
        }
      }
    }

    const result: ClientGroup[] = Array.from(byName.values()).map((item) => {
      const schedule = scheduleMap.get(item.clientName.toLowerCase());

      return {
        id: item.id,
        name: item.clientName,
        assessments: [item],
        latestScore: item.overallScore || 0,
        latestDate: item.createdAt?.toDate() || null,
        scoreChange: item.trend,
        coachUid: item.coachUid,
        retestSchedule: schedule?.recommended || schedule?.custom
          ? { recommended: schedule!.recommended!, custom: schedule?.custom }
          : undefined,
        dueDateOverrides: schedule?.dueDateOverrides,
      };
    });

    return result.sort((a, b) => {
      const dateA = a.latestDate?.getTime() || 0;
      const dateB = b.latestDate?.getTime() || 0;
      return dateB - dateA;
    });
  }, [items, scheduleMap]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clientGroups;
    return clientGroups.filter((group) => group.name.toLowerCase().includes(term));
  }, [clientGroups, search]);

  /** Call after saving a custom cadence to refetch schedules from Firestore */
  const refreshSchedules = () => setScheduleVersion(v => v + 1);

  return { clientGroups, filteredClients, refreshSchedules };
}
