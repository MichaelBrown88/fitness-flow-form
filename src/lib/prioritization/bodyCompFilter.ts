/**
 * Body Composition Filter
 *
 * InBody-specific personalization including asymmetry detection,
 * trunk/limb distribution, and clinical postural corrections.
 */

import type { PrioritizedExercise, PrioritizationContext } from './types';
import { MOVEMENT_LOGIC_DB } from '../clinical-data';
import { safeParse } from '../utils/numbers';

export function detectBodyCompIssues(ctx: PrioritizationContext): {
  important: PrioritizedExercise[];
  minor: PrioritizedExercise[];
  importantIssues: string[];
  minorIssues: string[];
} {
  const { form } = ctx;
  const important: PrioritizedExercise[] = [];
  const minor: PrioritizedExercise[] = [];
  const importantIssues: string[] = [];
  const minorIssues: string[] = [];

  // Segmental data extraction
  const ra = safeParse(form.segmentalArmRightKg);
  const la = safeParse(form.segmentalArmLeftKg);
  const rl = safeParse(form.segmentalLegRightKg);
  const ll = safeParse(form.segmentalLegLeftKg);
  const trunk = safeParse(form.segmentalTrunkKg);

  // Asymmetry Detection (>10% difference)
  if (ra > 0 && la > 0) {
    const armDiff = Math.abs(ra - la) / Math.max(ra, la);
    if (armDiff > 0.1) {
      importantIssues.push(`Significant arm muscle imbalance (${(armDiff * 100).toFixed(1)}%)`);
      important.push({
        name: 'Unilateral Upper Body Focus',
        setsReps: '3 x 10-12 per side',
        notes: 'Use dumbbells or cables to ensure equal loading and fix asymmetry',
        priority: 'important',
        reason: 'Dumbbell-only upper body work to correct the 10%+ muscle imbalance between arms.',
        sessionTypes: ['upper-body', 'push', 'pull'],
        addresses: ['muscle imbalance', 'asymmetry']
      });
    }
  }

  if (rl > 0 && ll > 0) {
    const legDiff = Math.abs(rl - ll) / Math.max(rl, ll);
    if (legDiff > 0.1) {
      importantIssues.push(`Significant leg muscle imbalance (${(legDiff * 100).toFixed(1)}%)`);
      important.push({
        name: 'Unilateral Lower Body Focus (Split Squats)',
        setsReps: '3 x 10-12 per side',
        notes: 'Prioritize the weaker leg to balance muscle mass',
        priority: 'important',
        reason: 'Single-leg variations (split squats, step-ups) to address the significant lower body asymmetry.',
        sessionTypes: ['lower-body', 'legs'],
        addresses: ['muscle imbalance', 'asymmetry']
      });
    }
  }

  // Trunk/Limb Distribution focus
  const totalLimbMuscle = ra + la + rl + ll;
  if (totalLimbMuscle > 0 && trunk > 0) {
    const trunkToLimbRatio = trunk / totalLimbMuscle;
    // Standard ratio is roughly 1.0 - 1.2. If trunk is significantly higher, focus on limbs.
    if (trunkToLimbRatio > 1.3) {
      minorIssues.push('Relatively higher trunk muscle mass vs limbs');
      minor.push({
        name: 'Isolation Limb Volume',
        setsReps: '2-3 x 12-15',
        notes: 'Add specific focus to arm/leg development',
        priority: 'minor',
        reason: 'Your trunk muscle is very developed; adding isolation work will balance your overall profile.',
        sessionTypes: ['upper-body', 'lower-body', 'push', 'pull'],
        addresses: ['muscle distribution']
      });
    } else if (trunkToLimbRatio < 0.8) {
      minorIssues.push('Relatively lower trunk muscle mass vs limbs');
      minor.push({
        name: 'Heavy Axial Loading (Core/Trunk)',
        setsReps: '3 x 8-10',
        notes: 'Loaded carries and heavy compounds',
        priority: 'minor',
        reason: 'Strengthening the trunk/core will provide a more stable base for your strong limbs.',
        sessionTypes: ['full-body', 'core', 'strength'],
        addresses: ['muscle distribution', 'core stability']
      });
    }
  }

  // Specific Limb Focus (Lower vs Upper)
  const totalArms = ra + la;
  const totalLegs = rl + ll;
  if (totalArms > 0 && totalLegs > 0) {
    const upperToLowerRatio = totalArms / totalLegs;
    // Standard ratio is roughly 0.2 - 0.25 for most athletes.
    // If arms are very low, suggest upper body focus.
    if (upperToLowerRatio < 0.18) {
      minorIssues.push('Relatively lower upper body muscle mass');
      minor.push({
        name: 'Upper Body Hypertrophy Focus',
        setsReps: '3 x 10-12',
        notes: 'Vertical and horizontal pressing/pulling',
        priority: 'minor',
        reason: 'Your upper body muscle mass is lower relative to your legs; adding volume here will improve balance.',
        sessionTypes: ['upper-body', 'push', 'pull'],
        addresses: ['muscle distribution']
      });
    } else if (upperToLowerRatio > 0.3) {
      minorIssues.push('Relatively lower lower body muscle mass');
      minor.push({
        name: 'Lower Body Hypertrophy Focus',
        setsReps: '3 x 10-12',
        notes: 'Squat and hinge variations',
        priority: 'minor',
        reason: 'Your lower body muscle mass is lower relative to your upper body; prioritize leg volume.',
        sessionTypes: ['lower-body', 'legs'],
        addresses: ['muscle distribution']
      });
    }
  }

  // Clinical Postural Corrections (Important Priority)
  const movementFindings = new Set<string>();
  const headPos = Array.isArray(form.postureHeadOverall) ? form.postureHeadOverall : [form.postureHeadOverall];
  const shoulderPos = Array.isArray(form.postureShouldersOverall) ? form.postureShouldersOverall : [form.postureShouldersOverall];
  const backPos = Array.isArray(form.postureBackOverall) ? form.postureBackOverall : [form.postureBackOverall];
  const hipPos = Array.isArray(form.postureHipsOverall) ? form.postureHipsOverall : [form.postureHipsOverall];
  const kneePos = Array.isArray(form.postureKneesOverall) ? form.postureKneesOverall : [form.postureKneesOverall];

  if (headPos.includes('forward-head')) movementFindings.add('upper_crossed');
  if (shoulderPos.includes('rounded')) movementFindings.add('upper_crossed');
  if (backPos.includes('increased-kyphosis')) movementFindings.add('upper_crossed');
  if (backPos.includes('increased-lordosis')) movementFindings.add('lower_crossed');
  if (backPos.includes('flat-back')) movementFindings.add('posterior_pelvic_tilt');
  if (hipPos.includes('anterior-tilt')) movementFindings.add('lower_crossed');
  if (hipPos.includes('posterior-tilt')) movementFindings.add('posterior_pelvic_tilt');
  if (kneePos.includes('valgus-knee') || form.ohsKneeAlignment === 'valgus' || form.lungeLeftKneeAlignment === 'valgus' || form.lungeRightKneeAlignment === 'valgus') {
    movementFindings.add('knee_valgus');
  }
  if (form.ohsFeetPosition === 'pronation') movementFindings.add('feet_pronation');

  movementFindings.forEach(id => {
    const deviation = MOVEMENT_LOGIC_DB[id];
    if (deviation) {
      importantIssues.push(`Clinical Correction: ${deviation.name}`);

      // Add Stretch
      important.push({
        name: deviation.primaryStretch,
        setsReps: '2-3 x 30-45s',
        notes: `Correction for ${deviation.name}. Targets overactive: ${deviation.overactiveMuscles.join(', ')}`,
        priority: 'important',
        reason: `Releases tight muscles identified in manual posture assessment.`,
        sessionTypes: ['full-body', 'upper-body', 'lower-body'],
        addresses: [deviation.name, 'posture']
      });

      // Add Activation
      important.push({
        name: deviation.primaryActivation,
        setsReps: '2-3 x 12-15',
        notes: `Correction for ${deviation.name}. Targets underactive: ${deviation.underactiveMuscles.join(', ')}`,
        priority: 'important',
        reason: `Strengthens weak muscles to stabilize and correct ${deviation.name}.`,
        sessionTypes: ['full-body', 'upper-body', 'lower-body'],
        addresses: [deviation.name, 'posture']
      });
    }
  });

  return { important, minor, importantIssues, minorIssues };
}
