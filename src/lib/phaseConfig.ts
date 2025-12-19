import type { FormData } from '@/contexts/FormContext';

export type PhaseId = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'choice' | 'multiselect' | 'parq' | 'email' | 'tel' | 'date' | 'time';

export interface PhaseField {
  id: keyof FormData;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  tooltip?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  readOnly?: boolean;
  pattern?: string; // Movement pattern (e.g., 'Hip Hinge', 'Lunge')
  side?: 'left' | 'right'; // For side-by-side comparison
  pairId?: string; // To group fields together on one screen
  conditional?: {
    showWhen: {
      field: string;
      value?: string;
      notValue?: string;
      exists?: boolean;
      includes?: string;
    };
  };
}

export interface PhaseSection {
  id: string;
  title: string;
  description?: string;
  instructions?: {
    clientInstructions: string;
    coachNotes: string;
  };
  fields: PhaseField[];
}

export interface PhaseDefinition {
  id: PhaseId;
  title: string;
  summary: string;
  gateHint?: string;
  fields?: PhaseField[];
  sections?: PhaseSection[];
  gatedWarning?: (formData: FormData) => string | null;
}

export interface IntakeField extends PhaseField {
  id: keyof FormData;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
}

// intakeFields moved to P1 Lifestyle Assessment section

export const phaseDefinitions: PhaseDefinition[] = [
  {
    id: 'P0',
    title: 'Basic Client Info',
    summary: 'Collect basic client information.',
    gateHint: 'Complete before starting assessment.',
    sections: [
      {
        id: 'basic-client-info',
        title: 'Basic Client Info',
        description: 'Personal and contact details.',
        fields: [
          { id: 'fullName' as keyof FormData, type: 'text' as FieldType, label: 'Name', required: true, placeholder: 'First and last name' },
          { id: 'email' as keyof FormData, type: 'email' as FieldType, label: 'Email address', required: true, placeholder: 'client@email.com' },
          { id: 'phone' as keyof FormData, type: 'tel' as FieldType, label: 'Phone number', required: true, placeholder: '(555) 123-4567' },
          { id: 'dateOfBirth' as keyof FormData, type: 'date' as FieldType, label: 'Date of birth', required: true },
          { id: 'heightCm' as keyof FormData, type: 'number' as FieldType, label: 'Height (cm)', required: true, placeholder: 'e.g., 175' },
          { id: 'gender' as keyof FormData, type: 'select' as FieldType, label: 'Gender', required: true, options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }] },
          { id: 'assignedCoach' as keyof FormData, type: 'select' as FieldType, label: 'Assigned Coach', required: true, options: [{ value: 'coach-mike', label: 'Coach Mike' }, { value: 'coach-selina', label: 'Coach Selina' }] },
        ],
      },
    ],
  },
  {
    id: 'P1',
    title: 'Lifestyle Overview',
    summary: 'Daily habits that impact training and recovery.',
    gateHint: 'Complete lifestyle before health screening.',
    sections: [
      {
        id: 'lifestyle-overview',
        title: 'Lifestyle Overview',
        description: 'Habits and routines.',
        fields: [
          { id: 'activityLevel' as keyof FormData, type: 'select' as FieldType, label: 'Activity Level', required: true, tooltip: 'How active are you outside dedicated workouts? (daily movement, job activity, errands).', options: [
            { value: 'sedentary', label: 'Sedentary' },
            { value: 'lightly-active', label: 'Lightly Active' },
            { value: 'moderately-active', label: 'Moderately Active' },
            { value: 'very-active', label: 'Very Active' },
            { value: 'extremely-active', label: 'Extremely Active' },
          ]},
          { id: 'stepsPerDay' as keyof FormData, type: 'number' as FieldType, label: 'Average steps per day', required: true, placeholder: 'e.g., 6500', tooltip: 'Typical daily steps over the last 1–2 weeks (watch/phone estimate is fine).' },
          { id: 'sedentaryHours' as keyof FormData, type: 'number' as FieldType, label: 'Sedentary hours', required: true, placeholder: 'e.g., 8', tooltip: 'Approximate hours spent sitting or inactive on a typical day.' },
          { id: 'workHoursPerDay' as keyof FormData, type: 'number' as FieldType, label: 'Work hours', required: true, placeholder: 'e.g., 9', tooltip: 'Typical hours worked per day. Helps tailor training volume and recovery.' },
          { id: 'sleepQuality' as keyof FormData, type: 'select' as FieldType, label: 'Sleep quality', required: true, tooltip: 'Coach framing: overall restfulness and continuity (uninterrupted sleep, fewer awakenings, feel rested). Not deep sleep %, just perceived quality.', options: [
            { value: 'poor', label: 'Poor' }, { value: 'fair', label: 'Fair' }, { value: 'good', label: 'Good' }, { value: 'excellent', label: 'Excellent' }
          ]},
          { id: 'sleepDuration' as keyof FormData, type: 'select' as FieldType, label: 'Sleep Duration', required: true, tooltip: 'Average total hours of sleep per night over the last 1–2 weeks.', options: [
            { value: 'less-than-5', label: '<5h' }, { value: '5-6', label: '5-6h' }, { value: '6-7', label: '6-7h' }, { value: '7-8', label: '7-8h' }, { value: '8-9', label: '8-9h' }, { value: 'more-than-9', label: '>9h' }
          ]},
          { id: 'sleepConsistency' as keyof FormData, type: 'select' as FieldType, label: 'Sleep schedule consistency', required: true, tooltip: 'How consistent are bedtime and wake times across the week.', options: [
            { value: 'very-inconsistent', label: 'Very inconsistent' }, { value: 'inconsistent', label: 'Inconsistent' }, { value: 'consistent', label: 'Consistent' }, { value: 'very-consistent', label: 'Very consistent' }
          ]},
          { id: 'stressLevel' as keyof FormData, type: 'select' as FieldType, label: 'Stress levels', required: true, tooltip: 'Perceived day-to-day stress (work, life load). Helps modulate training intensity.', options: [
            { value: 'very-low', label: 'Very low' }, { value: 'low', label: 'Low' }, { value: 'moderate', label: 'Moderate' }, { value: 'high', label: 'High' }, { value: 'very-high', label: 'Very high' }
          ]},
          { id: 'nutritionHabits' as keyof FormData, type: 'select' as FieldType, label: 'Nutrition habits', required: true, tooltip: 'Overall food quality and consistency (protein, whole foods, balanced meals).', options: [
            { value: 'poor', label: 'Poor' }, { value: 'fair', label: 'Fair' }, { value: 'good', label: 'Good' }, { value: 'excellent', label: 'Excellent' }
          ]},
          { id: 'hydrationHabits' as keyof FormData, type: 'select' as FieldType, label: 'Hydration habits', required: true, tooltip: 'Typical daily water/fluid intake and consistency.', options: [
            { value: 'poor', label: 'Poor' }, { value: 'fair', label: 'Fair' }, { value: 'good', label: 'Good' }, { value: 'excellent', label: 'Excellent' }
          ]},
          { id: 'caffeineCupsPerDay' as keyof FormData, type: 'number' as FieldType, label: 'Caffeine intake (cups per day)', required: true, placeholder: 'e.g., 2', tooltip: 'Average number of caffeinated drinks per day (coffee, tea, energy drinks).' },
          { id: 'lastCaffeineIntake' as keyof FormData, type: 'time' as FieldType, label: 'Time of last caffeine intake', required: true, tooltip: 'Time of your most recent caffeine serving (helps with sleep timing).', conditional: { showWhen: { field: 'caffeineCupsPerDay', exists: true, notValue: '0' } } },
        ],
      }
    ],
  },
  {
    id: 'P2',
    title: 'Health screen and body comp',
    summary: 'PAR-Q and Inbody scan.',
    gateHint: 'Complete before movement assessment.',
    sections: [
      {
        id: 'parq',
        title: 'Par Q',
        description: 'Physical Activity Readiness Questionnaire',
        fields: [
          {
            id: 'parqQuestionnaire' as keyof FormData,
            type: 'parq' as FieldType,
            label: 'PAR-Q Questionnaire',
            required: true,
          },
        ],
      },
      {
        id: 'body-comp',
        title: 'InBody 270 Scan',
        description: 'Collect the 12 primary markers from the InBody 270 for clear decisions.',
        fields: [
          // InBody Score first per 270 summary
          { id: 'inbodyScore' as keyof FormData, type: 'number' as FieldType, label: 'InBody Score', required: true, placeholder: 'e.g., 78', tooltip: 'Client-friendly marker that improves as fat ↓ and muscle ↑.' },
          // Order aligned to InBody 270 printout (approximate)
          // Body Composition (top)
          { id: 'inbodyWeightKg' as keyof FormData, type: 'number' as FieldType, label: 'Weight (kg)', required: true, placeholder: 'e.g., 78.2', tooltip: 'Baseline for trend tracking. Never used alone as a progress metric.' },
          { id: 'skeletalMuscleMassKg' as keyof FormData, type: 'number' as FieldType, label: 'Skeletal Muscle Mass (kg)', required: true, placeholder: 'e.g., 36.4', tooltip: 'Core metabolic/strength indicator. Low SMM → prioritise hypertrophy and protein targets.' },
          { id: 'bodyFatMassKg' as keyof FormData, type: 'number' as FieldType, label: 'Body Fat Mass (kg)', required: true, placeholder: 'e.g., 21.3', tooltip: 'Used to set specific fat-loss targets and timelines.' },
          { id: 'inbodyBodyFatPct' as keyof FormData, type: 'number' as FieldType, label: 'Body Fat (%)', required: true, placeholder: 'e.g., 18.5', tooltip: 'Primary health risk indicator (Men >25% / Women >32% = high risk).' },
          // Obesity / Hydration
          { id: 'inbodyBmi' as keyof FormData, type: 'number' as FieldType, label: 'BMI', required: true, placeholder: 'e.g., 24.8', tooltip: 'Included for familiarity; not used for decisions.' },
          { id: 'totalBodyWaterL' as keyof FormData, type: 'number' as FieldType, label: 'Total Body Water (L)', required: true, placeholder: 'e.g., 41.0', tooltip: 'Hydration context only on 270. Use for scan-to-scan consistency.' },
          { id: 'waistHipRatio' as keyof FormData, type: 'number' as FieldType, label: 'Waist-to-Hip Ratio (WHR)', required: true, placeholder: 'e.g., 0.92', tooltip: 'Men: <0.90 low, 0.90–0.99 moderate, ≥1.00 high. Women: <0.80 low, 0.80–0.89 moderate, ≥0.90 high.' },
          { id: 'visceralFatLevel' as keyof FormData, type: 'number' as FieldType, label: 'Visceral Fat Level', required: true, placeholder: 'e.g., 9', tooltip: 'InBody 270: 12+ high risk; 10–11 borderline; <10 healthy.' },

          // Segmental Lean Analysis (kg only) — Trunk, Left arm, Right arm, Left leg, Right leg
          { id: 'segmentalTrunkKg' as keyof FormData, type: 'number' as FieldType, label: 'Trunk lean (kg)', required: true, placeholder: 'e.g., 28.5' },
          { id: 'segmentalArmLeftKg' as keyof FormData, type: 'number' as FieldType, label: 'Left arm', side: 'left', pairId: 'arm-lean', required: true, placeholder: 'e.g., 3.1' },
          { id: 'segmentalArmRightKg' as keyof FormData, type: 'number' as FieldType, label: 'Right arm', side: 'right', pairId: 'arm-lean', required: true, placeholder: 'e.g., 3.2', tooltip: 'Use left/right kg to detect imbalances (≥10% significant).' },
          { id: 'segmentalLegLeftKg' as keyof FormData, type: 'number' as FieldType, label: 'Left leg', side: 'left', pairId: 'leg-lean', required: true, placeholder: 'e.g., 9.1' },
          { id: 'segmentalLegRightKg' as keyof FormData, type: 'number' as FieldType, label: 'Right leg', side: 'right', pairId: 'leg-lean', required: true, placeholder: 'e.g., 9.7' },

          // SECTION 4 — METABOLIC BASELINE
          { id: 'bmrKcal' as keyof FormData, type: 'number' as FieldType, label: 'BMR (kcal)', required: true, placeholder: 'e.g., 1620', tooltip: 'Set calorie targets; typically rises with higher SMM.' },
        ]
      }
    ],
  },
  {
    id: 'P3',
    title: 'Fitness assessment',
    summary: 'Select and run cardio test.',
    sections: [
      {
        id: 'fitness-assessment',
        title: 'Fitness assessment',
        description: 'Choose test; follow steps for timing and measures.',
        instructions: {
          clientInstructions: 'Follow coach instructions during the test.',
          coachNotes: 'Resting HR: Measure before test after 3m seated rest. Post-test: Record HR exactly 60s after test stops.'
        },
        fields: [
          { id: 'cardioTestSelected' as keyof FormData, type: 'select' as FieldType, label: 'Select test', required: true, options: [
            { value: 'ymca-step', label: 'YMCA step test' },
            { value: 'treadmill', label: 'Treadmill test' },
          ]},
          // Simplified fields common to both tests
          { id: 'cardioRestingHr' as keyof FormData, type: 'number' as FieldType, label: 'Resting Heart Rate (bpm)', required: true, tooltip: 'Measure after 3 minutes seated rest before the test.' },
          { id: 'cardioPost1MinHr' as keyof FormData, type: 'number' as FieldType, label: '1-min Post-Test HR (HR₆₀, bpm)', required: true, tooltip: 'Record heart rate exactly 60s after test completion.' },
        ],
      },
    ],
  },
  {
    id: 'P4',
    title: 'Posture, movement and mobility',
    summary: 'Posture, movement patterns, and mobility screens.',
    sections: [
      {
        id: 'posture',
        title: 'Posture',
        description: 'Standing posture evaluation.',
        fields: [
          {
            id: 'postureHeadOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Head and neck alignment',
            required: true,
            tooltip: 'Forward head means the head juts forward; neutral means stacked over shoulders.',
            options: [
              { value: 'neutral', label: 'Neutral' },
              { value: 'forward-head', label: 'Forward head posture (head juts forward)' },
              { value: 'tilted', label: 'Head tilted to one side' },
              { value: 'chin-tucked', label: 'Chin excessively tucked' },
            ],
          },
          {
            id: 'postureShouldersOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Shoulder and upper back',
            required: true,
            tooltip: 'Winged scapula means the shoulder blade sticks out from the rib cage.',
            options: [
              { value: 'neutral', label: 'Neutral' },
              { value: 'rounded', label: 'Rounded shoulders' },
              { value: 'elevated', label: 'One shoulder elevated' },
              { value: 'winged-scapula', label: 'Scapula winging (shoulder blade sticks out)' },
            ],
          },
          {
            id: 'postureBackOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Back and spine',
            required: true,
            options: [
              { value: 'neutral', label: 'Neutral' },
              { value: 'increased-kyphosis', label: 'Increased kyphosis (upper back rounded)' },
              { value: 'increased-lordosis', label: 'Increased lordosis (excess lower-back arch)' },
              { value: 'scoliosis', label: 'Scoliosis (side-to-side curve)' },
              { value: 'flat-back', label: 'Flat back (reduced curves)' },
            ],
          },
          {
            id: 'postureHipsOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Hips alignment',
            required: true,
            tooltip: 'Anterior tilt means pelvis tilts forward; posterior tilt means pelvis tilts backward.',
            options: [
              { value: 'neutral', label: 'Neutral' },
              { value: 'anterior-tilt', label: 'Anterior pelvic tilt (pelvis forward)' },
              { value: 'posterior-tilt', label: 'Posterior pelvic tilt (pelvis backward)' },
            ],
          },
          {
            id: 'postureKneesOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Knees alignment',
            required: true,
            tooltip: 'Valgus means knees cave inward; varus means knees bow outward.',
            options: [
              { value: 'neutral', label: 'Neutral' },
              { value: 'valgus-knee', label: 'Knee valgus (knees cave inward)' },
              { value: 'varus-knee', label: 'Knee varus (knees bow outward)' },
            ],
          },
        ],
      },
      {
        id: 'overhead-squat',
        title: 'Overhead Squat',
        description: 'Movement quality with arms overhead.',
        fields: [
          {
            id: 'ohsShoulderMobility' as keyof FormData, type: 'select' as FieldType, label: 'Shoulder mobility', pattern: 'Overhead Squat', required: true, options: [
              { value: 'full-range', label: 'Full range' }, { value: 'compensated', label: 'Compensated' }, { value: 'limited', label: 'Limited' }
            ]
          },
          { id: 'ohsTorsoLean' as keyof FormData, type: 'select' as FieldType, label: 'Torso lean', pattern: 'Overhead Squat', required: true, options: [
            { value: 'upright', label: 'Upright' }, { value: 'moderate-lean', label: 'Moderate lean' }, { value: 'excessive-lean', label: 'Excessive lean' }
          ]},
          { id: 'ohsSquatDepth' as keyof FormData, type: 'select' as FieldType, label: 'Squat depth', pattern: 'Overhead Squat', required: true, options: [
            { value: 'full-depth', label: 'Full depth' }, { value: 'parallel', label: 'Parallel' }, { value: 'quarter-depth', label: 'Quarter' }, { value: 'no-depth', label: 'Minimal' }
          ]},
          { id: 'ohsHipShift' as keyof FormData, type: 'select' as FieldType, label: 'Hip shift', pattern: 'Overhead Squat', required: true, options: [
            { value: 'none', label: 'None' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }
          ]},
          { id: 'ohsKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: 'Knee alignment', pattern: 'Overhead Squat', required: true, tooltip: 'Valgus = knees cave in; Varus = knees bow out.', options: [
            { value: 'stable', label: 'Stable' }, { value: 'valgus', label: 'Valgus (knees cave in)' }, { value: 'varus', label: 'Varus (knees bow out)' }
          ]},
          { id: 'ohsFeetPosition' as keyof FormData, type: 'select' as FieldType, label: 'Foot behaviour', pattern: 'Overhead Squat', required: true, tooltip: 'Pronation = foot rolls inward; Supination = foot rolls outward.', options: [
            { value: 'stable', label: 'Stable' }, { value: 'pronation', label: 'Pronation (rolls inward)' }, { value: 'supination', label: 'Supination (rolls outward)' }
          ]},
        ],
      },
      {
        id: 'hinge-assessment',
        title: 'Hinge',
        description: 'Hip hinge movement.',
        fields: [
          { id: 'hingeDepth' as keyof FormData, type: 'select' as FieldType, label: 'Depth', pattern: 'Hip Hinge', required: true, options: [
            { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'hingeBackRounding' as keyof FormData, type: 'select' as FieldType, label: 'Back rounding', pattern: 'Hip Hinge', required: true, options: [
            { value: 'none', label: 'None' }, { value: 'minor', label: 'Minor' }, { value: 'moderate', label: 'Moderate' }, { value: 'severe', label: 'Severe' }
          ]},
        ]
      },
      {
        id: 'lunge-assessment',
        title: 'Lunge',
        description: 'Unilateral control and knee tracking.',
        fields: [
          { id: 'lungeLeftBalance' as keyof FormData, type: 'select' as FieldType, label: 'Balance', pattern: 'Lunge', side: 'left', pairId: 'lunge-balance', required: true, options: [
            { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'lungeRightBalance' as keyof FormData, type: 'select' as FieldType, label: 'Balance', pattern: 'Lunge', side: 'right', pairId: 'lunge-balance', required: true, options: [
            { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'lungeLeftKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: 'Knee tracking', pattern: 'Lunge', side: 'left', pairId: 'lunge-knee', required: true, tooltip: 'Valgus = caves inward; Varus = bows outward.', options: [
            { value: 'tracks-straight', label: 'Tracks straight' }, { value: 'caves-inward', label: 'Caves inward (valgus)' }, { value: 'bows-outward', label: 'Bows outward (varus)' }
          ]},
          { id: 'lungeRightKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: 'Knee tracking', pattern: 'Lunge', side: 'right', pairId: 'lunge-knee', required: true, tooltip: 'Valgus = caves inward; Varus = bows outward.', options: [
            { value: 'tracks-straight', label: 'Tracks straight' }, { value: 'caves-inward', label: 'Caves inward (valgus)' }, { value: 'bows-outward', label: 'Bows outward (varus)' }
          ]},
          { id: 'lungeLeftTorso' as keyof FormData, type: 'select' as FieldType, label: 'Hips position', pattern: 'Lunge', side: 'left', pairId: 'lunge-hips', required: true, tooltip: 'Anterior tilt = pelvis forward; Posterior tilt = pelvis backward.', options: [
            { value: 'neutral', label: 'Neutral' }, { value: 'anterior-tilt', label: 'Anterior tilt (pelvis forward)' }, { value: 'posterior-tilt', label: 'Posterior tilt (pelvis backward)' }
          ]},
          { id: 'lungeRightTorso' as keyof FormData, type: 'select' as FieldType, label: 'Hips position', pattern: 'Lunge', side: 'right', pairId: 'lunge-hips', required: true, tooltip: 'Anterior tilt = pelvis forward; Posterior tilt = pelvis backward.', options: [
            { value: 'neutral', label: 'Neutral' }, { value: 'anterior-tilt', label: 'Anterior tilt (pelvis forward)' }, { value: 'posterior-tilt', label: 'Posterior tilt (pelvis backward)' }
          ]},
        ]
      },
      {
        id: 'mobility',
        title: 'Mobility',
        description: 'Joint mobility screens.',
        fields: [
          { id: 'mobilityHip' as keyof FormData, type: 'select' as FieldType, label: 'Hip mobility', pattern: 'Hip Mobility', required: true, tooltip: 'Evaluate range of motion in the hip joints through flexion, extension, and rotation.', options: [
            { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'mobilityShoulder' as keyof FormData, type: 'select' as FieldType, label: 'Shoulder mobility', pattern: 'Shoulder Mobility', required: true, tooltip: 'Evaluate range of motion in the shoulder girdle, including overhead reach and rotation.', options: [
            { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'mobilityAnkle' as keyof FormData, type: 'select' as FieldType, label: 'Ankle mobility', pattern: 'Ankle Mobility', required: true, tooltip: 'Evaluate dorsiflexion range of motion, critical for squat depth and gait mechanics.', options: [
            { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
        ]
      },
    ],
  },
  {
    id: 'P5',
    title: 'Muscular strength and endurance',
    summary: 'Basic strength and endurance metrics.',
    sections: [
      {
        id: 'strength-endurance',
        title: 'Muscular strength and endurance',
        description: 'Reps and holds.',
        fields: [
          { id: 'squatsOneMinuteReps' as keyof FormData, type: 'number' as FieldType, label: 'Squats in one minute', required: true, placeholder: 'e.g., 40' },
          { id: 'pushupsOneMinuteReps' as keyof FormData, type: 'number' as FieldType, label: 'Pushups in one minute', required: true, placeholder: 'e.g., 25' },
          { id: 'plankDurationSeconds' as keyof FormData, type: 'number' as FieldType, label: 'Plank duration (seconds)', required: true, placeholder: 'e.g., 60' },
          { id: 'gripLeftKg' as keyof FormData, type: 'number' as FieldType, label: 'Left hand', pattern: 'Grip Strength', side: 'left', pairId: 'grip-strength', required: true, placeholder: 'e.g., 24' },
          { id: 'gripRightKg' as keyof FormData, type: 'number' as FieldType, label: 'Right hand', pattern: 'Grip Strength', side: 'right', pairId: 'grip-strength', required: true, placeholder: 'e.g., 26' },
        ]
      },
    ],
  },
  {
    id: 'P6',
    title: 'Goals & Planning',
    summary: 'Set ambitions after we understand your baseline.',
    sections: [
      {
        id: 'goals',
        title: 'Goals',
        description: 'Select your goals and ambition level. Recommendations use your baseline data.',
        fields: [
          {
            id: 'clientGoals' as keyof FormData,
            type: 'multiselect' as FieldType,
            label: 'Client Goals',
            required: true,
            placeholder: 'Select one or more goals',
            tooltip: 'Select multiple goals. The roadmap and recommendations will prioritise toward these.',
            options: [
              { value: 'build-muscle', label: 'Build muscle' },
              { value: 'weight-loss', label: 'Weight loss' },
              { value: 'build-strength', label: 'Build strength' },
              { value: 'improve-fitness', label: 'Improve fitness' },
              { value: 'general-health', label: 'General health' },
            ],
          },
          {
            id: 'goalLevelWeightLoss' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Weight loss target level',
            required: true,
            tooltip: 'Ambition level calibrated to your height/weight.',
            options: [
              { value: 'health-minimum', label: 'Minimum for good health' },
              { value: 'average', label: 'Average target' },
              { value: 'above-average', label: 'Above average (recommended)' },
              { value: 'elite', label: 'Go all the way (long-term)' },
            ],
            conditional: { showWhen: { field: 'clientGoals', includes: 'weight-loss' } },
          },
          {
            id: 'goalLevelMuscle' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Muscle gain target level',
            required: true,
            options: [
              { value: 'health-minimum', label: 'Minimum visible change' },
              { value: 'average', label: 'Average (noticeable)' },
              { value: 'above-average', label: 'Above average (recommended)' },
              { value: 'elite', label: 'Go all the way (long-term)' },
            ],
            conditional: { showWhen: { field: 'clientGoals', includes: 'build-muscle' } },
          },
          {
            id: 'goalLevelStrength' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Strength target level',
            required: true,
            options: [
              { value: 'health-minimum', label: 'Solid base (health & function)' },
              { value: 'average', label: 'Average lifter' },
              { value: 'above-average', label: 'Advanced ratios (recommended)' },
              { value: 'elite', label: 'Competition-leaning (long-term)' },
            ],
            conditional: { showWhen: { field: 'clientGoals', includes: 'build-strength' } },
          },
          {
            id: 'goalLevelFitness' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Fitness target level',
            required: true,
            options: [
              { value: 'health-minimum', label: 'Comfortable daily fitness' },
              { value: 'average', label: 'Recreational runner/cyclist' },
              { value: 'above-average', label: 'Strong recreational (recommended)' },
              { value: 'elite', label: 'Competitive endurance (long-term)' },
            ],
            conditional: { showWhen: { field: 'clientGoals', includes: 'improve-fitness' } },
          },
          {
            id: 'goalLevelHealth' as keyof FormData,
            type: 'select' as FieldType,
            label: 'General health target level',
            required: true,
            options: [
              { value: 'health-minimum', label: 'Baseline health markers' },
              { value: 'average', label: 'Robust health & energy' },
              { value: 'above-average', label: 'Vibrant longevity (recommended)' },
              { value: 'elite', label: 'Peak human performance' },
            ],
            conditional: { showWhen: { field: 'clientGoals', includes: 'general-health' } },
          },
        ],
      },
    ],
  },
  {
    id: 'P7',
    title: 'Results',
    summary: 'Review results and create reports.',
    gateHint: 'Assessment complete.',
    sections: [],
  },
];
