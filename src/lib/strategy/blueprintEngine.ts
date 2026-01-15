/**
 * Blueprint Strategy Engine
 * 
 * Pure TypeScript function that generates client-specific blueprint pillars
 * based on assessment scores, form data, and roadmap calculations.
 * 
 * This is the single source of truth for blueprint logic - extracted from
 * UI components to enable testing and prevent duplication.
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary, RoadmapPhase } from '@/lib/scoring';
import { buildRoadmap } from '@/lib/scoring';
import { MOVEMENT_LOGIC_DB } from '@/lib/clinical-data';

export interface StrategicPillar {
  id: string;
  title: string;
  priority: number; // 1 = Urgent, 5 = Low
  focus: string;
  description: string;
  timeframe: string; // e.g., "Weeks 1-8" or "Weeks 1-16"
  color: 'blue' | 'red' | 'green';
  protocol: Array<{ name: string; setsReps: string }>;
  category: 'movementQuality' | 'bodyComp' | 'strength' | 'cardio' | 'lifestyle';
}

/**
 * Get timeframe from roadmap phases for a specific category
 */
function getTimeframeFromRoadmap(
  roadmap: RoadmapPhase[],
  category: string
): string {
  // Map blueprint categories to roadmap phase titles
  const categoryMap: Record<string, string[]> = {
    'movementQuality': ['Movement', 'Posture', 'Correction', 'Structural'],
    'bodyComp': ['Metabolic', 'Fat Loss', 'Body Composition'],
    'strength': ['Strength', 'Muscle', 'Hypertrophy', 'Sarcopenia'],
    'cardio': ['Aerobic', 'Cardio', 'Metabolic', 'Fitness'],
    'lifestyle': ['Recovery', 'Sleep', 'Stress']
  };

  const keywords = categoryMap[category] || [];
  
  // Find matching phase
  const matchingPhase = roadmap.find(phase => 
    keywords.some(keyword => 
      phase.title.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  if (matchingPhase) {
    return `Weeks 1-${matchingPhase.weeks}`;
  }

  // Default timeframes if no roadmap match
  const defaults: Record<string, string> = {
    'movementQuality': 'Weeks 1-8',
    'bodyComp': 'Weeks 1-16',
    'strength': 'Weeks 8-24',
    'cardio': 'Weeks 1-12',
    'lifestyle': 'Weeks 1-4'
  };

  return defaults[category] || 'Weeks 1-8';
}

/**
 * Get corrective exercises for movement issues from MOVEMENT_LOGIC_DB
 */
function getCorrectiveExercises(issue: string): Array<{ name: string; setsReps: string }> {
  const movementLogic = MOVEMENT_LOGIC_DB[issue];
  if (!movementLogic) return [];

  const exercises: Array<{ name: string; setsReps: string }> = [];

  // Add primary stretch
  if (movementLogic.primaryStretch) {
    exercises.push({
      name: movementLogic.primaryStretch,
      setsReps: '2-3 x 30-45s'
    });
  }

  // Add primary activation
  if (movementLogic.primaryActivation) {
    exercises.push({
      name: movementLogic.primaryActivation,
      setsReps: '2-3 x 12-15'
    });
  }

  // Limit to 3 exercises (stretch + activation + optional secondary)
  return exercises.slice(0, 3);
}

/**
 * Generate blueprint pillars based on assessment data
 */
export function generateBlueprint(
  formData: FormData,
  scores: ScoreSummary
): StrategicPillar[] {
  const candidates: StrategicPillar[] = [];

  // Get roadmap for timeframe calculations
  const roadmap = buildRoadmap(scores, formData);

  // Extract category scores
  const movement = scores.categories.find(c => c.id === 'movementQuality') || { score: 0, weaknesses: [] };
  const bodyComp = scores.categories.find(c => c.id === 'bodyComp') || { score: 0, weaknesses: [] };
  const strength = scores.categories.find(c => c.id === 'strength') || { score: 0, weaknesses: [] };
  const cardio = scores.categories.find(c => c.id === 'cardio') || { score: 0, weaknesses: [] };
  const lifestyle = scores.categories.find(c => c.id === 'lifestyle') || { score: 0, weaknesses: [] };

  // Get synthesis data for priority determination
  const synthesis = scores.synthesis || [];

  // Extract client-specific data
  const headPos = Array.isArray(formData?.postureHeadOverall) 
    ? formData.postureHeadOverall 
    : [formData?.postureHeadOverall];
  const shoulderPos = Array.isArray(formData?.postureShouldersOverall) 
    ? formData.postureShouldersOverall 
    : [formData?.postureShouldersOverall];
  const kneeValgus = formData?.ohsKneeAlignment === 'valgus' || 
                     formData?.lungeLeftKneeAlignment === 'valgus' || 
                     formData?.lungeRightKneeAlignment === 'valgus';
  const visceral = parseFloat(formData?.visceralFatLevel || '0');
  const goals = formData?.clientGoals || [];
  const primaryGoal = goals[0] || 'general-health';

  // ============================================
  // 1. STRUCTURAL RESTORATION
  // ============================================
  const hasMovementIssues = movement.score < 70 || 
                             headPos.includes('forward-head') || 
                             shoulderPos.includes('rounded') || 
                             kneeValgus;
  const structuralSynthesis = synthesis.find(s => 
    s.title.includes('Structural') || s.title.includes('Injury')
  );
  
  if (hasMovementIssues) {
    let focus = '';
    let protocol: Array<{ name: string; setsReps: string }> = [];
    let movementIssue = '';

    if (kneeValgus) {
      focus = 'FIXING THE VALGUS KNEE & TECH NECK';
      movementIssue = 'knee_valgus';
      // Try to get exercises from movement logic DB
      const correctiveExercises = getCorrectiveExercises('knee_valgus');
      if (correctiveExercises.length > 0) {
        protocol = correctiveExercises;
      } else {
        // Fallback if not in DB
        protocol = [
          { name: 'Knee Banded Walks', setsReps: '2 x 15 steps' },
          { name: 'Chin Tucks', setsReps: '2 x 10 reps' },
          { name: 'Single Leg Touchdowns', setsReps: '3 x 8/side' }
        ];
      }
    } else if (headPos.includes('forward-head') || shoulderPos.includes('rounded')) {
      focus = 'FIXING TECH NECK & POSTURE';
      movementIssue = headPos.includes('forward-head') ? 'upper_crossed' : 'upper_crossed';
      const correctiveExercises = getCorrectiveExercises('upper_crossed');
      if (correctiveExercises.length > 0) {
        protocol = correctiveExercises;
      } else {
        protocol = [
          { name: 'Chin Tucks', setsReps: '2 x 10 reps' },
          { name: 'Wall Angels', setsReps: '2 x 12 reps' },
          { name: 'Band Pull-Aparts', setsReps: '2 x 15 reps' }
        ];
      }
    } else {
      focus = 'IMPROVING MOVEMENT QUALITY';
      protocol = [
        { name: 'Hip Mobility Drills', setsReps: '2 x 10 reps' },
        { name: 'Shoulder CARs', setsReps: '2 x 5 each direction' },
        { name: 'Ankle Mobility', setsReps: '2 x 8/side' }
      ];
    }

    const structuralPriority = structuralSynthesis?.severity === 'high' 
      ? 1 
      : (movement.score < 50 ? 1 : movement.score < 60 ? 2 : 3);

    candidates.push({
      id: 'structural',
      title: 'Structural Restoration',
      priority: structuralPriority,
      focus,
      description: 'We cannot load a dysfunctional pattern. Phase 1 prioritizes joint stacking so you can train pain-free.',
      timeframe: getTimeframeFromRoadmap(roadmap, 'movementQuality'),
      color: 'blue',
      protocol,
      category: 'movementQuality'
    });
  }

  // ============================================
  // 2. METABOLIC FIRE
  // ============================================
  const hasMetabolicIssues = bodyComp.score < 70 || visceral >= 10 || primaryGoal === 'weight-loss';
  const metabolicSynthesis = synthesis.find(s => 
    s.title.includes('Metabolic') || s.title.includes('Health')
  );

  if (hasMetabolicIssues) {
    let focus = 'TARGETING VISCERAL FAT';
    let description = 'Shifting your body from sugar-burning to fat-burning through Zone 2 cardio and nutrient timing.';

    if (visceral >= 12) {
      focus = 'URGENT: METABOLIC HEALTH RISK';
      description = 'High visceral fat combined with low cardiovascular recovery indicates significant metabolic health risk. Aerobic base building is the primary lever.';
    } else if (primaryGoal === 'weight-loss') {
      focus = 'FAT LOSS & METABOLIC OPTIMIZATION';
      description = 'Strategic caloric deficit through Zone 2 activity and nutrient timing to shift from sugar-burning to fat-burning.';
    }

    // Determine protocol based on cardio score and goals
    const cardioScore = cardio.score || 0;
    let protocol: Array<{ name: string; setsReps: string }> = [];

    if (visceral >= 12 || cardioScore < 50) {
      protocol = [
        { name: 'Zone 2 Cardio', setsReps: '3-4x/week, 30-45 mins' },
        { name: 'Daily Steps', setsReps: '8,000-10,000 steps' },
        { name: 'Low-Intensity Movement', setsReps: 'Daily walks' }
      ];
    } else if (primaryGoal === 'weight-loss' && cardioScore >= 60) {
      protocol = [
        { name: 'Zone 2 Cardio', setsReps: '2-3x/week, 30-45 mins' },
        { name: 'HIIT Sessions', setsReps: '1-2x/week, 20-30 mins' },
        { name: 'Daily Steps', setsReps: '10,000+ steps' }
      ];
    } else {
      protocol = [
        { name: 'Zone 2 Cardio', setsReps: '3x/week, 30-45 mins' },
        { name: 'Daily Steps', setsReps: '8,000-10,000 steps' },
        { name: 'Increased Daily Movement', setsReps: 'Park further, take stairs' }
      ];
    }

    const metabolicPriority = metabolicSynthesis?.severity === 'high' 
      ? 1 
      : (visceral >= 12 ? 1 : bodyComp.score < 50 ? 2 : bodyComp.score < 60 ? 3 : 4);

    candidates.push({
      id: 'metabolic',
      title: 'Metabolic Fire',
      priority: metabolicPriority,
      focus,
      description,
      timeframe: getTimeframeFromRoadmap(roadmap, 'bodyComp'),
      color: 'red',
      protocol,
      category: 'bodyComp'
    });
  }

  // ============================================
  // 3. STRENGTH EXPRESSION
  // ============================================
  const hasStrengthNeeds = strength.score < 70 || 
                           primaryGoal === 'build-strength' || 
                           primaryGoal === 'build-muscle';
  const strengthSynthesis = synthesis.find(s => 
    s.title.includes('Strength') || s.title.includes('Sarcopenia')
  );

  if (hasStrengthNeeds) {
    let focus = 'BUILDING POWER';
    let description = 'Progressive overload and strength development.';

    if (strength.score < 50) {
      focus = 'FOUNDATIONAL STRENGTH';
      description = 'Building basic strength and muscle mass to support long-term metabolic health and mobility.';
    } else if (primaryGoal === 'build-muscle') {
      focus = 'HYPERTROPHY SPECIALIZATION';
      description = 'Focusing on muscle growth through volume and progressive overload protocols.';
    } else if (primaryGoal === 'build-strength') {
      focus = 'STRENGTH EXPRESSION';
      description = 'Lower-rep, higher-intensity blocks focusing on neurological adaptations and peak force production.';
    }

    // Determine protocol based on strength score and goals
    let protocol: Array<{ name: string; setsReps: string }> = [];

    if (strength.score < 50) {
      protocol = [
        { name: 'Full Body Training', setsReps: '3x/week, compound focus' },
        { name: 'Progressive Overload', setsReps: 'Increase weight weekly' },
        { name: 'Daily Movement', setsReps: 'Bodyweight exercises daily' }
      ];
    } else if (primaryGoal === 'build-muscle') {
      protocol = [
        { name: 'Resistance Training', setsReps: '4-5x/week, 8-12 reps' },
        { name: 'Volume Progression', setsReps: 'Increase sets weekly' },
        { name: 'Compound + Isolation', setsReps: 'Full body splits' }
      ];
    } else if (primaryGoal === 'build-strength') {
      protocol = [
        { name: 'Heavy Compound Lifts', setsReps: '3-4x/week, 3-6 reps' },
        { name: 'Progressive Overload', setsReps: 'Increase weight weekly' },
        { name: 'Accessory Work', setsReps: '2-3x/week, 8-12 reps' }
      ];
    } else {
      protocol = [
        { name: 'Resistance Training', setsReps: '3x/week, 6-12 reps' },
        { name: 'Progressive Overload', setsReps: 'Increase weight weekly' },
        { name: 'Full Body Focus', setsReps: 'Compound movements' }
      ];
    }

    const strengthPriority = strengthSynthesis?.severity === 'high' 
      ? 2 
      : (strength.score < 50 ? 3 : strength.score < 60 ? 4 : primaryGoal === 'build-strength' || primaryGoal === 'build-muscle' ? 2 : 5);

    candidates.push({
      id: 'strength',
      title: 'Strength Expression',
      priority: strengthPriority,
      focus,
      description,
      timeframe: getTimeframeFromRoadmap(roadmap, 'strength'),
      color: 'green',
      protocol,
      category: 'strength'
    });
  }

  // ============================================
  // 4. AEROBIC BASE BUILDING
  // ============================================
  const hasCardioNeeds = cardio.score < 70;
  if (hasCardioNeeds && !candidates.find(p => p.category === 'cardio')) {
    let protocol: Array<{ name: string; setsReps: string }> = [];

    if (cardio.score < 50) {
      protocol = [
        { name: 'Zone 2 Cardio', setsReps: '4x/week, 30-45 mins' },
        { name: 'Daily Steps', setsReps: '8,000-10,000 steps' },
        { name: 'Low-Intensity Movement', setsReps: 'Daily walks' }
      ];
    } else if (cardio.score < 60) {
      protocol = [
        { name: 'Zone 2 Cardio', setsReps: '3x/week, 30-45 mins' },
        { name: 'Daily Steps', setsReps: '10,000+ steps' },
        { name: 'Tempo Work', setsReps: '1x/week, 20-30 mins' }
      ];
    } else {
      protocol = [
        { name: 'Zone 2 Cardio', setsReps: '2-3x/week, 30-45 mins' },
        { name: 'HIIT Sessions', setsReps: '1-2x/week, 20-30 mins' },
        { name: 'Daily Steps', setsReps: '10,000+ steps' }
      ];
    }

    candidates.push({
      id: 'cardio',
      title: 'Aerobic Base Building',
      priority: cardio.score < 50 ? 2 : cardio.score < 60 ? 3 : 4,
      focus: 'IMPROVING CARDIOVASCULAR RECOVERY',
      description: 'Building aerobic capacity through Zone 2 training to improve heart rate recovery and metabolic efficiency.',
      timeframe: getTimeframeFromRoadmap(roadmap, 'cardio'),
      color: 'red',
      protocol,
      category: 'cardio'
    });
  }

  // ============================================
  // 5. RECOVERY OPTIMIZATION (Crisis)
  // ============================================
  const hasLifestyleIssues = lifestyle.score < 70;
  const recoverySynthesis = synthesis.find(s => 
    s.title.includes('Recovery') || s.title.includes('Systemic')
  );

  if (hasLifestyleIssues && recoverySynthesis && recoverySynthesis.severity === 'high') {
    candidates.push({
      id: 'recovery',
      title: 'Recovery Optimization',
      priority: 1, // Highest priority if recovery crisis
      focus: 'SYSTEMIC RECOVERY CRISIS',
      description: 'Poor sleep and high stress are blunting adaptation. Addressing recovery is critical before high-intensity training.',
      timeframe: getTimeframeFromRoadmap(roadmap, 'lifestyle'),
      color: 'blue',
      protocol: [
        { name: 'Sleep Hygiene', setsReps: 'Daily routine' },
        { name: 'Stress Management', setsReps: 'Daily practice' },
        { name: 'Recovery Protocols', setsReps: 'As needed' }
      ],
      category: 'lifestyle'
    });
  }

  // ============================================
  // 6. ENSURE 3 PILLARS (Optimization Fallbacks)
  // ============================================
  if (candidates.length < 3) {
    // Try adding Cardio Optimization
    if (!candidates.find(p => p.category === 'cardio') && cardio.score < 90) {
      candidates.push({
        id: 'cardio-opt',
        title: 'Aerobic Optimization',
        priority: 4,
        focus: 'PEAK CARDIOVASCULAR EFFICIENCY',
        description: 'Refining your aerobic engine to improve recovery between sets and daily energy levels.',
        timeframe: getTimeframeFromRoadmap(roadmap, 'cardio'),
        color: 'red',
        protocol: [
          { name: 'Zone 2 Cardio', setsReps: '2x/week, 30-40 mins' },
          { name: 'Recovery Walks', setsReps: 'Daily 15-20 mins' },
          { name: 'Heart Rate Monitoring', setsReps: 'Track recovery speed' }
        ],
        category: 'cardio'
      });
    }

    // Try adding Metabolic Optimization
    if (candidates.length < 3 && !candidates.find(p => p.category === 'bodyComp') && bodyComp.score < 90) {
      candidates.push({
        id: 'metabolic-opt',
        title: 'Metabolic Refinement',
        priority: 5,
        focus: 'OPTIMIZING BODY COMPOSITION',
        description: 'Fine-tuning your nutritional timing and metabolic flexibility to maintain or refine your already solid baseline.',
        timeframe: getTimeframeFromRoadmap(roadmap, 'bodyComp'),
        color: 'red',
        protocol: [
          { name: 'Nutrient Timing', setsReps: 'Pre/Post workout focus' },
          { name: 'Protein Optimization', setsReps: '1.8g - 2.2g per kg' },
          { name: 'Micro-nutrient Focus', setsReps: 'Quality food sources' }
        ],
        category: 'bodyComp'
      });
    }

    // Lifestyle Fallback (always available)
    if (candidates.length < 3 && !candidates.find(p => p.category === 'lifestyle')) {
      candidates.push({
        id: 'lifestyle-opt',
        title: 'Longevity & Recovery',
        priority: 6,
        focus: 'MAXIMIZING ADAPTATION',
        description: 'Focusing on the 1% gains in sleep quality and stress management to ensure long-term progress.',
        timeframe: getTimeframeFromRoadmap(roadmap, 'lifestyle'),
        color: 'blue',
        protocol: [
          { name: 'Sleep Optimization', setsReps: '7-9h consistent' },
          { name: 'Daily Decompression', setsReps: '10 mins breathwork' },
          { name: 'Hydration Strategy', setsReps: '3-4L progressive' }
        ],
        category: 'lifestyle'
      });
    }
  }

  // Sort by priority (lower = higher priority) and return top 3
  return candidates
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}
