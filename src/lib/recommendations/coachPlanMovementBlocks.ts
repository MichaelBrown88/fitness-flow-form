import { MOVEMENT_LOGIC_DB } from '@/lib/clinical-data';
import { safeParse } from '@/lib/utils/numbers';
import type { CoachPlan } from './types';
import { EXERCISES } from './exercisePresets';
import type { CoachPlanNarrativeContext } from './coachPlanContext';
import { COACH_PLAN } from './coachPlanConstants';

type ClientScript = CoachPlan['clientScript'];
type InternalNotes = CoachPlan['internalNotes'];

export interface MovementBlocksResult {
  issues: string[];
  blocks: CoachPlan['movementBlocks'];
  segmentalGuidance: string[];
}

export function buildMovementBlocksAndIssues(
  ctx: CoachPlanNarrativeContext,
  clientScript: ClientScript,
  internalNotes: InternalNotes,
): MovementBlocksResult {
  const { form, scores, goals, hasAnyData, gender, bf, visceral, w, healthyMax } = ctx;
  const t = COACH_PLAN;

  const issues: string[] = [];
  const blocks: CoachPlan['movementBlocks'] = [];
  const segmentalGuidance: string[] = [];

  const headPos = ctx.headPos;
  const shoulderPos = ctx.shoulderPos;
  const backPos = ctx.backPos;
  const hipPos = ctx.hipPos;
  const kneePos = ctx.kneePos;

  const hasBodyCompData = ctx.hasBodyCompData;
  const hasMovementData = ctx.hasMovementData;
  const hasStrengthData = ctx.hasStrengthData;

  const bfMaleHigh = t.BODY_FAT_ABOVE_OPTIMAL_MALE;
  const bfFemaleHigh = t.BODY_FAT_ABOVE_OPTIMAL_FEMALE;

  if (
    hasBodyCompData &&
    ((gender === 'male' && bf > bfMaleHigh) ||
      (gender === 'female' && bf > bfFemaleHigh) ||
      (healthyMax > 0 && w > healthyMax + t.WEIGHT_OVER_HEALTHY_KG) ||
      visceral >= t.BODY_COMP_RISK_VISCERAL)
  ) {
    issues.push('Body composition priority (health risk)');
    blocks.unshift({
      title: 'Aerobic base for health',
      objectives: ['Improve HR recovery', 'Increase daily movement'],
      exercises: EXERCISES.cardioBase,
    });
  }

  const addBlock = (
    title: string,
    objectives: string[],
    exercises: (typeof EXERCISES)[keyof typeof EXERCISES],
  ) => {
    if (!blocks.find((b) => b.title === title)) {
      blocks.push({ title, objectives, exercises });
    }
  };

  goals.forEach((g) => {
    if (g === 'weight-loss') {
      issues.push('Primary goal: Weight loss');
      addBlock('Aerobic base for fat loss', ['Increase weekly calorie burn', 'Improve HR recovery'], EXERCISES.cardioBase);
    }
    if (g === 'build-muscle' || g === 'build-strength') {
      issues.push(g === 'build-muscle' ? 'Primary goal: Build muscle' : 'Primary goal: Build strength');
      addBlock(
        'Strength & hypertrophy base',
        ['Progressive overload', 'Compound movement proficiency'],
        EXERCISES.strengthBase,
      );
      addBlock('Core endurance', ['Increase stiffness & postural control'], EXERCISES.coreEndurance);
    }
    if (g === 'improve-fitness') {
      issues.push('Primary goal: Improve fitness');
      addBlock('Aerobic base', ['Build aerobic capacity', 'Improve HR recovery'], EXERCISES.cardioBase);
    }
    if (g === 'general-health') {
      issues.push('Primary goal: General health');
      addBlock('Daily posture hygiene', ['Reduce prolonged flexion', 'Reinforce neutral alignment'], EXERCISES.posture);
      addBlock('Aerobic base', ['2–3x/week cardio', 'Promote active lifestyle'], EXERCISES.cardioBase);
    }
  });

  const movementFindings = new Set<string>();

  if (headPos.includes('forward-head')) movementFindings.add('upper_crossed');
  if (shoulderPos.includes('rounded')) movementFindings.add('upper_crossed');
  if (backPos.includes('increased-kyphosis')) movementFindings.add('upper_crossed');
  if (backPos.includes('increased-lordosis')) movementFindings.add('lower_crossed');
  if (backPos.includes('flat-back')) movementFindings.add('posterior_pelvic_tilt');
  if (hipPos.includes('anterior-tilt')) movementFindings.add('lower_crossed');
  if (hipPos.includes('posterior-tilt')) movementFindings.add('posterior_pelvic_tilt');
  if (
    kneePos.includes('valgus-knee') ||
    form.ohsKneeAlignment === 'valgus' ||
    form.lungeLeftKneeAlignment === 'valgus' ||
    form.lungeRightKneeAlignment === 'valgus'
  ) {
    movementFindings.add('knee_valgus');
  }
  if (form.ohsFeetPosition === 'pronation') movementFindings.add('feet_pronation');

  movementFindings.forEach((id) => {
    const deviation = MOVEMENT_LOGIC_DB[id];
    if (deviation) {
      issues.push(deviation.name);
      addBlock(
        `Correction: ${deviation.name}`,
        [`Stretch: ${deviation.primaryStretch}`, `Activate: ${deviation.primaryActivation}`],
        [
          {
            name: deviation.primaryStretch,
            setsReps: '2-3 x 30-45s',
            notes: `Target: ${deviation.overactiveMuscles.join(', ')}`,
          },
          {
            name: deviation.primaryActivation,
            setsReps: '2-3 x 12-15',
            notes: `Target: ${deviation.underactiveMuscles.join(', ')}`,
          },
        ],
      );
      deviation.contraindications.forEach((c) => {
        internalNotes.needsAttention.push(`Contraindication: Avoid ${c} due to ${deviation.name}.`);
      });
    }
  });

  const movementCategory = scores.categories.find((c) => c.id === 'movementQuality');
  if ((movementCategory?.score || 0) < t.MOVEMENT_SCORE_MOBILITY_CUTOFF) {
    const mobIssues = movementCategory?.weaknesses || [];
    if (mobIssues.find((w) => w.toLowerCase().includes('hip'))) {
      issues.push('Hip mobility limitations');
      addBlock('Hip mobility', ['Increase hip ER/IR and extension'], EXERCISES.mobilityHip);
    }
    if (mobIssues.find((w) => w.toLowerCase().includes('shoulder'))) {
      issues.push('Shoulder mobility limitations');
      addBlock('Shoulder mobility', ['Improve shoulder flexion and ER'], EXERCISES.mobilityShoulder);
    }
    if (mobIssues.find((w) => w.toLowerCase().includes('ankle'))) {
      issues.push('Ankle mobility limitations');
      addBlock('Ankle mobility', ['Increase dorsiflexion ROM'], EXERCISES.mobilityAnkle);
    }
  }

  const armR = safeParse(form.segmentalArmRightKg);
  const armL = safeParse(form.segmentalArmLeftKg);
  const legR = safeParse(form.segmentalLegRightKg);
  const legL = safeParse(form.segmentalLegLeftKg);
  const pct = (a: number, b: number) => {
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    if (hi <= 0) return 0;
    return (Math.abs(hi - lo) / hi) * 100;
  };
  const armImb = pct(armL, armR);
  const legImb = pct(legL, legR);
  const msgFor = (region: string, diff: number) => {
    if (diff <= t.SEGMENTAL_LIGHT_IMBALANCE_PCT) {
      return `${region}: Balanced. No special intervention needed.`;
    }
    if (diff < t.SEGMENTAL_SIGNIFICANT_IMBALANCE_PCT) {
      return `${region}: Light imbalance (~${diff.toFixed(1)}%). Add 1–2 unilateral movements/week or 1–2 extra sets on the weaker side.`;
    }
    return `${region}: Significant imbalance (~${diff.toFixed(1)}%). Prioritise unilateral exercises and add 1–2 additional sets to the weaker side until balanced.`;
  };
  if (armL > 0 || armR > 0) {
    segmentalGuidance.push(msgFor('Arms', armImb));
    if (armImb >= t.SEGMENTAL_SIGNIFICANT_IMBALANCE_PCT) {
      blocks.push({
        title: 'Unilateral correction — arms',
        objectives: ['Reduce side-to-side asymmetry', 'Improve unilateral control'],
        exercises: [
          { name: '1‑arm row', setsReps: '3–4 x 8–12/side' },
          { name: 'Single‑arm DB press', setsReps: '3–4 x 8–12/side' },
        ],
      });
    }
  }
  if (legL > 0 || legR > 0) {
    segmentalGuidance.push(msgFor('Legs', legImb));
    if (legImb >= t.SEGMENTAL_SIGNIFICANT_IMBALANCE_PCT) {
      blocks.push({
        title: 'Unilateral correction — legs',
        objectives: ['Reduce asymmetry', 'Improve single‑leg stability'],
        exercises: [
          { name: 'Split squat', setsReps: '3–4 x 8–12/side' },
          { name: 'Step‑up', setsReps: '3–4 x 8–12/side' },
        ],
      });
    }
  }

  if ((scores.categories.find((c) => c.id === 'cardio')?.score || 0) < t.CARDIO_BLOCK_THRESHOLD) {
    issues.push('Cardiorespiratory capacity below target');
    addBlock('Aerobic base', ['Build aerobic capacity', 'Improve HR recovery'], EXERCISES.cardioBase);
  }

  const peakHr = safeParse(form.cardioPeakHr);
  const recoveryHr = safeParse(form.cardioPost1MinHr);
  if (peakHr > 0 && recoveryHr > 0) {
    const hrr = peakHr - recoveryHr;
    if (hrr < t.HRR_ABNORMAL_BPM) {
      issues.push('Abnormal Heart Rate Recovery (<12bpm drop)');
      clientScript.findings.push(
        `Heart rate recovery is slow (${Math.round(hrr)}bpm drop). This may indicate cardiovascular concerns.`,
      );
      clientScript.whyItMatters.push(
        "Slow heart rate recovery can be a sign of poor cardiovascular fitness or underlying health issues. It's important to address this with medical guidance.",
      );
      clientScript.actionPlan.push(
        'Consult physician if recovery consistently remains below 12bpm. Focus on low-intensity aerobic base building under medical supervision.',
      );
    }
  }

  if (hasStrengthData && (scores.categories.find((c) => c.id === 'strength')?.score || 0) < t.STRENGTH_BLOCK_THRESHOLD) {
    issues.push('Functional Strength below target');
    addBlock('Strength & core', ['Improve core endurance', 'Build foundational strength'], [
      ...EXERCISES.coreEndurance,
      ...EXERCISES.strengthBase,
    ]);
  }

  const mq = scores.categories.find((c) => c.id === 'movementQuality')?.score || 0;
  if (hasMovementData && mq < t.MOVEMENT_SCORE_POSTURE_BLOCK && mq > 0) {
    blocks.unshift({
      title: 'Daily posture hygiene',
      objectives: ['Reduce prolonged flexion', 'Reinforce neutral alignment'],
      exercises: EXERCISES.posture,
    });
  }

  if (hasAnyData && blocks.length === 0) {
    blocks.push({
      title: 'Performance maintenance',
      objectives: ['Maintain strengths', 'Prevent regression'],
      exercises: EXERCISES.strengthBase,
    });
  }

  return { issues, blocks, segmentalGuidance };
}
