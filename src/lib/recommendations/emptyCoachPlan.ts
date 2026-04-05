import type { CoachPlan } from './types';

/** Fallback coach plan when generation fails or before async load completes. */
export const EMPTY_COACH_PLAN: CoachPlan = {
  keyIssues: [],
  clientScript: {
    findings: [],
    whyItMatters: [],
    actionPlan: [],
    threeMonthOutlook: [],
    clientCommitment: [],
  },
  internalNotes: { doingWell: [], needsAttention: [] },
  programmingStrategies: [],
  movementBlocks: [],
  segmentalGuidance: [],
};
