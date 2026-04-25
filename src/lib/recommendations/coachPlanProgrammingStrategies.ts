import type { FormData } from '@/contexts/FormContext';
import type { CoachPlan } from './types';

export function buildProgrammingStrategies(
  form: FormData,
  primaryGoalRaw: string,
  goalAmbition: string,
  levelText: string,
): CoachPlan['programmingStrategies'] {
  const programmingStrategies: CoachPlan['programmingStrategies'] = [];

  if (primaryGoalRaw === 'body-recomposition') {
    const recompLevel = goalAmbition || 'athletic';
    const genderLower = (form.gender || 'male').toLowerCase();
    let targetBFRange = '';
    if (genderLower === 'male') {
      switch (recompLevel) {
        case 'shredded':
          targetBFRange = '8-10%';
          break;
        case 'athletic':
          targetBFRange = '10-15%';
          break;
        case 'fit':
          targetBFRange = '15-20%';
          break;
        case 'healthy':
        default:
          targetBFRange = '20-25%';
          break;
      }
    } else {
      switch (recompLevel) {
        case 'shredded':
          targetBFRange = '15-17%';
          break;
        case 'athletic':
          targetBFRange = '17-21%';
          break;
        case 'fit':
          targetBFRange = '21-25%';
          break;
        case 'healthy':
        default:
          targetBFRange = '25-30%';
          break;
      }
    }
    programmingStrategies.push({
      title: 'Body Recomposition: Fat Loss + Muscle Gain',
      strategy: `To achieve your ${recompLevel} body composition goal (${targetBFRange} body fat) while building muscle, we will use a slight calorie deficit (200-500 kcal/day) with high-protein intake and progressive resistance training. This approach maximizes muscle retention and growth while losing fat.`,
      exercises: ['Compound Lifts', 'Progressive Overload', 'Zone 2 Cardio', 'High-Protein Nutrition'],
    });
  } else if (primaryGoalRaw === 'weight-loss') {
    programmingStrategies.push({
      title: 'Metabolic Resilience & Fat Loss',
      strategy: `To achieve your ${levelText} weight loss goal, we will utilise metabolic density training. This means keeping your heart rate elevated while focusing on fat-burning "anchors" like Zone 2 steady-state and high-intensity circuits.`,
      exercises: ['Goblet Squats', 'Kettlebell Swings', 'Push-ups', 'TRX Rows'],
    });
  } else if (primaryGoalRaw === 'build-muscle' || primaryGoalRaw === 'build-strength') {
    programmingStrategies.push({
      title: 'Structural Hypertrophy & Power',
      strategy: `Your ${levelText} ambition for ${primaryGoalRaw.replace('-', ' ')} requires a focus on structural hypertrophy. We will prioritise compound lifts with progressive overload, ensuring every session moves you closer to your target lean mass distribution.`,
      exercises: ['Back Squats', 'Bench Press', 'Deadlifts', 'Overhead Press'],
    });
  } else if (primaryGoalRaw === 'improve-fitness') {
    programmingStrategies.push({
      title: 'Aerobic Power & Cardiovascular Capacity',
      strategy: `Reaching your ${levelText} fitness threshold means building a robust aerobic engine. We'll combine Zone 2 base building with targeted VO2 max intervals to ensure you recover faster and can handle higher training densities.`,
      exercises: ['Interval Sprints', 'Tempo Runs', 'Rowing Intervals', 'Assault Bike'],
    });
  } else if (primaryGoalRaw === 'general-health') {
    programmingStrategies.push({
      title: 'Functional Longevity & Vitality',
      strategy: `Our strategy for your ${levelText} health goal is focused on full-body vitality. We'll blend strength, cardiovascular capacity, and movement quality to ensure you feel as good as you look, supporting a high quality of life.`,
      exercises: ['Carry Variations', 'Bodyweight Squats', 'Bird-Dogs', 'Walking'],
    });
  }

  return programmingStrategies;
}
