import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreSummary } from './types';

export function generateSynthesis(categories: ScoreCategory[], form: FormData): ScoreSummary['synthesis'] {
  const synthesis: ScoreSummary['synthesis'] = [];

  const bodyComp = categories.find(c => c.id === 'bodyComp');
  const cardio = categories.find(c => c.id === 'cardio');
  const strength = categories.find(c => c.id === 'strength');
  const movement = categories.find(c => c.id === 'movementQuality');
  const lifestyle = categories.find(c => c.id === 'lifestyle');

  // --- RISK SYNTHESIS ---

  // 1. Metabolic Risk: High Visceral + Low Cardio
  const visceral = bodyComp?.details.find(d => d.id === 'visceral')?.value;
  if (Number(visceral) >= 12 && (cardio?.score || 0) < 50) {
    synthesis.push({
      title: 'Metabolic Health Priority',
      description: 'The combination of high visceral fat and low cardiovascular recovery indicates a significant metabolic health risk. Aerobic base building is the primary lever here.',
      severity: 'high'
    });
  }

  // 2. Injury Risk: High Strength + Poor Movement
  if ((strength?.score || 0) > 70 && (movement?.score || 0) < 50) {
    synthesis.push({
      title: 'Structural Injury Risk',
      description: 'You have high absolute strength but significant movement compensations. Adding more weight without correcting these patterns increases the risk of joint injury.',
      severity: 'high'
    });
  }

  // 3. Recovery Crisis: Low Sleep + High Stress
  const sleep = lifestyle?.details.find(d => d.id === 'sleep')?.score || 0;
  const stress = lifestyle?.details.find(d => d.id === 'stress')?.score || 0;
  if (sleep < 50 && stress < 50) {
    synthesis.push({
      title: 'Systemic Recovery Crisis',
      description: 'Poor sleep combined with high stress levels is blunting your ability to adapt to training. Until this is addressed, high-intensity training may be counterproductive.',
      severity: 'medium'
    });
  }

  // 4. Sarcopenia/Foundation Risk: Low SMM + Low Strength
  const smmScore = bodyComp?.details.find(d => d.id === 'smm')?.score || 0;
  if (smmScore < 50 && (strength?.score || 0) < 50) {
    synthesis.push({
      title: 'Structural Integrity Needed',
      description: 'Low muscle mass and low baseline strength suggest a need for a dedicated hypertrophy and basic strength block to support long-term metabolic health and mobility.',
      severity: 'medium'
    });
  }

  // --- OPTIMIZATION / POSITIVE SYNTHESIS ---

  // 5. Elite Hybrid Potential: High Strength + High Cardio
  if ((strength?.score || 0) >= 85 && (cardio?.score || 0) >= 85) {
    synthesis.push({
      title: 'Hybrid Athlete Profile',
      description: 'You demonstrate elite-level performance in both strength and aerobic capacity. This is a rare "hybrid" profile that allows for advanced, high-density training protocols.',
      severity: 'low'
    });
  }

  // 6. Movement Mastery: High Movement + High Strength
  if ((movement?.score || 0) >= 80 && (strength?.score || 0) >= 80) {
    synthesis.push({
      title: 'Structural Mastery',
      description: 'Your high movement quality provides a safe foundation for your significant strength. You are cleared for advanced compound loading and explosive power work.',
      severity: 'low'
    });
  }

  // 7. Metabolic Resilience: High Lifestyle + High Body Comp
  if ((lifestyle?.score || 0) >= 80 && (bodyComp?.score || 0) >= 80) {
    synthesis.push({
      title: 'Metabolic Resilience',
      description: 'Your excellent recovery habits and healthy body composition create a high "ceiling" for progress. You can handle higher volume and intensity than the average trainee.',
      severity: 'low'
    });
  }

  // --- GOAL-SPECIFIC OPTIMIZATION ---
  const primaryGoal = Array.isArray(form.clientGoals) ? form.clientGoals[0] : 'general-health';

  if (primaryGoal === 'build-muscle' && (bodyComp?.score || 0) >= 70) {
    synthesis.push({
      title: 'Hypertrophy Specialization',
      description: 'You have a solid base of muscle mass. The focus now shifts to specific hypertrophy protocols and caloric surplus management to break through genetic plateaus.',
      severity: 'low'
    });
  }

  if (primaryGoal === 'build-strength' && (strength?.score || 0) >= 70) {
    synthesis.push({
      title: 'Strength Expression',
      description: 'Your foundational strength is excellent. We will transition to lower-rep, higher-intensity blocks focusing on neurological adaptations and peak force production.',
      severity: 'low'
    });
  }

  if (primaryGoal === 'improve-fitness' && (cardio?.score || 0) >= 70) {
    synthesis.push({
      title: 'Aerobic Power Optimization',
      description: 'With a strong cardiovascular base, we can now incorporate advanced interval work and lactate threshold training to move from "Fit" to "Elite" status.',
      severity: 'low'
    });
  }

  // 8. Detrained Safety
  if (form.recentActivity === 'stopped-6-months') {
    synthesis.push({
      title: 'Structural Durability Protocol',
      description: 'As you have been away from consistent training for >6 months, we will prioritize connective tissue durability and gradual volume loading to prevent common overuse injuries.',
      severity: 'medium'
    });
  }

  // 9. Newbie Gains
  if (form.trainingHistory === 'beginner' && primaryGoal !== 'general-health') {
    synthesis.push({
      title: 'Rapid Adaptive Potential',
      description: 'Your beginner status means you are primed for "newbie gains." We can expect significant improvements in both strength and body composition simultaneously during this initial phase.',
      severity: 'low'
    });
  }

  // Fallback for high performers
  if (synthesis.length === 0 && (categories.reduce((acc, c) => acc + c.score, 0) / categories.length) > 80) {
    synthesis.push({
      title: 'Performance Optimization',
      description: 'Overall scores are excellent. Focus now shifts from "fixing" to "optimizing"—fine-tuning specific performance metrics rather than correcting imbalances.',
      severity: 'low'
    });
  }

  return synthesis;
}
