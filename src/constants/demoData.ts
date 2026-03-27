import type { ScoreSummary } from '@/lib/scoring/types';
import type { CoachPlan } from '@/lib/recommendations/types';

export const DEMO_SCORES: ScoreSummary = {
  overall: 72,
  fullProfileScore: 72,
  categories: [
    {
      id: 'bodyComp',
      title: 'Body Composition',
      score: 78,
      assessed: true,
      details: [
        { id: 'bodyFat', label: 'Body Fat', value: 18.5, unit: '%', score: 80 },
        { id: 'bmi', label: 'BMI', value: 24.2, unit: 'kg/m²', score: 82 },
        { id: 'waistHip', label: 'Waist-Hip Ratio', value: 0.84, score: 72 },
      ],
      strengths: ['Body fat within healthy range', 'Good lean mass distribution'],
      weaknesses: ['Waist-hip ratio slightly elevated'],
    },
    {
      id: 'cardio',
      title: 'Cardiovascular Fitness',
      score: 65,
      assessed: true,
      details: [
        { id: 'restingHR', label: 'Resting Heart Rate', value: 72, unit: 'bpm', score: 62 },
        { id: 'recoveryHR', label: 'Recovery Heart Rate', value: 28, unit: 'bpm drop', score: 68 },
      ],
      strengths: ['Adequate recovery rate'],
      weaknesses: ['Resting heart rate above optimal zone', 'Cardiovascular endurance needs improvement'],
    },
    {
      id: 'strength',
      title: 'Strength & Power',
      score: 70,
      assessed: true,
      details: [
        { id: 'pushUps', label: 'Push-Ups', value: 28, unit: 'reps', score: 72 },
        { id: 'plank', label: 'Plank Hold', value: 65, unit: 'sec', score: 60 },
        { id: 'grip', label: 'Grip Strength', value: 42, unit: 'kg', score: 78 },
      ],
      strengths: ['Upper body pressing adequate', 'Grip strength above average'],
      weaknesses: ['Core endurance below target'],
    },
    {
      id: 'movementQuality',
      title: 'Movement Quality',
      score: 68,
      assessed: true,
      details: [
        { id: 'shoulderMob', label: 'Shoulder Mobility', value: 'Limited', score: 55 },
        { id: 'hipMob', label: 'Hip Mobility', value: 'Adequate', score: 72 },
        { id: 'ankleDF', label: 'Ankle Dorsiflexion', value: 'Adequate', score: 70 },
      ],
      strengths: ['Hip mobility within functional range'],
      weaknesses: ['Shoulder mobility restricted — affects overhead movements', 'Ankle dorsiflexion borderline'],
      stretches: ['Doorway pec stretch', 'Lat foam roll', 'Wall ankle mobilization'],
      activations: ['Band pull-apart', 'Dead bug', 'Glute bridge'],
    },
    {
      id: 'lifestyle',
      title: 'Lifestyle Factors',
      score: 74,
      assessed: true,
      details: [
        { id: 'sleep', label: 'Sleep Quality', value: 'Good', score: 78 },
        { id: 'stress', label: 'Stress Level', value: 'Moderate', score: 60 },
        { id: 'nutrition', label: 'Nutrition Quality', value: 'Good', score: 80 },
        { id: 'hydration', label: 'Hydration', value: 'Adequate', score: 72 },
      ],
      strengths: ['Consistent sleep schedule', 'Good nutritional awareness'],
      weaknesses: ['Moderate work-related stress', 'Hydration could improve'],
      lifestyleAdvice: ['Add 10-min evening wind-down routine', 'Track daily water intake'],
    },
  ],
  synthesis: [
    {
      title: 'Shoulder Mobility Deficit',
      description: 'Restricted shoulder mobility limits overhead pressing and may contribute to compensatory movement patterns.',
      severity: 'medium',
    },
    {
      title: 'Cardiovascular Base Needed',
      description: 'Resting HR and recovery metrics suggest room for improvement in aerobic conditioning.',
      severity: 'medium',
    },
    {
      title: 'Core Stability Gap',
      description: 'Plank endurance is below target, which can affect compound lift performance and injury resilience.',
      severity: 'low',
    },
  ],
};

export const DEMO_GOALS = [
  'Improve overall fitness score to 80+',
  'Reduce body fat to 16%',
  'Run a 5K under 25 minutes',
];

export const DEMO_PLAN: CoachPlan = {
  keyIssues: [
    'Shoulder mobility restriction',
    'Below-target cardiovascular fitness',
    'Core endurance needs development',
  ],
  clientScript: {
    findings: [
      'Your overall score of 72 shows a solid foundation with clear areas for improvement.',
      'Body composition is in a healthy range — you\'re well-positioned for performance gains.',
      'Shoulder mobility and cardiovascular fitness are your two biggest opportunities.',
    ],
    whyItMatters: [
      'Improving shoulder mobility will unlock safer overhead movements and reduce injury risk.',
      'Building your cardio base will support recovery between sessions and daily energy levels.',
    ],
    actionPlan: [
      'We\'ll start with a 4-week mobility and aerobic block to build your foundation.',
      'Then transition to a strength-focused phase with progressive overload.',
      'Cardio will be programmed as zone 2 sessions 2-3x per week.',
    ],
    threeMonthOutlook: [
      'Expect shoulder mobility to reach functional range within 6 weeks.',
      'Cardiovascular score should improve 10-15 points by month 3.',
      'Overall score target: 80+ within 12 weeks.',
    ],
    clientCommitment: [
      '3 training sessions per week (60 min each)',
      'Daily 5-min mobility routine (shoulder focus)',
      '2 zone-2 cardio sessions per week (20-30 min)',
    ],
  },
  internalNotes: {
    doingWell: [
      'Client is motivated and consistent with attendance.',
      'Good nutritional habits — no major dietary changes needed.',
      'Upper body pressing strength is age-appropriate.',
    ],
    needsAttention: [
      'Monitor shoulder during overhead work — avoid end-range loading until mobility improves.',
      'Core training should precede compound lifts for neuromuscular activation.',
      'Stress management could become a limiter — check in regularly.',
    ],
  },
  programmingStrategies: [
    {
      title: 'Mobility First',
      exercises: ['Band pull-apart', 'Doorway pec stretch', 'Wall slides'],
      strategy: 'Open every session with 5 minutes of shoulder-specific mobility work.',
    },
    {
      title: 'Aerobic Base Building',
      exercises: ['Incline walk', 'Cycling', 'Rowing'],
      strategy: 'Two zone-2 sessions per week, 20-30 minutes, HR 120-140 bpm.',
    },
  ],
  movementBlocks: [
    {
      title: 'Corrective Block',
      objectives: ['Restore shoulder mobility', 'Activate core stabilizers'],
      exercises: [
        { name: 'Dead Bug', setsReps: '3 x 8 each side', notes: 'Maintain neutral spine' },
        { name: 'Band Pull-Apart', setsReps: '3 x 15', notes: 'Squeeze shoulder blades at end range' },
        { name: 'Half-Kneeling Press', setsReps: '3 x 10 each side', notes: 'Light load, focus on range' },
      ],
    },
  ],
};

export const DEMO_FORM_DATA = {
  clientName: 'Alex Thompson',
  fullName: 'Alex Thompson',
  age: '32',
  gender: 'male',
  height: '178',
  weight: '82',
  goals: DEMO_GOALS.join(', '),
  sleepQuality: 'good',
  stressLevel: 'moderate',
  nutritionQuality: 'good',
  hydration: 'adequate',
  exerciseFrequency: '3-4',
  activityLevel: 'moderate',
} as Record<string, string>;
