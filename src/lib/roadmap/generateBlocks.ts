import type { ScoreSummary, ScoreCategory } from '@/lib/scoring/types';
import type { FormData } from '@/contexts/FormContext';
import { MOVEMENT_LOGIC_DB } from '@/lib/clinical-data';
import type { RoadmapBlock, RoadmapCategory, BlockUrgency, RoadmapPhase } from './types';
import { resolveTrackables } from './trackableMapping';

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
): RoadmapBlock[] {
  const blocks: RoadmapBlock[] = [];
  const headPos = Array.isArray(formData?.postureHeadOverall) ? formData.postureHeadOverall : [formData?.postureHeadOverall];
  const shoulderPos = Array.isArray(formData?.postureShouldersOverall) ? formData.postureShouldersOverall : [formData?.postureShouldersOverall];
  const hipPos = Array.isArray(formData?.postureHipsOverall) ? formData.postureHipsOverall : [formData?.postureHipsOverall];
  const hasPain = formData?.ohsHasPain === 'yes' || formData?.hingeHasPain === 'yes' || formData?.lungeHasPain === 'yes';

  const postureDetail = cat.details.find((d) => d.id === 'posture');
  const movementDetail = cat.details.find((d) => d.id === 'movement');
  const mobilityDetail = cat.details.find((d) => d.id === 'mobility');

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

  const deviations = [
    { key: 'upper_crossed', condition: headPos.includes('forward-head') || shoulderPos.includes('rounded') },
    { key: 'lower_crossed', condition: hipPos.includes('anterior-tilt') || formData?.ohsTorsoLean === 'excessive-lean' },
    { key: 'knee_valgus', condition: formData?.ohsKneeAlignment === 'valgus' || formData?.lungeLeftKneeAlignment === 'caves-inward' || formData?.lungeRightKneeAlignment === 'caves-inward' },
    { key: 'posterior_pelvic_tilt', condition: hipPos.includes('posterior-tilt') || formData?.hingeBackRounding === 'severe' },
    { key: 'feet_pronation', condition: formData?.ohsFeetPosition === 'pronation' },
  ];

  for (const { key, condition } of deviations) {
    if (!condition) continue;
    const dev = MOVEMENT_LOGIC_DB[key];
    if (!dev) continue;

    const { urgency, blocksGoal } = classifyUrgency(
      postureDetail?.score ?? cat.score, 'movementQuality', goals,
      dev.contraindications.length > 0, false,
    );

    blocks.push({
      id: `mq-${key}`,
      title: `Correct ${dev.name}`,
      description: dev.visualTrigger,
      category: 'movementQuality',
      phase: phaseFromUrgency(urgency),
      targetWeeks: weeksFromScore(postureDetail?.score ?? cat.score),
      urgency,
      blocksGoal,
      finding: `${dev.name} detected — ${dev.visualTrigger.toLowerCase()}. Posture scored ${postureDetail?.score ?? cat.score}/100.`,
      rationale: blocksGoal
        ? `This postural deviation must be addressed before heavy loading. Overactive: ${dev.overactiveMuscles.join(', ')}. Underactive: ${dev.underactiveMuscles.join(', ')}.`
        : `Correcting this will improve overall movement quality and reduce injury risk. Overactive: ${dev.overactiveMuscles.join(', ')}.`,
      action: `Primary stretch: ${dev.primaryStretch}. Primary activation: ${dev.primaryActivation}. Progressive corrective exercise programme.`,
      contraindications: dev.contraindications,
      score: postureDetail?.score ?? cat.score,
      icon: 'Move',
    });
  }

  if (mobilityDetail && mobilityDetail.score > 0 && mobilityDetail.score < 70) {
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
    });
  }

  if (movementDetail && movementDetail.score > 0 && movementDetail.score < 65 && blocks.length === 0) {
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
    });
  }

  return blocks;
}

function buildCategoryBlock(
  cat: ScoreCategory,
  goals: string[],
  synthesisSeverity?: 'high' | 'medium' | 'low',
): RoadmapBlock | null {
  if (cat.score === 0) return null;
  if (cat.score >= 80) return null;

  const { urgency, blocksGoal } = classifyUrgency(cat.score, cat.id as RoadmapCategory, goals, false, false, synthesisSeverity);

  const weakTop = cat.weaknesses.slice(0, 2).join('. ');
  const strengthNote = cat.strengths.length > 0 ? ` Strength: ${cat.strengths[0]}.` : '';

  const CATEGORY_CONFIG: Record<string, { title: string; icon: string; actionPrefix: string }> = {
    bodyComp: { title: 'Improve Body Composition', icon: 'Scale', actionPrefix: 'Structured nutrition and training programme' },
    cardio: { title: 'Build Cardiovascular Fitness', icon: 'Activity', actionPrefix: 'Progressive aerobic conditioning' },
    strength: { title: 'Build Functional Strength', icon: 'Dumbbell', actionPrefix: 'Progressive resistance training' },
    lifestyle: { title: 'Optimise Lifestyle Factors', icon: 'Heart', actionPrefix: 'Targeted lifestyle interventions' },
  };

  const config = CATEGORY_CONFIG[cat.id];
  if (!config) return null;

  const lowestDetail = [...cat.details].filter((d) => d.score > 0).sort((a, b) => a.score - b.score)[0];
  const detailNote = lowestDetail ? ` Lowest sub-score: ${lowestDetail.label} at ${lowestDetail.score}/100.` : '';

  return {
    id: `cat-${cat.id}`,
    title: config.title,
    description: weakTop || cat.title,
    category: cat.id as RoadmapCategory,
    phase: phaseFromUrgency(urgency),
    targetWeeks: weeksFromScore(cat.score),
    urgency,
    blocksGoal,
    finding: `${cat.title} scored ${cat.score}/100.${detailNote}${strengthNote}`,
    rationale: blocksGoal
      ? `This is directly tied to your goals and needs focused attention to make meaningful progress.`
      : `Improving ${cat.title.toLowerCase()} will support overall health and complement your primary goals.`,
    action: `${config.actionPrefix} targeting ${cat.weaknesses[0]?.toLowerCase() || 'key areas identified in the assessment'}.`,
    contraindications: cat.contraindications ?? [],
    score: cat.score,
    icon: config.icon,
  };
}

function buildLifestyleSubBlocks(cat: ScoreCategory, goals: string[]): RoadmapBlock[] {
  const blocks: RoadmapBlock[] = [];
  const SUB_CONFIG: Record<string, { title: string; action: string }> = {
    sleep: { title: 'Optimise Sleep Quality', action: 'Implement sleep hygiene protocols — consistent schedule, light management, and pre-bed routine — targeting 7-9 hours of quality sleep.' },
    stress: { title: 'Manage Stress Levels', action: 'Introduce daily stress management practices — breathwork, mindfulness, or active relaxation — to reduce cortisol-driven barriers to progress.' },
    nutrition: { title: 'Improve Nutritional Consistency', action: 'Build sustainable eating habits with appropriate macro distribution, meal timing, and hydration targets aligned to training goals.' },
    activity: { title: 'Increase Daily Activity', action: 'Raise daily movement through step targets, standing desk use, and movement breaks to improve baseline metabolic health.' },
  };

  for (const detail of cat.details) {
    if (detail.score === 0 || detail.score >= 70) continue;
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
    const movementBlocks = buildMovementBlocks(movement, goals, formData);
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
      const subBlocks = buildLifestyleSubBlocks(cat, goals);
      if (subBlocks.length > 0) {
        subBlocks.forEach(add);
        continue;
      }
    }

    const block = buildCategoryBlock(cat, goals, synthSeverityMap.get(cat.id));
    if (block) add(block);
  }

  const urgencyOrder: Record<BlockUrgency, number> = { critical: 0, prerequisite: 1, parallel: 2, optional: 3 };
  blocks.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  for (const block of blocks) {
    block.trackables = resolveTrackables(block, scores);
  }

  return blocks;
}
