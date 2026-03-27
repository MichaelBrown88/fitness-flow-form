import type { PhaseId } from '@/lib/phases/types';

/** All coach-assessment phases in default full-assessment order */
export const DEFAULT_FULL_PHASE_IDS: PhaseId[] = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

/**
 * Scope of a single assessment run. When absent on persisted FormData, treat as full legacy plan.
 */
export interface AssessmentPlan {
  includedPhaseIds: PhaseId[];
  /** Analytics / future full-profile eligibility */
  templateId?: string;
  /** Phases completable by client via remote link (P5+) */
  clientCompletablePhaseIds?: PhaseId[];
}

export function isAssessmentPlanFullCoverage(plan: AssessmentPlan | null | undefined): boolean {
  if (!plan?.includedPhaseIds?.length) {
    return true;
  }
  return DEFAULT_FULL_PHASE_IDS.every((id) => plan.includedPhaseIds.includes(id));
}

/** Preset templates → phase ids (after org module filtering, navigation still respects this subset). */
export const SESSION_FOCUS_TEMPLATES = {
  full: { templateId: 'full_holistic', phaseIds: [...DEFAULT_FULL_PHASE_IDS] as PhaseId[] },
  lifestyle: { templateId: 'lifestyle', phaseIds: ['P0', 'P1', 'P7'] as PhaseId[] },
  body_comp: { templateId: 'body_comp', phaseIds: ['P0', 'P2', 'P7'] as PhaseId[] },
  cardio: { templateId: 'cardio', phaseIds: ['P0', 'P3', 'P7'] as PhaseId[] },
  strength: { templateId: 'strength', phaseIds: ['P0', 'P5', 'P7'] as PhaseId[] },
  movement: { templateId: 'movement_posture', phaseIds: ['P0', 'P4', 'P7'] as PhaseId[] },
} as const;

export type SessionFocusTemplateKey = keyof typeof SESSION_FOCUS_TEMPLATES;

export function sortPhaseIds(ids: PhaseId[]): PhaseId[] {
  const order = DEFAULT_FULL_PHASE_IDS;
  return [...new Set(ids)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export type SessionFocusToggles = {
  lifestyle: boolean;
  bodyComp: boolean;
  cardio: boolean;
  strength: boolean;
  movement: boolean;
};

/** P0 + P7 plus any toggled middle phases, in canonical order */
export function buildPlanFromFocusToggles(toggles: SessionFocusToggles): AssessmentPlan {
  const mids: PhaseId[] = [];
  if (toggles.lifestyle) mids.push('P1');
  if (toggles.bodyComp) mids.push('P2');
  if (toggles.cardio) mids.push('P3');
  if (toggles.movement) mids.push('P4');
  if (toggles.strength) mids.push('P5');
  return {
    templateId: 'custom',
    includedPhaseIds: sortPhaseIds(['P0', ...mids, 'P7']),
  };
}

export function planFromTemplateKey(key: SessionFocusTemplateKey): AssessmentPlan {
  const t = SESSION_FOCUS_TEMPLATES[key];
  return { templateId: t.templateId, includedPhaseIds: [...t.phaseIds] };
}
