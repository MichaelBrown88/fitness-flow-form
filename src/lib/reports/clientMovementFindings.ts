/**
 * Structured movement-screen findings for the client AXIS report (compact, scannable).
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory } from '@/lib/scoring';
import { ASSESSMENT_LABELS, ASSESSMENT_OPTIONS } from '@/constants/assessment';

const P4_LABELS = ASSESSMENT_LABELS.P4 as Record<string, string>;

export type MovementFindingTone = 'good' | 'concern' | 'critical';

export interface ClientMovementFindingRow {
  label: string;
  value: string;
  tone: MovementFindingTone;
}

export interface ClientMovementFindingGroup {
  id: 'ohs' | 'hinge' | 'lunge';
  title: string;
  tone: MovementFindingTone;
  rows: ClientMovementFindingRow[];
}

export interface ClientMovementFindingsModel {
  groups: ClientMovementFindingGroup[];
  hasPostureScan: boolean;
}

type AssessmentOptionKey = keyof typeof ASSESSMENT_OPTIONS;

function optionLabel(field: AssessmentOptionKey, value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const options = ASSESSMENT_OPTIONS[field];
  if (!Array.isArray(options)) return null;
  const match = options.find((o) => o.value === value);
  return match?.label ?? value.replace(/-/g, ' ');
}

function isConcernValue(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.includes('fair') ||
    v.includes('limited') ||
    v.includes('compensated') ||
    v.includes('moderate') ||
    v.includes('excessive') ||
    v.includes('quarter') ||
    v.includes('minimal') ||
    v.includes('no-depth')
  );
}

function isCriticalValue(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.includes('poor') ||
    v.includes('severe') ||
    v.includes('valgus') ||
    v.includes('varus') ||
    v.includes('caves') ||
    v === 'yes' ||
    v.includes('high')
  );
}

function isGoodValue(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.includes('excellent') ||
    v.includes('good') ||
    v.includes('full') ||
    v.includes('stable') ||
    v.includes('upright') ||
    v.includes('tracks') ||
    v.includes('neutral') ||
    v === 'none' ||
    v === 'no'
  );
}

export function toneForMovementValue(value: string): MovementFindingTone {
  if (isCriticalValue(value)) return 'critical';
  if (isConcernValue(value)) return 'concern';
  if (isGoodValue(value)) return 'good';
  return 'concern';
}

function worstTone(tones: MovementFindingTone[]): MovementFindingTone {
  if (tones.some((t) => t === 'critical')) return 'critical';
  if (tones.some((t) => t === 'concern')) return 'concern';
  return 'good';
}

/** Form field paired with the ASSESSMENT_OPTIONS key that holds its labels
 *  (left/right lunge fields share the same option list). */
interface MovementFieldSpec {
  field: keyof FormData & string;
  optionKey: AssessmentOptionKey;
}

const MOVEMENT_OHS_FIELDS: MovementFieldSpec[] = [
  { field: 'ohsSquatDepth', optionKey: 'ohsSquatDepth' },
  { field: 'ohsTorsoLean', optionKey: 'ohsTorsoLean' },
  { field: 'ohsShoulderMobility', optionKey: 'ohsShoulderMobility' },
  { field: 'ohsKneeAlignment', optionKey: 'ohsKneeAlignment' },
  { field: 'ohsHipShift', optionKey: 'ohsHipShift' },
  { field: 'ohsFeetPosition', optionKey: 'ohsFeetPosition' },
];

const MOVEMENT_HINGE_FIELDS: MovementFieldSpec[] = [
  { field: 'hingeDepth', optionKey: 'hingeDepth' },
  { field: 'hingeBackRounding', optionKey: 'hingeBackRounding' },
];

const MOVEMENT_LUNGE_FIELDS: MovementFieldSpec[] = [
  { field: 'lungeLeftBalance', optionKey: 'lungeBalance' },
  { field: 'lungeRightBalance', optionKey: 'lungeBalance' },
  { field: 'lungeLeftKneeAlignment', optionKey: 'lungeKneeAlignment' },
  { field: 'lungeRightKneeAlignment', optionKey: 'lungeKneeAlignment' },
];

function buildGroup(
  id: ClientMovementFindingGroup['id'],
  title: string,
  fields: MovementFieldSpec[],
  formData: FormData,
): ClientMovementFindingGroup | null {
  const rows: ClientMovementFindingRow[] = [];
  for (const { field, optionKey } of fields) {
    const raw = formData[field];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const label = P4_LABELS[field] ?? field;
    const value = optionLabel(optionKey, raw);
    if (!value) continue;
    rows.push({
      label,
      value,
      tone: toneForMovementValue(raw),
    });
  }
  if (rows.length === 0) return null;
  return {
    id,
    title,
    tone: worstTone(rows.map((r) => r.tone)),
    rows,
  };
}

export function buildMovementFindings(
  formData: FormData | undefined,
  category: ScoreCategory | undefined,
): ClientMovementFindingsModel {
  if (!formData) {
    return { groups: [], hasPostureScan: false };
  }

  const groups: ClientMovementFindingGroup[] = [];
  const ohs = buildGroup('ohs', 'Overhead squat', MOVEMENT_OHS_FIELDS, formData);
  const hinge = buildGroup('hinge', 'Hip hinge', MOVEMENT_HINGE_FIELDS, formData);
  const lunge = buildGroup('lunge', 'Split squat / lunge', MOVEMENT_LUNGE_FIELDS, formData);
  if (ohs) groups.push(ohs);
  if (hinge) groups.push(hinge);
  if (lunge) groups.push(lunge);

  const hasPostureScan =
    Boolean(formData.postureAiResults) && Object.keys(formData.postureAiResults ?? {}).length > 0;

  if (groups.length === 0 && category) {
    const rows = (category.weaknesses ?? []).slice(0, 4).map((line) => ({
      label: 'Focus',
      value: line,
      tone: 'concern' as const,
    }));
    if (rows.length > 0) {
      groups.push({
        id: 'ohs',
        title: 'Focus areas',
        tone: worstTone(rows.map((r) => r.tone)),
        rows,
      });
    }
  }

  return { groups, hasPostureScan };
}
