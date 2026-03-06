import type { ScoreSummary, ScoreCategory } from '@/lib/scoring/types';
import type { FormData } from '@/contexts/FormContext';
import type { RoadmapBlock, RoadmapCategory, BlockUrgency, RoadmapPhase } from './types';
import { resolveTrackables } from './trackableMapping';
import { MOVEMENT_FINDING_DETAILS, CATEGORY_DETAIL_CONFIG } from './findingDetails';

const CATEGORY_ICONS: Record<string, string> = {
  bodyComp: 'Scale',
  cardio: 'Activity',
  strength: 'Dumbbell',
  lifestyle: 'Heart',
};

const LOADING_GOALS = new Set(['build-muscle', 'build-strength', 'sport-performance']);

const GOAL_CATEGORY_MAP: Record<string, RoadmapCategory[]> = {
  'weight-loss': ['bodyComp', 'cardio', 'lifestyle'],
  'build-muscle': ['strength', 'bodyComp'],
  'build-strength': ['strength', 'movementQuality'],
  'body-recomposition': ['bodyComp', 'strength', 'lifestyle'],
  'improve-fitness': ['cardio', 'lifestyle'],
  'improve-mobility': ['movementQuality'],
  'improve-posture': ['movementQuality'],
  'reduce-stress': ['lifestyle'],
  'general-health': ['cardio', 'lifestyle', 'strength'],
  'sport-performance': ['cardio', 'strength', 'movementQuality'],
  'rehabilitation': ['movementQuality', 'cardio'],
};

function isGoalAligned(category: RoadmapCategory, goals: string[]): boolean {
  return goals.some((g) => (GOAL_CATEGORY_MAP[g] ?? []).includes(category));
}

function requiresLoading(goals: string[]): boolean {
  return goals.some((g) => LOADING_GOALS.has(g));
}

function classifyUrgency(
  score: number,
  category: RoadmapCategory,
  goals: string[],
  hasContraindications: boolean,
  hasPain: boolean,
  synthesisSeverity?: 'high' | 'medium' | 'low',
): { urgency: BlockUrgency; blocksGoal: boolean } {
  if (hasPain) return { urgency: 'critical', blocksGoal: true };
  if (synthesisSeverity === 'high') return { urgency: 'critical', blocksGoal: true };
  if (hasContraindications && requiresLoading(goals)) return { urgency: 'critical', blocksGoal: true };
  if (score < 40 && isGoalAligned(category, goals)) return { urgency: 'prerequisite', blocksGoal: true };
  if (synthesisSeverity === 'medium') return { urgency: 'prerequisite', blocksGoal: false };
  if (score < 60 && isGoalAligned(category, goals)) return { urgency: 'parallel', blocksGoal: false };
  if (score < 70 && !isGoalAligned(category, goals)) return { urgency: 'optional', blocksGoal: false };
  if (score < 70) return { urgency: 'parallel', blocksGoal: false };
  return { urgency: 'optional', blocksGoal: false };
}

function phaseFromUrgency(urgency: BlockUrgency): RoadmapPhase {
  if (urgency === 'critical' || urgency === 'prerequisite') return 'foundation';
  if (urgency === 'parallel') return 'development';
  return 'performance';
}

function weeksFromScore(score: number): number {
  if (score < 30) return 12;
  if (score < 50) return 10;
  if (score < 65) return 8;
  return 6;
}

function buildMovementBlocks(
  cat: ScoreCategory,
  goals: string[],
  formData: FormData,
  includeAllMetrics?: boolean,
): RoadmapBlock[] {
  const blocks: RoadmapBlock[] = [];
  const formSlice = {
    postureHeadOverall: formData?.postureHeadOverall,
    postureShouldersOverall: formData?.postureShouldersOverall,
    postureHipsOverall: formData?.postureHipsOverall,
    ohsTorsoLean: formData?.ohsTorsoLean,
    ohsKneeAlignment: formData?.ohsKneeAlignment,
    lungeLeftKneeAlignment: formData?.lungeLeftKneeAlignment,
    lungeRightKneeAlignment: formData?.lungeRightKneeAlignment,
    hingeBackRounding: formData?.hingeBackRounding,
    ohsFeetPosition: formData?.ohsFeetPosition,
    ohsHasPain: formData?.ohsHasPain,
    hingeHasPain: formData?.hingeHasPain,
    lungeHasPain: formData?.lungeHasPain,
  };
  const hasPain = formData?.ohsHasPain === 'yes' || formData?.hingeHasPain === 'yes' || formData?.lungeHasPain === 'yes';

  if (hasPain) {
    blocks.push({
      id: 'mq-pain',
      title: 'Address Movement Pain',
      description: 'Pain was reported during movement assessment patterns.',
      category: 'movementQuality',
      phase: 'foundation',
      targetWeeks: 8,
      urgency: 'critical',
      blocksGoal: true,
      finding: `Pain was reported during movement screening. ${formData?.ohsHasPain === 'yes' ? 'Overhead squat pattern is painful. ' : ''}${formData?.hingeHasPain === 'yes' ? 'Hip hinge pattern is painful. ' : ''}${formData?.lungeHasPain === 'yes' ? 'Lunge pattern is painful. ' : ''}`.trim(),
      rationale: 'Loading through painful patterns risks injury and will prevent progress toward any training goal. This must be resolved first.',
      action: 'Referral for clinical assessment if needed, followed by pain-free movement alternatives and graduated return to full patterns.',
      contraindications: ['Loaded movement in painful patterns'],
      score: 0,
      icon: 'AlertTriangle',
    });
  }

  for (const f of MOVEMENT_FINDING_DETAILS) {
    if (!f.condition(formSlice)) continue;
    const detail = cat.details.find((d) => d.id === f.scoreDetailId);
    const score = detail?.score ?? cat.score;
    const { urgency, blocksGoal } = classifyUrgency(
      score,
      'movementQuality',
      goals,
      f.contraindications.length > 0,
      false,
    );
    blocks.push({
      id: f.id,
      title: f.title,
      description: f.visualTrigger,
      category: 'movementQuality',
      phase: phaseFromUrgency(urgency),
      targetWeeks: weeksFromScore(score),
      urgency,
      blocksGoal,
      finding: `${f.title} — ${f.visualTrigger.toLowerCase()}. ${f.scoreDetailId} scored ${score}/100.`,
      rationale: blocksGoal
        ? `Address before heavy loading. Overactive: ${f.overactiveMuscles.join(', ')}. Underactive: ${f.underactiveMuscles.join(', ')}.`
        : `Correcting this will improve movement quality. Overactive: ${f.overactiveMuscles.join(', ')}.`,
      action: `Primary stretch: ${f.primaryStretch}. Primary activation: ${f.primaryActivation}. Progressive corrective programme.`,
      contraindications: f.contraindications,
      score,
      icon: 'Move',
      scoreDetailId: f.scoreDetailId,
      scoreCategoryId: 'movementQuality',
    });
  }

  const mobilityDetail = cat.details.find((d) => d.id === 'mobility');
  if (mobilityDetail && mobilityDetail.score > 0 && (includeAllMetrics || mobilityDetail.score < 80)) {
    const { urgency, blocksGoal } = classifyUrgency(mobilityDetail.score, 'movementQuality', goals, false, false);
    blocks.push({
      id: 'mq-mobility',
      title: 'Improve Joint Mobility',
      description: 'Structured mobility routine to improve range of motion.',
      category: 'movementQuality',
      phase: phaseFromUrgency(urgency),
      targetWeeks: weeksFromScore(mobilityDetail.score),
      urgency,
      blocksGoal,
      finding: `Joint mobility scored ${mobilityDetail.score}/100. Limited range of motion was identified across key joints.`,
      rationale: 'Improving ankle, hip, and shoulder mobility will unlock better movement patterns and reduce compensation during training.',
      action: 'Daily mobility routine targeting ankle dorsiflexion, thoracic rotation, and hip flexion with progressive holds.',
      contraindications: [],
      score: mobilityDetail.score,
      icon: 'Move',
      scoreDetailId: 'mobility',
      scoreCategoryId: 'movementQuality',
    });
  }

  const movementDetail = cat.details.find((d) => d.id === 'movement');
  if (movementDetail && movementDetail.score > 0 && (includeAllMetrics || movementDetail.score < 80)) {
    const { urgency, blocksGoal } = classifyUrgency(movementDetail.score, 'movementQuality', goals, false, false);
    blocks.push({
      id: 'mq-patterns',
      title: 'Improve Movement Patterns',
      description: 'Compensations detected during movement screening.',
      category: 'movementQuality',
      phase: phaseFromUrgency(urgency),
      targetWeeks: weeksFromScore(movementDetail.score),
      urgency,
      blocksGoal,
      finding: `Movement pattern quality scored ${movementDetail.score}/100. Compensations were observed during squat, hinge, and/or lunge patterns.`,
      rationale: 'Clean movement patterns are the foundation of safe, effective training. These need refining before progressive loading.',
      action: 'Targeted movement drills focusing on squat depth, hinge mechanics, and lunge stability with bodyweight and light loads.',
      contraindications: cat.contraindications ?? [],
      score: movementDetail.score,
      icon: 'Move',
      scoreDetailId: 'movement',
      scoreCategoryId: 'movementQuality',
    });
  }

  return blocks;
}

function buildCategoryDetailBlocks(
  cat: ScoreCategory,
  goals: string[],
  synthesisSeverity?: 'high' | 'medium' | 'low',
  includeAllMetrics?: boolean,
): RoadmapBlock[] {
  const configs = CATEGORY_DETAIL_CONFIG[cat.id];
  if (!configs) return [];
  const blocks: RoadmapBlock[] = [];
  for (const detail of cat.details) {
    if (detail.score === 0) continue;
    if (!includeAllMetrics && detail.score >= 80) continue;
    const config = configs.find((c) => c.id === detail.id);
    if (!config) continue;
    const { urgency, blocksGoal } = classifyUrgency(
      detail.score,
      cat.id as RoadmapCategory,
      goals,
      false,
      false,
      synthesisSeverity,
    );
    blocks.push({
      id: `cat-${cat.id}-${detail.id}`,
      title: config.title,
      description: `${detail.label} scored ${detail.score}/100.`,
      category: cat.id as RoadmapCategory,
      phase: phaseFromUrgency(urgency),
      targetWeeks: weeksFromScore(detail.score),
      urgency,
      blocksGoal,
      finding: `${detail.label} scored ${detail.score}/100${detail.unit ? ` (${detail.value} ${detail.unit})` : ''}.`,
      rationale: blocksGoal
        ? 'This is directly tied to your goals and needs focused attention.'
        : `Improving ${detail.label.toLowerCase()} will support overall health and complement your primary goals.`,
      action: config.action,
      contraindications: cat.contraindications ?? [],
      score: detail.score,
      icon: CATEGORY_ICONS[cat.id] ?? 'Target',
      scoreDetailId: detail.id,
      scoreCategoryId: cat.id,
    });
  }
  return blocks;
}

function buildLifestyleSubBlocks(cat: ScoreCategory, goals: string[], includeAllMetrics?: boolean): RoadmapBlock[] {
  const blocks: RoadmapBlock[] = [];
  const SUB_CONFIG: Record<string, { title: string; action: string }> = {
    sleep: { title: 'Optimise Sleep Quality', action: 'Implement sleep hygiene protocols — consistent schedule, light management, and pre-bed routine — targeting 7-9 hours of quality sleep.' },
    stress: { title: 'Manage Stress Levels', action: 'Introduce daily stress management practices — breathwork, mindfulness, or active relaxation — to reduce cortisol-driven barriers to progress.' },
    nutrition: { title: 'Improve Nutritional Consistency', action: 'Build sustainable eating habits with appropriate macro distribution, meal timing, and hydration targets aligned to training goals.' },
    activity: { title: 'Increase Daily Activity', action: 'Raise daily movement through step targets, standing desk use, and movement breaks to improve baseline metabolic health.' },
  };

  for (const detail of cat.details) {
    if (detail.score === 0) continue;
    if (!includeAllMetrics && detail.score >= 70) continue;
    const sub = SUB_CONFIG[detail.id];
    if (!sub) continue;

    const { urgency, blocksGoal } = classifyUrgency(detail.score, 'lifestyle', goals, false, false);
    blocks.push({
      id: `ls-${detail.id}`,
      title: sub.title,
      description: `${detail.label} scored ${detail.score}/100.`,
      category: 'lifestyle',
      phase: phaseFromUrgency(urgency),
      targetWeeks: weeksFromScore(detail.score),
      urgency,
      blocksGoal,
      finding: `${detail.label} scored ${detail.score}/100 (${detail.value}).`,
      rationale: detail.score < 50
        ? `Poor ${detail.label.toLowerCase()} is blunting your body's ability to adapt to training. Addressing this will amplify all other progress.`
        : `Improving ${detail.label.toLowerCase()} will support recovery and enhance training outcomes.`,
      action: sub.action,
      contraindications: [],
      score: detail.score,
      icon: 'Heart',
      scoreDetailId: detail.id,
      scoreCategoryId: 'lifestyle',
    });
  }

  return blocks;
}

function buildSynthesisBlocks(synthesis: ScoreSummary['synthesis'], goals: string[]): RoadmapBlock[] {
  return synthesis
    .filter((s) => s.severity === 'high' || s.severity === 'medium')
    .map((s) => {
      const urgency: BlockUrgency = s.severity === 'high' ? 'critical' : 'prerequisite';
      return {
        id: `syn-${s.title.replace(/\s+/g, '-').toLowerCase().slice(0, 30)}`,
        title: s.title,
        description: s.description,
        category: 'general' as RoadmapCategory,
        phase: phaseFromUrgency(urgency),
        targetWeeks: s.severity === 'high' ? 10 : 8,
        urgency,
        blocksGoal: s.severity === 'high',
        finding: s.description,
        rationale: s.severity === 'high'
          ? 'This is a high-priority finding that affects your safety and ability to train effectively.'
          : 'This finding should be addressed early to avoid becoming a barrier to progress.',
        action: 'A targeted intervention strategy will be built around this finding as part of your programme design.',
        contraindications: [],
        score: 0,
        icon: s.severity === 'high' ? 'AlertTriangle' : 'Info',
      };
    });
}

export function generateRoadmapBlocks(
  scores: ScoreSummary,
  formData: FormData,
): RoadmapBlock[] {
  const goals = formData?.clientGoals ?? [];
  const blocks: RoadmapBlock[] = [];
  const seenIds = new Set<string>();

  const add = (block: RoadmapBlock) => {
    if (seenIds.has(block.id)) return;
    seenIds.add(block.id);
    blocks.push(block);
  };

  const synthBlocks = buildSynthesisBlocks(scores.synthesis, goals);
  synthBlocks.forEach(add);

  const movement = scores.categories.find((c) => c.id === 'movementQuality');
  if (movement) {
    const movementBlocks = buildMovementBlocks(movement, goals, formData, false);
    movementBlocks.forEach(add);
  }

  const synthSeverityMap = new Map<string, 'high' | 'medium' | 'low'>();
  for (const s of scores.synthesis) {
    for (const cat of scores.categories) {
      if (s.description.toLowerCase().includes(cat.title.toLowerCase())) {
        const existing = synthSeverityMap.get(cat.id);
        if (!existing || s.severity === 'high') synthSeverityMap.set(cat.id, s.severity);
      }
    }
  }

  for (const cat of scores.categories) {
    if (cat.id === 'movementQuality') continue;

    if (cat.id === 'lifestyle' && cat.score < 80) {
      buildLifestyleSubBlocks(cat, goals, false).forEach(add);
      continue;
    }

    if (cat.id === 'cardio' || cat.id === 'strength' || cat.id === 'bodyComp') {
      buildCategoryDetailBlocks(cat, goals, synthSeverityMap.get(cat.id), false).forEach(add);
    }
  }

  const urgencyOrder: Record<BlockUrgency, number> = { critical: 0, prerequisite: 1, parallel: 2, optional: 3 };
  blocks.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  for (const block of blocks) {
    block.trackables = resolveTrackables(block, scores);
  }

  return blocks;
}

/**
 * Returns every block that could apply to this client (all categories/details with data),
 * without filtering out "good" scores. Used as the full palette so the coach can add
 * any metric to the roadmap. Superset of generateRoadmapBlocks.
 */
export function getAllPossibleBlocksForClient(
  scores: ScoreSummary,
  formData: FormData,
): RoadmapBlock[] {
  const goals = formData?.clientGoals ?? [];
  const blocks: RoadmapBlock[] = [];
  const seenIds = new Set<string>();

  const add = (block: RoadmapBlock) => {
    if (seenIds.has(block.id)) return;
    seenIds.add(block.id);
    blocks.push(block);
  };

  const synthBlocks = buildSynthesisBlocks(scores.synthesis, goals);
  synthBlocks.forEach(add);

  const movement = scores.categories.find((c) => c.id === 'movementQuality');
  if (movement) {
    buildMovementBlocks(movement, goals, formData, true).forEach(add);
  }

  const synthSeverityMap = new Map<string, 'high' | 'medium' | 'low'>();
  for (const s of scores.synthesis) {
    for (const cat of scores.categories) {
      if (s.description.toLowerCase().includes(cat.title.toLowerCase())) {
        const existing = synthSeverityMap.get(cat.id);
        if (!existing || s.severity === 'high') synthSeverityMap.set(cat.id, s.severity);
      }
    }
  }

  for (const cat of scores.categories) {
    if (cat.id === 'movementQuality') continue;

    if (cat.id === 'lifestyle') {
      buildLifestyleSubBlocks(cat, goals, true).forEach(add);
      continue;
    }

    if (cat.id === 'cardio' || cat.id === 'strength' || cat.id === 'bodyComp') {
      buildCategoryDetailBlocks(cat, goals, synthSeverityMap.get(cat.id), true).forEach(add);
    }
  }

  const urgencyOrder: Record<BlockUrgency, number> = { critical: 0, prerequisite: 1, parallel: 2, optional: 3 };
  blocks.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  for (const block of blocks) {
    block.trackables = resolveTrackables(block, scores);
  }

  return blocks;
}
