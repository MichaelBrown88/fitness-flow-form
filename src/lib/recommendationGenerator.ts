/**
 * New Recommendation Generator using Comprehensive Exercise Database
 * 
 * Creates unified workouts for clients and comprehensive exercise lists for coaches
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from './scoring';
import type { CoachPlan } from './recommendations';
import { 
  buildClientProfile, 
  getRankedExercises, 
  getExercisesBySession, 
  type RankedExercise, 
  type ClientProfile,
  getMovementPattern,
  type MovementPattern
} from './exerciseSelection';
import type { SessionType } from './exerciseDatabase';

/**
 * Helper to check if an exercise fits a specific slot criteria
 */
const fitsSlot = (
  ex: RankedExercise, 
  pattern: MovementPattern | MovementPattern[], 
  excludeNames: Set<string>
): boolean => {
  if (excludeNames.has(ex.name)) return false;
  const exPattern = getMovementPattern(ex);
  const targetPatterns = Array.isArray(pattern) ? pattern : [pattern];
  return targetPatterns.includes(exPattern);
};

/**
 * Generate a structured, slot-based workout for the client
 * Structure: Warm-up (Pulse + Mobility) → Main Workout (Primary Compound → Secondary Compounds → Accessories) → Finisher
 */
export async function generateClientWorkout(
  form: FormData,
  scores: ScoreSummary
): Promise<{
  warmUp: Array<{ name: string; setsReps?: string; time?: string; addresses?: string }>;
  exercises: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string; type: string }>;
  finisher?: { name: string; time?: string; setsReps?: string; addresses?: string };
}> {
  const profile = buildClientProfile(form, scores);
  const primaryGoal = profile.goals[0] || 'general-health';
  
  // Check for Hisham MM Abdoh - custom workout
  const clientName = (form.fullName || '').toLowerCase().trim();
  const isHisham = clientName.includes('hisham') && clientName.includes('abdoh');
  
  // Get pool of all valid exercises (dynamic import happens inside getRankedExercises)
  const [warmUpExercises, workoutExercises, cardioExercises] = await Promise.all([
    getRankedExercises(profile, 'warm-up', 'full-body'),
    getRankedExercises(profile, 'workout', 'full-body'),
    getRankedExercises(profile, 'cardio')
  ]);
  
  const allExercises = [
    ...warmUpExercises,
    ...workoutExercises,
    ...cardioExercises
  ];

  const usedExerciseNames = new Set<string>();
  const workout: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string; type: string }> = [];

  // Helper to get relevant addresses for display
  const getRelevantAddresses = (exercise: RankedExercise): string[] => {
    if (!exercise.addresses) return [];
    const relevant: string[] = [];
    
    if (exercise.addresses.postural) {
      for (const issue of exercise.addresses.postural) {
        if (issue === 'forward-head' && profile.posturalIssues.forwardHead) relevant.push(issue);
        if (issue === 'rounded-shoulders' && profile.posturalIssues.roundedShoulders) relevant.push(issue);
        if (issue === 'kyphosis' && profile.posturalIssues.kyphosis) relevant.push(issue);
        if (issue === 'lordosis' && profile.posturalIssues.lordosis) relevant.push(issue);
        if (issue === 'anterior-pelvic-tilt' && profile.posturalIssues.anteriorPelvicTilt) relevant.push(issue);
        if (issue === 'knee-valgus' && profile.posturalIssues.kneeValgus) relevant.push(issue);
        if (issue === 'head-tilt' && profile.posturalIssues.headTilt) relevant.push(issue);
      }
    }
    
    if (exercise.addresses.mobility) {
      for (const issue of exercise.addresses.mobility) {
        if (issue === 'hip-mobility' && profile.mobilityIssues.hip) relevant.push(issue);
        if (issue === 'ankle-mobility' && profile.mobilityIssues.ankle) relevant.push(issue);
        if (issue === 'shoulder-mobility' && profile.mobilityIssues.shoulder) relevant.push(issue);
      }
    }
    
    if (exercise.addresses.asymmetry) {
      for (const issue of exercise.addresses.asymmetry) {
        if (issue === 'limb-asymmetry' && profile.asymmetries.limbs) relevant.push(issue);
        if (issue === 'hip-instability' && profile.asymmetries.hips) relevant.push(issue);
      }
    }
    
    return relevant;
  };
  
  // --- PHASE 1: WARM-UP (3 Slots: Pulse, Mobility A, Mobility B) ---
  const warmUp: Array<{ name: string; setsReps?: string; time?: string; addresses?: string }> = [];
  
  if (isHisham) {
    // Custom warm-up for Hisham
    warmUp.push({ 
      name: 'Rower (Low Intensity)', 
      time: '3 mins', 
      addresses: 'Increase body temperature, low impact cardio' 
    });
    warmUp.push({
      name: 'Leg Swings',
      setsReps: '2 x 10 each leg',
      addresses: 'Hip mobility and activation'
    });
    warmUp.push({
      name: 'Shoulder CARs (Controlled Articular Rotations)',
      setsReps: '2 x 5 each direction',
      addresses: 'Shoulder mobility and stability'
    });
    warmUp.push({
      name: 'Band Pull-Aparts',
      setsReps: '2 x 12-15',
      addresses: 'Shoulder girdle activation, addresses rounded shoulders'
    });
    warmUp.push({
      name: 'IYT Raises',
      setsReps: '2 x 8 each position',
      addresses: 'Shoulder stability and scapular control'
    });
  } else {
    // Standard warm-up logic
    // Slot 1: Pulse Raiser (Low impact cardio)
    const pulseRaiser = allExercises.find(e => 
      e.category === 'warm-up' && 
      (e.name.toLowerCase().includes('walk') || 
       e.name.toLowerCase().includes('rower') || 
       e.name.toLowerCase().includes('bike') ||
       e.name.toLowerCase().includes('cardio'))
    );
    if (pulseRaiser) {
      warmUp.push({ 
        name: pulseRaiser.name, 
        time: '3-5 mins', 
        addresses: 'Increase body temperature' 
      });
      usedExerciseNames.add(pulseRaiser.name);
    }

    // Slot 2 & 3: Corrective Mobility (Highest ranked warm-ups that address specific issues)
    const mobilityDrills = allExercises
      .filter(e => 
        e.category === 'warm-up' && 
        !usedExerciseNames.has(e.name) && 
        e.addresses &&
        (e.addresses.postural || e.addresses.mobility || e.addresses.asymmetry)
      )
      .slice(0, 3); // Take top 3 specific correctives

    mobilityDrills.forEach(drill => {
      warmUp.push({
        name: drill.name,
        setsReps: drill.prescription.sets && drill.prescription.reps
          ? `${drill.prescription.sets} x ${drill.prescription.reps}`
          : '2 x 10-12',
        addresses: drill.reason !== 'General exercise' ? drill.reason : undefined
      });
      usedExerciseNames.add(drill.name);
    });
  }

  // --- PHASE 2: MAIN WORKOUT (The "Meat") ---
  // Structure: 1. Main Compound -> 2. Secondary Compound -> 3. Accessory -> 4. Accessory
  
  if (isHisham) {
    // Custom full-body workout for Hisham
    workout.push({
      name: 'Heel Elevated Goblet Squats',
      setsReps: '3 x 8-12',
      notes: 'Full range of motion, addresses ankle mobility',
      addresses: 'Lower body strength, ankle mobility',
      type: 'Primary Compound'
    });
    workout.push({
      name: 'Seated Leg Curls',
      setsReps: '3 x 10-12',
      notes: 'Hamstring isolation',
      addresses: 'Posterior chain development',
      type: 'Accessory'
    });
    workout.push({
      name: 'Standing Calf Raises',
      setsReps: '3 x 12-15',
      notes: 'Full range of motion',
      addresses: 'Lower leg strength',
      type: 'Accessory'
    });
    workout.push({
      name: 'Incline Chest Press',
      setsReps: '3 x 8-12',
      notes: 'Safer shoulder position, builds pressing confidence',
      addresses: 'Upper body strength, shoulder stability',
      type: 'Primary Compound'
    });
    workout.push({
      name: 'Prone Dumbbell Rows',
      setsReps: '3 x 10-12',
      notes: 'Focus on scapular retraction',
      addresses: 'Postural correction, shoulder stability',
      type: 'Primary Compound'
    });
    workout.push({
      name: 'Kettlebell Bottoms Up Press',
      setsReps: '3 x 6-8 each arm',
      notes: 'Excellent for shoulder stability and proprioception',
      addresses: 'Shoulder girdle stability, addresses shoulder instability',
      type: 'Corrective / Stability'
    });
    workout.push({
      name: 'Rear Delt Flyes',
      setsReps: '3 x 12-15',
      notes: 'Controlled tempo, focus on rear deltoids',
      addresses: 'Postural correction, shoulder stability',
      type: 'Accessory / Corrective'
    });
    workout.push({
      name: 'Machine Bicep Curls',
      setsReps: '3 x 10-12',
      notes: 'Controlled movement',
      addresses: 'Arm development',
      type: 'Accessory'
    });
    workout.push({
      name: 'Machine Tricep Extensions',
      setsReps: '3 x 10-12',
      notes: 'Full extension',
      addresses: 'Arm development',
      type: 'Accessory'
    });
  } else {
    // Standard workout logic
    // Strategy: Determine split bias based on profile
    let slotPatterns: MovementPattern[] = [];
    
    // If "Build Muscle" or "Strength", we want a balanced Full Body day for the sample
    // Logic: Knee Dominant + Push + Pull + Hinge
    slotPatterns = ['squat', 'push_horizontal', 'pull_horizontal', 'hinge'];

    // Adjust for "Pain" (If knee pain, swap squat for extensive lunge or glute work)
    if (profile.hasPain.ohs) {
      slotPatterns[0] = 'lunge'; // Swap Squat for Lunge/Split Squat (usually safer/lighter)
    }

    slotPatterns.forEach((pattern, index) => {
      // Find best exercise for this pattern
      const bestFit = allExercises.find(ex => 
        ex.category === 'workout' && 
        fitsSlot(ex, pattern, usedExerciseNames)
      );

      if (bestFit) {
        const relevantAddresses = getRelevantAddresses(bestFit);
        workout.push({
          name: bestFit.name,
          setsReps: index === 0 ? '3-4 x 6-8' : '3 x 10-12', // Heavier for first lift
          notes: bestFit.prescription.notes,
          addresses: relevantAddresses.length > 0 ? relevantAddresses.join(', ') : (bestFit.reason !== 'General exercise' ? bestFit.reason : undefined),
          type: index === 0 ? 'Primary Compound' : 'Secondary Compound'
        });
        usedExerciseNames.add(bestFit.name);
      }
    });

    // --- PHASE 3: ACCESSORY / ISOLATION ---
    // Fill gaps (e.g., if we did horizontal push, maybe add vertical push or isolation)
    const accessoryCandidates = allExercises.filter(ex => 
      ex.category === 'workout' && 
      !usedExerciseNames.has(ex.name) &&
      (ex.bodyParts.includes('core') || 
       ex.bodyParts.includes('shoulders') || 
       ex.bodyParts.includes('glutes') ||
       getMovementPattern(ex) === 'isolation')
    );

    // Pick 2 accessories that address specific identified issues (high rank)
    accessoryCandidates.slice(0, 2).forEach(ex => {
      const relevantAddresses = getRelevantAddresses(ex);
      workout.push({
        name: ex.name,
        setsReps: ex.prescription.sets && ex.prescription.reps
          ? `${ex.prescription.sets} x ${ex.prescription.reps}`
          : '2-3 x 12-15',
        type: 'Accessory / Corrective',
        addresses: relevantAddresses.length > 0 ? relevantAddresses.join(', ') : (ex.reason !== 'General exercise' ? ex.reason : undefined),
        notes: ex.prescription.notes
      });
      usedExerciseNames.add(ex.name);
    });
  }

  // --- PHASE 4: FINISHER ---
  let finisher;
  
  if (isHisham) {
    // Custom finisher for Hisham
    finisher = {
      name: 'Rower HIIT',
      time: '4 mins',
      setsReps: 'HIIT intervals',
      addresses: 'Metabolic conditioning, fat loss support'
    };
  } else if (profile.goals.includes('weight-loss') || profile.goals.includes('improve-fitness')) {
    const cardioOption = allExercises.find(ex => 
      ex.category === 'cardio' && 
      !usedExerciseNames.has(ex.name)
    );
    if (cardioOption) {
      finisher = {
        name: cardioOption.name,
        time: cardioOption.prescription.time || '10 mins',
        addresses: 'Metabolic Conditioning'
      };
    }
  }
  
  return {
    warmUp,
    exercises: workout,
    finisher
  };
}

/**
 * Generate comprehensive coach guidance
 * Improvements: Groups by purpose (Primary Lifts vs Regression/Progression)
 */
export async function generateCoachExerciseLists(
  form: FormData,
  scores: ScoreSummary
): Promise<CoachPlan['coachExerciseLists']> {
  const profile = buildClientProfile(form, scores);
  
  // Parallel load all exercise categories (dynamic import happens inside getRankedExercises)
  const [workoutExercises, warmUpExercises, cardioExercises] = await Promise.all([
    getRankedExercises(profile, 'workout'),
    getRankedExercises(profile, 'warm-up'),
    getRankedExercises(profile, 'cardio')
  ]);
  
  const allRanked = [
    ...workoutExercises,
    ...warmUpExercises,
    ...cardioExercises
  ];

  // Helper to get relevant addresses for display
  const getRelevantAddresses = (exercise: RankedExercise): string[] => {
    if (!exercise.addresses) return [];
    const relevant: string[] = [];
    
    if (exercise.addresses.postural) {
      for (const issue of exercise.addresses.postural) {
        if (issue === 'forward-head' && profile.posturalIssues.forwardHead) relevant.push(issue);
        if (issue === 'rounded-shoulders' && profile.posturalIssues.roundedShoulders) relevant.push(issue);
        if (issue === 'kyphosis' && profile.posturalIssues.kyphosis) relevant.push(issue);
        if (issue === 'lordosis' && profile.posturalIssues.lordosis) relevant.push(issue);
        if (issue === 'anterior-pelvic-tilt' && profile.posturalIssues.anteriorPelvicTilt) relevant.push(issue);
        if (issue === 'knee-valgus' && profile.posturalIssues.kneeValgus) relevant.push(issue);
        if (issue === 'head-tilt' && profile.posturalIssues.headTilt) relevant.push(issue);
      }
    }
    
    if (exercise.addresses.mobility) {
      for (const issue of exercise.addresses.mobility) {
        if (issue === 'hip-mobility' && profile.mobilityIssues.hip) relevant.push(issue);
        if (issue === 'ankle-mobility' && profile.mobilityIssues.ankle) relevant.push(issue);
        if (issue === 'shoulder-mobility' && profile.mobilityIssues.shoulder) relevant.push(issue);
      }
    }
    
    if (exercise.addresses.asymmetry) {
      for (const issue of exercise.addresses.asymmetry) {
        if (issue === 'limb-asymmetry' && profile.asymmetries.limbs) relevant.push(issue);
        if (issue === 'hip-instability' && profile.asymmetries.hips) relevant.push(issue);
      }
    }
    
    return relevant;
  };

  // Helper to get top 3-4 unique for a specific pattern
  const getBestForPattern = (pattern: MovementPattern) => {
    return allRanked
      .filter(ex => getMovementPattern(ex) === pattern)
      .slice(0, 4)
      .map(ex => {
        const addresses = getRelevantAddresses(ex);
        return {
          name: ex.name,
          setsReps: ex.prescription.sets && ex.prescription.reps 
            ? `${ex.prescription.sets}x${ex.prescription.reps}` 
            : undefined,
          notes: ex.reason !== 'General exercise' ? `Relevance: ${ex.reason}` : ex.prescription.notes,
          addresses: addresses.length > 0 ? addresses.join(', ') : undefined
        };
      });
  };
  
  // Build list of key issues for priorities
  const keyIssues: string[] = [];
  if (profile.posturalIssues.forwardHead) keyIssues.push('forward-head');
  if (profile.posturalIssues.roundedShoulders) keyIssues.push('rounded-shoulders');
  if (profile.posturalIssues.kyphosis) keyIssues.push('kyphosis');
  if (profile.posturalIssues.lordosis) keyIssues.push('lordosis');
  if (profile.posturalIssues.anteriorPelvicTilt) keyIssues.push('anterior-pelvic-tilt');
  if (profile.posturalIssues.kneeValgus) keyIssues.push('knee-valgus');
  if (profile.mobilityIssues.hip) keyIssues.push('hip-mobility');
  if (profile.mobilityIssues.ankle) keyIssues.push('ankle-mobility');
  if (profile.mobilityIssues.shoulder) keyIssues.push('shoulder-mobility');
  if (profile.asymmetries.limbs) keyIssues.push('limb-asymmetry');
  if (profile.asymmetries.hips) keyIssues.push('hip-instability');

  const primaryGoal = profile.goals[0] || 'general-health';
  const hasAsymmetries = profile.asymmetries.limbs || profile.asymmetries.hips;
  const useBarbell = primaryGoal === 'build-strength' && !hasAsymmetries;
  
  let equipmentPriority = 'Based on client availability';
  if (hasAsymmetries) {
    equipmentPriority = 'Unilateral/Dumbbells (to address imbalances)';
  } else if (useBarbell) {
    equipmentPriority = 'Barbell (for strength development)';
  } else if (primaryGoal === 'build-muscle') {
    equipmentPriority = 'Dumbbells/Barbell (hypertrophy focus)';
  }
  
      return {
    priorities: {
      equipment: equipmentPriority,
      focus: profile.goals.join(', '),
      keyIssues
    },
    byMovementPattern: {
      squat: getBestForPattern('squat'),
      hinge: getBestForPattern('hinge'),
      push: [...getBestForPattern('push_horizontal'), ...getBestForPattern('push_vertical')],
      pull: [...getBestForPattern('pull_horizontal'), ...getBestForPattern('pull_vertical')],
      lunge: getBestForPattern('lunge'),
      core: getBestForPattern('core')
    },
    // Keep existing issueSpecific logic as it was decent, just ensure it pulls from ranked list
    issueSpecific: {
      postural: allRanked
        .filter(ex => ex.addresses?.postural && ex.rank > 50)
        .slice(0, 5)
    .map(ex => {
          const addresses = getRelevantAddresses(ex);
      return {
        name: ex.name,
        setsReps: ex.prescription.sets && ex.prescription.reps
          ? `${ex.prescription.sets} x ${ex.prescription.reps}`
          : undefined,
        notes: ex.prescription.notes,
            addresses: addresses.length > 0 ? addresses.join(', ') : ex.reason
          };
        }),
      mobility: allRanked
        .filter(ex => ex.addresses?.mobility && ex.rank > 50)
        .slice(0, 5)
    .map(ex => {
          const addresses = getRelevantAddresses(ex);
      return {
        name: ex.name,
        setsReps: ex.prescription.sets && ex.prescription.reps
          ? `${ex.prescription.sets} x ${ex.prescription.reps}`
          : undefined,
        notes: ex.prescription.notes,
            addresses: addresses.length > 0 ? addresses.join(', ') : ex.reason
          };
        }),
      asymmetry: allRanked
        .filter(ex => ex.addresses?.asymmetry && ex.rank > 50)
        .slice(0, 5)
    .map(ex => {
          const addresses = getRelevantAddresses(ex);
      return {
        name: ex.name,
        setsReps: ex.prescription.sets && ex.prescription.reps
          ? `${ex.prescription.sets} x ${ex.prescription.reps}`
          : undefined,
        notes: ex.prescription.notes,
            addresses: addresses.length > 0 ? addresses.join(', ') : ex.reason
          };
        })
    },
    warmUp: allRanked
      .filter(ex => ex.category === 'warm-up')
      .slice(0, 5)
    .map(ex => {
        const addresses = getRelevantAddresses(ex);
      return {
        name: ex.name,
        setsReps: ex.prescription.sets && ex.prescription.reps
          ? `${ex.prescription.sets} x ${ex.prescription.reps}`
          : undefined,
        time: ex.prescription.time,
        notes: ex.prescription.notes,
        addresses: addresses.length > 0 ? addresses.join(', ') : undefined
      };
      }),
    cardio: allRanked
      .filter(ex => ex.category === 'cardio')
      .slice(0, 3)
    .map(ex => ({
      name: ex.name,
      time: ex.prescription.time,
      notes: ex.prescription.notes,
      addresses: ex.reason || undefined
      }))
  };
}

