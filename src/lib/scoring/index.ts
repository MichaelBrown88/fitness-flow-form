// Types
export type { ScoreDetail, ScoreCategory, ScoreSummary, RoadmapPhase } from './types';

// Utilities
export { clamp, lookupNormativeScore, calculateAge } from './scoringUtils';

// Individual scoring modules
export { scoreBodyComp } from './bodyCompositionScoring';
export { scoreCardio } from './cardioScoring';
export { scoreStrength } from './strengthScoring';
export { scoreMovementQuality } from './movementQualityScoring';
export { scoreLifestyle } from './lifestyleScoring';

// Synthesis and roadmap
export { generateSynthesis } from './synthesisGenerator';
export { buildRoadmap } from './roadmapBuilder';

// Main orchestrator
export { computeScores, summarizeScores } from './computeScores';
