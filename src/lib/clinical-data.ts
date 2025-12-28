/**
 * CLINICAL DATA DATABASE
 * Source: NASM, ACSM, NIH, ISSN
 * This file contains deterministic, expert-validated mappings for scoring,
 * movement correction, and biological timelines.
 */

// --- 1. MOVEMENT LOGIC DATABASE (Corrective Exercises) ---

export interface MovementDeviation {
  id: string;
  name: string;
  visualTrigger: string;
  overactiveMuscles: string[];
  underactiveMuscles: string[];
  primaryStretch: string;
  primaryActivation: string;
  contraindications: string[];
}

export const MOVEMENT_LOGIC_DB: Record<string, MovementDeviation> = {
  upper_crossed: {
    id: '1',
    name: 'Upper Crossed Syndrome',
    visualTrigger: 'Forward head and rounded shoulders',
    overactiveMuscles: ['Upper Trapezius', 'Levator Scapulae', 'Pectoralis Major/Minor'],
    underactiveMuscles: ['Deep Cervical Flexors', 'Lower Trapezius', 'Serratus Anterior'],
    primaryStretch: 'Upper Trapezius Stretch',
    primaryActivation: 'Chin Tucks',
    contraindications: ['Overhead Press'],
  },
  lower_crossed: {
    id: '2',
    name: 'Lower Crossed Syndrome (Anterior Pelvic Tilt)',
    visualTrigger: 'Pelvis rolled forward with excessive lumbar arch',
    overactiveMuscles: ['Iliopsoas', 'Rectus Femoris', 'Erector Spinae'],
    underactiveMuscles: ['Gluteus Maximus', 'Hamstrings', 'Abdominals'],
    primaryStretch: 'Kneeling Hip Flexor Stretch',
    primaryActivation: 'Glute Bridge',
    contraindications: ['Full Sit-ups'],
  },
  knee_valgus: {
    id: '3',
    name: 'Knee Valgus (Pronation Distortion)',
    visualTrigger: 'Knees collapse inward during movement',
    overactiveMuscles: ['Adductor Complex', 'Biceps Femoris (Short Head)'],
    underactiveMuscles: ['Gluteus Medius', 'Gluteus Maximus'],
    primaryStretch: 'Standing Adductor Stretch',
    primaryActivation: 'Wall Slides',
    contraindications: ['Box Jumps'],
  },
  posterior_pelvic_tilt: {
    id: '4',
    name: 'Posterior Pelvic Tilt (Flat Back)',
    visualTrigger: 'Flattened lower back and tucked pelvis',
    overactiveMuscles: ['Hamstrings', 'Rectus Abdominis'],
    underactiveMuscles: ['Erector Spinae', 'Iliopsoas'],
    primaryStretch: 'Seated Hamstring Stretch',
    primaryActivation: 'Pelvic See-Saw',
    contraindications: ['Abdominal Crunches'],
  },
  feet_pronation: {
    id: '5',
    name: 'Feet Pronation (Flat Feet)',
    visualTrigger: 'Arch of the foot collapses or flattens',
    overactiveMuscles: ['Peroneals', 'Gastrocnemius', 'Soleus'],
    underactiveMuscles: ['Posterior Tibialis', 'Anterior Tibialis'],
    primaryStretch: 'Gastrocnemius Stretch',
    primaryActivation: 'Single-leg Calf Raise',
    contraindications: ['Heavy Sumo Squats'],
  },
};

// --- 2. NORMATIVE SCORING DATABASE (Benchmarks) ---

export interface NormativeBenchmark {
  testId: string;
  testName: string;
  gender: 'male' | 'female' | 'any';
  ageBracket: string;
  thresholds: {
    poor: number;
    average: number;
    excellent: number;
  };
  fitnessAgeStandard: number;
  unit: string;
}

export const NORMATIVE_SCORING_DB: NormativeBenchmark[] = [
  // Push-up (Standard for Men, Modified for Women)
  { testId: '1', testName: 'Push-up', gender: 'male', ageBracket: '20-29', thresholds: { poor: 16, average: 22, excellent: 47 }, fitnessAgeStandard: 22, unit: 'Repetitions' },
  { testId: '2', testName: 'Push-up', gender: 'male', ageBracket: '30-39', thresholds: { poor: 11, average: 17, excellent: 39 }, fitnessAgeStandard: 22, unit: 'Repetitions' },
  { testId: '3', testName: 'Push-up', gender: 'male', ageBracket: '40-49', thresholds: { poor: 9, average: 13, excellent: 30 }, fitnessAgeStandard: 22, unit: 'Repetitions' },
  { testId: '4', testName: 'Push-up', gender: 'male', ageBracket: '50-59', thresholds: { poor: 6, average: 10, excellent: 25 }, fitnessAgeStandard: 22, unit: 'Repetitions' },
  { testId: '5', testName: 'Push-up', gender: 'male', ageBracket: '60-69', thresholds: { poor: 4, average: 8, excellent: 23 }, fitnessAgeStandard: 22, unit: 'Repetitions' },
  { testId: '6', testName: 'Push-up', gender: 'female', ageBracket: '20-29', thresholds: { poor: 9, average: 15, excellent: 36 }, fitnessAgeStandard: 15, unit: 'Repetitions' },
  { testId: '7', testName: 'Push-up', gender: 'female', ageBracket: '30-39', thresholds: { poor: 7, average: 13, excellent: 31 }, fitnessAgeStandard: 15, unit: 'Repetitions' },
  { testId: '8', testName: 'Push-up', gender: 'female', ageBracket: '40-49', thresholds: { poor: 4, average: 11, excellent: 24 }, fitnessAgeStandard: 15, unit: 'Repetitions' },
  { testId: '9', testName: 'Push-up', gender: 'female', ageBracket: '50-59', thresholds: { poor: 1, average: 7, excellent: 21 }, fitnessAgeStandard: 15, unit: 'Repetitions' },
  { testId: '10', testName: 'Push-up', gender: 'female', ageBracket: '60-69', thresholds: { poor: 1, average: 5, excellent: 15 }, fitnessAgeStandard: 15, unit: 'Repetitions' },
  
  // Plank Hold
  { testId: '11', testName: 'Plank Hold', gender: 'male', ageBracket: '20-29', thresholds: { poor: 49, average: 103, excellent: 180 }, fitnessAgeStandard: 103, unit: 'Seconds' },
  { testId: '12', testName: 'Plank Hold', gender: 'male', ageBracket: '30-39', thresholds: { poor: 45, average: 95, excellent: 165 }, fitnessAgeStandard: 103, unit: 'Seconds' },
  { testId: '13', testName: 'Plank Hold', gender: 'male', ageBracket: '40-49', thresholds: { poor: 35, average: 75, excellent: 140 }, fitnessAgeStandard: 103, unit: 'Seconds' },
  { testId: '14', testName: 'Plank Hold', gender: 'male', ageBracket: '50-59', thresholds: { poor: 35, average: 60, excellent: 110 }, fitnessAgeStandard: 103, unit: 'Seconds' },
  { testId: '15', testName: 'Plank Hold', gender: 'male', ageBracket: '60+', thresholds: { poor: 20, average: 25, excellent: 60 }, fitnessAgeStandard: 103, unit: 'Seconds' },
  { testId: '16', testName: 'Plank Hold', gender: 'female', ageBracket: '20-29', thresholds: { poor: 34, average: 70, excellent: 142 }, fitnessAgeStandard: 70, unit: 'Seconds' },
  { testId: '17', testName: 'Plank Hold', gender: 'female', ageBracket: '30-39', thresholds: { poor: 30, average: 60, excellent: 120 }, fitnessAgeStandard: 70, unit: 'Seconds' },
  { testId: '18', testName: 'Plank Hold', gender: 'female', ageBracket: '40-49', thresholds: { poor: 25, average: 50, excellent: 100 }, fitnessAgeStandard: 70, unit: 'Seconds' },
  { testId: '19', testName: 'Plank Hold', gender: 'female', ageBracket: '50-59', thresholds: { poor: 20, average: 40, excellent: 85 }, fitnessAgeStandard: 70, unit: 'Seconds' },
  { testId: '20', testName: 'Plank Hold', gender: 'female', ageBracket: '60+', thresholds: { poor: 15, average: 20, excellent: 50 }, fitnessAgeStandard: 70, unit: 'Seconds' },
  
  // Recovery HR (Step Test)
  { testId: '21', testName: 'Recovery HR', gender: 'male', ageBracket: '18-25', thresholds: { poor: 118, average: 101, excellent: 70 }, fitnessAgeStandard: 101, unit: 'BPM' },
  { testId: '22', testName: 'Recovery HR', gender: 'male', ageBracket: '26-35', thresholds: { poor: 119, average: 101, excellent: 73 }, fitnessAgeStandard: 101, unit: 'BPM' },
  { testId: '23', testName: 'Recovery HR', gender: 'male', ageBracket: '36-45', thresholds: { poor: 122, average: 105, excellent: 72 }, fitnessAgeStandard: 101, unit: 'BPM' },
  { testId: '24', testName: 'Recovery HR', gender: 'male', ageBracket: '46-55', thresholds: { poor: 126, average: 105, excellent: 78 }, fitnessAgeStandard: 101, unit: 'BPM' },
  { testId: '25', testName: 'Recovery HR', gender: 'male', ageBracket: '56-65', thresholds: { poor: 123, average: 106, excellent: 72 }, fitnessAgeStandard: 101, unit: 'BPM' },
  { testId: '26', testName: 'Recovery HR', gender: 'female', ageBracket: '18-25', thresholds: { poor: 122, average: 110, excellent: 72 }, fitnessAgeStandard: 110, unit: 'BPM' },
  { testId: '27', testName: 'Recovery HR', gender: 'female', ageBracket: '26-35', thresholds: { poor: 122, average: 111, excellent: 72 }, fitnessAgeStandard: 110, unit: 'BPM' },
  { testId: '28', testName: 'Recovery HR', gender: 'female', ageBracket: '36-45', thresholds: { poor: 124, average: 114, excellent: 74 }, fitnessAgeStandard: 110, unit: 'BPM' },
  { testId: '29', testName: 'Recovery HR', gender: 'female', ageBracket: '46-55', thresholds: { poor: 126, average: 116, excellent: 78 }, fitnessAgeStandard: 110, unit: 'BPM' },
  { testId: '30', testName: 'Recovery HR', gender: 'female', ageBracket: '56-65', thresholds: { poor: 129, average: 121, excellent: 72 }, fitnessAgeStandard: 110, unit: 'BPM' },
];

// --- 3. BIOLOGICAL TIMELINE DATABASE (Goal Reality) ---

export interface GoalTimeline {
  goalId: string;
  goalType: 'fat_loss' | 'muscle_gain';
  gender: 'male' | 'female' | 'any';
  ageBracket: string;
  maxWeeklyRate: string;
  agePenaltyFactor: number;
  metabolicLogic: string;
  weeklySafetyCap: string;
}

export const GOAL_TIMELINE_DB: GoalTimeline[] = [
  { goalId: '1', goalType: 'fat_loss', gender: 'any', ageBracket: '18-39', maxWeeklyRate: '1% Body Weight', agePenaltyFactor: 1.0, metabolicLogic: 'NIH Dynamic Expenditure Model', weeklySafetyCap: '1% Total Mass' },
  { goalId: '2', goalType: 'fat_loss', gender: 'any', ageBracket: '40-59', maxWeeklyRate: '0.7% Body Weight', agePenaltyFactor: 0.7, metabolicLogic: 'Adaptive Thermogenesis Penalty', weeklySafetyCap: '0.7% Total Mass' },
  { goalId: '3', goalType: 'fat_loss', gender: 'any', ageBracket: '60+', maxWeeklyRate: '0.5% Body Weight', agePenaltyFactor: 0.5, metabolicLogic: 'Metabolic Rate Age Decay', weeklySafetyCap: '0.5% Total Mass' },
  { goalId: '4', goalType: 'muscle_gain', gender: 'male', ageBracket: '18-39', maxWeeklyRate: '0.75 lbs', agePenaltyFactor: 1.0, metabolicLogic: 'Newbie Gains Optimization', weeklySafetyCap: '1.0 lbs Muscle' },
  { goalId: '5', goalType: 'muscle_gain', gender: 'female', ageBracket: '18-39', maxWeeklyRate: '0.45 lbs', agePenaltyFactor: 0.6, metabolicLogic: 'Lower Absolute Hypertrophy Rate', weeklySafetyCap: '0.5 lbs Muscle' },
  { goalId: '6', goalType: 'muscle_gain', gender: 'male', ageBracket: '40-49', maxWeeklyRate: '0.35 lbs', agePenaltyFactor: 0.5, metabolicLogic: 'Anabolic Resistance Penalty', weeklySafetyCap: '0.4 lbs Muscle' },
  { goalId: '7', goalType: 'muscle_gain', gender: 'female', ageBracket: '40-49', maxWeeklyRate: '0.25 lbs', agePenaltyFactor: 0.3, metabolicLogic: 'Estrogen Decline Resistance', weeklySafetyCap: '0.3 lbs Muscle' },
  { goalId: '8', goalType: 'muscle_gain', gender: 'any', ageBracket: '50-59', maxWeeklyRate: '0.18 lbs', agePenaltyFactor: 0.2, metabolicLogic: 'Protein Synthesis Sensitivity Cap', weeklySafetyCap: '0.2 lbs Muscle' },
  { goalId: '9', goalType: 'muscle_gain', gender: 'any', ageBracket: '60+', maxWeeklyRate: '0.06 lbs', agePenaltyFactor: 0.1, metabolicLogic: 'Sarcopenia Prevention Threshold', weeklySafetyCap: '0.1 lbs Muscle' },
];

// --- 4. LIFESTYLE FEEDBACK DATABASE (Habits) ---

export interface LifestyleAdvice {
  category: 'Sleep' | 'Stress' | 'Steps';
  scoreRange: string;
  riskLevel: 'Optimal' | 'Moderate Risk' | 'High Risk' | 'Low Risk' | 'Active' | 'Highly Active' | 'Sedentary';
  adviceBlock: string;
}

export const LIFESTYLE_FEEDBACK_DB: LifestyleAdvice[] = [
  { category: 'Sleep', scoreRange: '< 7 Hours', riskLevel: 'High Risk', adviceBlock: 'Shortchanging sleep increases risks for high blood pressure, heart disease, weight gain, and reduced immunity. Prioritize a consistent sleep-wake schedule and turn off electronic devices at least 60 minutes before bedtime to allow melatonin production.' },
  { category: 'Sleep', scoreRange: '7 to 9 Hours', riskLevel: 'Optimal', adviceBlock: 'You are meeting the landmark guidelines for recovery. This duration supports cognitive function, metabolic health, and muscle protein synthesis. Maintain a cool bedroom temperature between 60 and 67 degrees to ensure high sleep quality.' },
  { category: 'Stress', scoreRange: '27-40 (PSS)', riskLevel: 'High Risk', adviceBlock: 'Your perceived stress levels indicate a high risk for burnout and injury. High cortisol levels compete with anabolic hormones and sap lifting energy. Transition training to restorative sessions and prioritize mobility and sleep until scores improve.' },
  { category: 'Stress', scoreRange: '14-26 (PSS)', riskLevel: 'Moderate Risk', adviceBlock: 'You are experiencing moderate stress which can blunt the ability to recover from intense training. Monitor your recovery closely and consider reducing total training volume by 10-15% while incorporating stress management techniques like breathwork.' },
  { category: 'Stress', scoreRange: '0-13 (PSS)', riskLevel: 'Low Risk', adviceBlock: 'Your stress levels are well-managed and within the low range. This state is optimal for high-intensity interventions. Full training volume and progression are recommended as your body is in an ideal state for physiological adaptation.' },
  { category: 'Steps', scoreRange: '< 5000', riskLevel: 'Sedentary', adviceBlock: 'A sedentary lifestyle is defined by prolonged sitting and physical inactivity which increases the risk of metabolic syndrome. Aim for a minimum of 30 minutes of moderate-intensity activity five days per week to improve cardiovascular endurance.' },
  { category: 'Steps', scoreRange: '5000 to 10000', riskLevel: 'Active', adviceBlock: 'You are maintaining a foundational level of movement that supports joint health and metabolic rate. To further improve body composition and heart health, ensure at least two days per week include activities that maintain or increase muscular strength.' },
  { category: 'Steps', scoreRange: '> 10000', riskLevel: 'Highly Active', adviceBlock: 'Your high activity level provides significant protection against weight gain and chronic conditions like Type 2 diabetes. Ensure energy availability is sufficient to match this expenditure to prevent unintentional low energy availability.' },
];

