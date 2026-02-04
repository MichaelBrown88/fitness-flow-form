/**
 * Scoring Module
 *
 * This file re-exports the refactored scoring module for backwards compatibility.
 * The actual implementation has been split into smaller, focused modules in ./scoring/
 */

export type {
  ScoreDetail,
  ScoreCategory,
  ScoreSummary,
  RoadmapPhase,
} from './scoring/types';

export {
  clamp,
  lookupNormativeScore,
  calculateAge,
} from './scoring/scoringUtils';

export { scoreBodyComp } from './scoring/bodyCompositionScoring';
export { scoreCardio } from './scoring/cardioScoring';
export { scoreStrength } from './scoring/strengthScoring';
export { scoreMovementQuality } from './scoring/movementQualityScoring';
export { scoreLifestyle } from './scoring/lifestyleScoring';

export { generateSynthesis } from './scoring/synthesisGenerator';
export { buildRoadmap } from './scoring/roadmapBuilder';

export { computeScores, summarizeScores } from './scoring/computeScores';
