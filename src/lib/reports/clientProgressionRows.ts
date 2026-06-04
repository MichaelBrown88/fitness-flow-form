import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import type { SectionId } from '@/components/reports/client/clientReportSections';
import {
  buildBodyCompProgressionRows,
  buildCardioProgressionRows,
  buildStrengthProgressionRows,
} from '@/lib/reports/clientProgressionProjections';

export interface ClientReportProgressionRow {
  name: string;
  unit?: string;
  current: string;
  fourMonths: string;
  oneYear: string;
}

export function buildClientProgressionRows(
  sectionId: SectionId,
  gapAnalysisData: GapAnalysisData[],
  formData: FormData | undefined,
  category: ScoreCategory | undefined,
  scores?: ScoreSummary,
  goals?: string[],
): ClientReportProgressionRow[] {
  const gapIndex =
    sectionId === 'body-comp' ? 0 : sectionId === 'strength' ? 1 : sectionId === 'cardio' ? 2 : -1;
  const gap = gapIndex >= 0 ? gapAnalysisData[gapIndex] : undefined;

  if (sectionId === 'body-comp') {
    const rows = buildBodyCompProgressionRows(formData, scores, goals, gap);
    if (rows.length > 0) return rows;
  }

  if (sectionId === 'strength') {
    const rows = buildStrengthProgressionRows(formData, goals, gap);
    if (rows.length > 0) return rows;
  }

  if (sectionId === 'cardio') {
    const rows = buildCardioProgressionRows(formData, scores, goals, gap);
    if (rows.length > 0) return rows;
  }

  return [];
}
