import { phaseP2 } from '@/lib/phases/phaseP2';

const P2_BODY_COMPOSITION_FIELD_IDS = new Set(
  (phaseP2.sections ?? []).flatMap((section) => section.fields.map((f) => f.id as string)),
);

/** True when the form key belongs to phase P2 (body composition), used for partial-assessment field skipping. */
export function isBodyCompositionPhaseFieldId(key: string): boolean {
  return P2_BODY_COMPOSITION_FIELD_IDS.has(key);
}
