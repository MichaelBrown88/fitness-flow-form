import { FileText, Map, Trophy, type LucideIcon } from 'lucide-react';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import type {
  CoachAchievementShareRow,
  CoachArtifactRow,
  CoachRoadmapShareRow,
} from '@/hooks/useCoachArtifacts';

export type ShareableKind = 'report' | 'roadmap' | 'achievements';

export type ArtifactsGridItem = {
  key: string;
  kind: ShareableKind;
  clientName: string;
  updatedAt: Date | null;
  report?: CoachArtifactRow;
  roadmap?: CoachRoadmapShareRow;
  achievement?: CoachAchievementShareRow;
};

export function buildArtifactsGridItems(
  reports: CoachArtifactRow[],
  roadmaps: CoachRoadmapShareRow[],
  achievements: CoachAchievementShareRow[],
): ArtifactsGridItem[] {
  const out: ArtifactsGridItem[] = [];
  for (const r of reports) {
    if (r.revoked) continue;
    out.push({
      key: `report-${r.token}`,
      kind: 'report',
      clientName: r.clientName,
      updatedAt: r.updatedAt,
      report: r,
    });
  }
  for (const r of roadmaps) {
    out.push({
      key: `roadmap-${r.token}`,
      kind: 'roadmap',
      clientName: r.clientName,
      updatedAt: r.updatedAt,
      roadmap: r,
    });
  }
  for (const r of achievements) {
    out.push({
      key: `ach-${r.token}`,
      kind: 'achievements',
      clientName: r.clientName,
      updatedAt: r.updatedAt,
      achievement: r,
    });
  }
  out.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
  return out;
}

export const ARTIFACTS_KIND_META: Record<
  ShareableKind,
  { label: string; Icon: LucideIcon; previewAreaClass: string }
> = {
  report: {
    label: COACH_ASSISTANT_COPY.SIDEBAR_CATEGORY_REPORTS,
    Icon: FileText,
    previewAreaClass: 'from-muted/40 to-muted/15',
  },
  roadmap: {
    label: COACH_ASSISTANT_COPY.SIDEBAR_CATEGORY_ROADMAPS,
    Icon: Map,
    previewAreaClass: 'from-primary/10 to-muted/20',
  },
  achievements: {
    label: COACH_ASSISTANT_COPY.SIDEBAR_CATEGORY_ACHIEVEMENTS,
    Icon: Trophy,
    previewAreaClass: 'from-score-amber-muted/50 to-muted/20',
  },
};

export type ArtifactsFilter = 'all' | ShareableKind;

export const ARTIFACTS_FILTER_CHIPS: { id: ArtifactsFilter; label: string }[] = [
  { id: 'all', label: COACH_ASSISTANT_COPY.ARTIFACTS_FILTER_ALL },
  { id: 'report', label: COACH_ASSISTANT_COPY.ARTIFACTS_FILTER_REPORTS },
  { id: 'roadmap', label: COACH_ASSISTANT_COPY.ARTIFACTS_FILTER_ROADMAPS },
  { id: 'achievements', label: COACH_ASSISTANT_COPY.ARTIFACTS_FILTER_ACHIEVEMENTS },
];
