/**
 * Client List Hook
 *
 * Client grouping and filtering logic for dashboard.
 */

import { useMemo } from 'react';
import type { CoachAssessmentSummary } from '@/services/coachAssessments';
import type { ClientGroup } from './types';

export function useClientList(items: CoachAssessmentSummary[], search: string) {
  const clientGroups = useMemo(() => {
    const groups = new Map<string, CoachAssessmentSummary[]>();
    items.forEach(item => {
      const existing = groups.get(item.clientName) || [];
      groups.set(item.clientName, [...existing, item]);
    });

    const result: ClientGroup[] = Array.from(groups.entries()).map(([name, assessments]) => {
      const sorted = assessments.sort((a, b) => {
        const dateA = a.createdAt?.toDate().getTime() || 0;
        const dateB = b.createdAt?.toDate().getTime() || 0;
        return dateB - dateA;
      });
      const latest = sorted[0];
      const previous = sorted[1];

      return {
        name,
        assessments: sorted,
        latestScore: latest.overallScore || 0,
        latestDate: latest.createdAt?.toDate() || null,
        scoreChange: previous ? (latest.overallScore || 0) - (previous.overallScore || 0) : undefined,
      };
    });

    return result.sort((a, b) => {
      const dateA = a.latestDate?.getTime() || 0;
      const dateB = b.latestDate?.getTime() || 0;
      return dateB - dateA;
    });
  }, [items]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clientGroups;
    return clientGroups.filter((group) => group.name.toLowerCase().includes(term));
  }, [clientGroups, search]);

  return { clientGroups, filteredClients };
}
