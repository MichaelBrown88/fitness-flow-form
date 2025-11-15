import type { FormData } from '@/contexts/FormContext';

export type PhaseId = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';

export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'choice' | 'multiselect' | 'parq' | 'email' | 'tel' | 'date';

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
  conditional?: {
    showWhen: {
      field: string;
      value: string;
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

export const phaseDefinitions = [
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
        instructions: {
          clientInstructions: 'Provide your contact info to begin.',
          coachNotes: 'Ensure accuracy before proceeding.'
        },
        fields: [
          { id: 'fullName' as keyof FormData, type: 'text' as FieldType, label: 'Name', required: true, placeholder: 'First and last name' },
          { id: 'email' as keyof FormData, type: 'email' as FieldType, label: 'Email address', required: true, placeholder: 'client@email.com' },
          { id: 'phone' as keyof FormData, type: 'tel' as FieldType, label: 'Phone number', required: true, placeholder: '(555) 123-4567' },
          { id: 'dateOfBirth' as keyof FormData, type: 'date' as FieldType, label: 'Date of birth', required: true },
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
        instructions: {
          clientInstructions: 'Answer honestly about your typical routines.',
          coachNotes: 'Use to set volume and recovery strategies.'
        },
        fields: [
          { id: 'activityLevel' as keyof FormData, type: 'select' as FieldType, label: 'Activity Level', required: true, options: [
            { value: 'sedentary', label: 'Sedentary' },
            { value: 'lightly-active', label: 'Lightly Active' },
            { value: 'moderately-active', label: 'Moderately Active' },
            { value: 'very-active', label: 'Very Active' },
            { value: 'extremely-active', label: 'Extremely Active' },
          ]},
          { id: 'sedentaryHours' as keyof FormData, type: 'number' as FieldType, label: 'Sedentary hours', placeholder: 'e.g., 8' },
          { id: 'workHoursPerDay' as keyof FormData, type: 'number' as FieldType, label: 'Work hours', placeholder: 'e.g., 9' },
          { id: 'sleepQuality' as keyof FormData, type: 'select' as FieldType, label: 'Sleep quality', options: [
            { value: 'poor', label: 'Poor' }, { value: 'fair', label: 'Fair' }, { value: 'good', label: 'Good' }, { value: 'excellent', label: 'Excellent' }
          ]},
          { id: 'sleepDuration' as keyof FormData, type: 'select' as FieldType, label: 'Sleep Duration', options: [
            { value: 'less-than-5', label: '<5h' }, { value: '5-6', label: '5-6h' }, { value: '6-7', label: '6-7h' }, { value: '7-8', label: '7-8h' }, { value: '8-9', label: '8-9h' }, { value: 'more-than-9', label: '>9h' }
          ]},
          { id: 'sleepConsistency' as keyof FormData, type: 'select' as FieldType, label: 'Sleep schedule consistency', options: [
            { value: 'very-inconsistent', label: 'Very inconsistent' }, { value: 'inconsistent', label: 'Inconsistent' }, { value: 'consistent', label: 'Consistent' }, { value: 'very-consistent', label: 'Very consistent' }
          ]},
          { id: 'stressLevel' as keyof FormData, type: 'select' as FieldType, label: 'Stress levels', options: [
            { value: 'very-low', label: 'Very low' }, { value: 'low', label: 'Low' }, { value: 'moderate', label: 'Moderate' }, { value: 'high', label: 'High' }, { value: 'very-high', label: 'Very high' }
          ]},
          { id: 'nutritionHabits' as keyof FormData, type: 'select' as FieldType, label: 'Nutrition habits', options: [
            { value: 'poor', label: 'Poor' }, { value: 'fair', label: 'Fair' }, { value: 'good', label: 'Good' }, { value: 'excellent', label: 'Excellent' }
          ]},
          { id: 'hydrationHabits' as keyof FormData, type: 'select' as FieldType, label: 'Hydration habits', options: [
            { value: 'poor', label: 'Poor' }, { value: 'fair', label: 'Fair' }, { value: 'good', label: 'Good' }, { value: 'excellent', label: 'Excellent' }
          ]},
          { id: 'caffeineCupsPerDay' as keyof FormData, type: 'number' as FieldType, label: 'Caffeine intake (cups per day)', placeholder: 'e.g., 2' },
          { id: 'lastCaffeineIntake' as keyof FormData, type: 'text' as FieldType, label: 'Last caffeine intake', placeholder: 'e.g., 2:00 PM' },
          { id: 'stepsPerDay' as keyof FormData, type: 'number' as FieldType, label: 'Average steps per day', placeholder: 'e.g., 6500' },
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
        instructions: {
          clientInstructions: 'Answer the PAR-Q+ honestly.',
          coachNotes: 'If flags appear, pause testing and refer as needed.'
        },
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
        title: 'Inbody Scan',
        description: 'Body composition scan results.',
        instructions: {
          clientInstructions: 'Stand still on the machine as instructed.',
          coachNotes: 'Record primary metrics from scan.'
        },
        fields: [
          { id: 'inbodyWeightKg' as keyof FormData, type: 'number' as FieldType, label: 'Weight (kg)', placeholder: 'e.g., 78.2' },
          { id: 'inbodyBodyFatPct' as keyof FormData, type: 'number' as FieldType, label: 'Body Fat (%)', placeholder: 'e.g., 18.5' },
          { id: 'skeletalMuscleMassKg' as keyof FormData, type: 'number' as FieldType, label: 'Skeletal Muscle Mass (kg)', placeholder: 'e.g., 36.4' },
          { id: 'visceralFatLevel' as keyof FormData, type: 'number' as FieldType, label: 'Visceral Fat Level', placeholder: 'e.g., 9' },
          { id: 'segmentalLeanImbalancePct' as keyof FormData, type: 'number' as FieldType, label: 'Segmental Lean Imbalance (%)', placeholder: 'e.g., 3' },
        ]
      }
    ],
  },
  {
    id: 'P3',
    title: 'Posture, movement and mobility',
    summary: 'Posture, movement patterns, and mobility screens.',
    sections: [
      {
        id: 'posture',
        title: 'Posture',
        description: 'Standing posture evaluation.',
        instructions: {
          clientInstructions: 'Stand naturally, look straight ahead.',
          coachNotes: 'Observe head/neck, shoulders, spine, hips, knees.'
        },
        fields: [
          {
            id: 'postureHeadOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Head and neck alignment',
            options: [
              { value: 'neutral', label: 'Neutral' },
              { value: 'forward-head', label: 'Forward head posture' },
              { value: 'tilted', label: 'Head tilted to one side' },
              { value: 'chin-tucked', label: 'Chin excessively tucked' },
            ],
          },
          {
            id: 'postureShouldersOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Shoulder and upper back',
            options: [
              { value: 'neutral', label: 'Neutral' },
              { value: 'rounded', label: 'Rounded shoulders' },
              { value: 'elevated', label: 'One shoulder elevated' },
              { value: 'winged-scapula', label: 'Scapula winging' },
            ],
          },
          {
            id: 'postureBackOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Back and spine',
            options: [
              { value: 'neutral', label: 'Neutral' },
              { value: 'increased-kyphosis', label: 'Increased kyphosis' },
              { value: 'increased-lordosis', label: 'Increased lordosis' },
              { value: 'scoliosis', label: 'Scoliosis' },
              { value: 'flat-back', label: 'Flat back' },
            ],
          },
          {
            id: 'postureHipsOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Hips and knees',
            options: [
              { value: 'neutral', label: 'Neutral' },
              { value: 'anterior-tilt', label: 'Anterior pelvic tilt' },
              { value: 'posterior-tilt', label: 'Posterior pelvic tilt' },
              { value: 'valgus-knee', label: 'Knee valgus' },
              { value: 'varus-knee', label: 'Knee varus' },
            ],
          },
        ],
      },
      {
        id: 'overhead-squat',
        title: 'Overhead Squat',
        description: 'Movement quality with arms overhead.',
        instructions: {
          clientInstructions: 'Perform with control.',
          coachNotes: 'Observe compensations and depth.'
        },
        fields: [
          {
            id: 'ohsShoulderMobility' as keyof FormData, type: 'select' as FieldType, label: 'Shoulder mobility', options: [
              { value: 'full-range', label: 'Full range' }, { value: 'compensated', label: 'Compensated' }, { value: 'limited', label: 'Limited' }
            ]
          },
          { id: 'ohsTorsoLean' as keyof FormData, type: 'select' as FieldType, label: 'Torso lean', options: [
            { value: 'upright', label: 'Upright' }, { value: 'moderate-lean', label: 'Moderate lean' }, { value: 'excessive-lean', label: 'Excessive lean' }
          ]},
          { id: 'ohsSquatDepth' as keyof FormData, type: 'select' as FieldType, label: 'Squat depth', options: [
            { value: 'full-depth', label: 'Full depth' }, { value: 'parallel', label: 'Parallel' }, { value: 'quarter-depth', label: 'Quarter' }, { value: 'no-depth', label: 'Minimal' }
          ]},
          { id: 'ohsHipShift' as keyof FormData, type: 'select' as FieldType, label: 'Hip shift', options: [
            { value: 'none', label: 'None' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }
          ]},
          { id: 'ohsFootKneeBehavior' as keyof FormData, type: 'select' as FieldType, label: 'Foot and knee behaviour', options: [
            { value: 'stable', label: 'Stable' }, { value: 'pronation/valgus', label: 'Pronation/valgus' }, { value: 'supination/varus', label: 'Supination/varus' }
          ]},
        ],
      },
      {
        id: 'hinge-assessment',
        title: 'Hinge',
        description: 'Hip hinge movement.',
        instructions: {
          clientInstructions: 'Maintain neutral spine.',
          coachNotes: 'Look for depth and rounding.'
        },
        fields: [
          { id: 'hingeDepth' as keyof FormData, type: 'select' as FieldType, label: 'Depth', options: [
            { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'hingeBackRounding' as keyof FormData, type: 'select' as FieldType, label: 'Back rounding', options: [
            { value: 'none', label: 'None' }, { value: 'minor', label: 'Minor' }, { value: 'moderate', label: 'Moderate' }, { value: 'severe', label: 'Severe' }
          ]},
        ]
      },
      {
        id: 'lunge-assessment',
        title: 'Lunge',
        description: 'Unilateral control and knee tracking.',
        instructions: {
          clientInstructions: 'Step forward and lower under control.',
          coachNotes: 'Observe balance, knee tracking, and hip position.'
        },
        fields: [
          { id: 'lungeLeftBalance' as keyof FormData, type: 'select' as FieldType, label: 'Left side balance', options: [
            { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'lungeLeftKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: 'Left side knee tracking', options: [
            { value: 'tracks-straight', label: 'Tracks straight' }, { value: 'caves-inward', label: 'Caves inward' }, { value: 'bows-outward', label: 'Bows outward' }
          ]},
          { id: 'lungeLeftTorso' as keyof FormData, type: 'select' as FieldType, label: 'Left side hips', options: [
            { value: 'neutral', label: 'Neutral' }, { value: 'anterior-tilt', label: 'Anterior tilt' }, { value: 'posterior-tilt', label: 'Posterior tilt' }
          ]},
          { id: 'lungeRightBalance' as keyof FormData, type: 'select' as FieldType, label: 'Right side balance', options: [
            { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'lungeRightKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: 'Right side knee tracking', options: [
            { value: 'tracks-straight', label: 'Tracks straight' }, { value: 'caves-inward', label: 'Caves inward' }, { value: 'bows-outward', label: 'Bows outward' }
          ]},
          { id: 'lungeRightTorso' as keyof FormData, type: 'select' as FieldType, label: 'Right side hips', options: [
            { value: 'neutral', label: 'Neutral' }, { value: 'anterior-tilt', label: 'Anterior tilt' }, { value: 'posterior-tilt', label: 'Posterior tilt' }
          ]},
        ]
      },
      {
        id: 'mobility',
        title: 'Mobility',
        description: 'Joint mobility screens.',
        instructions: {
          clientInstructions: 'Move within comfortable range.',
          coachNotes: 'Record areas of restriction.'
        },
        fields: [
          { id: 'mobilityHip' as keyof FormData, type: 'select' as FieldType, label: 'Hip mobility', options: [
            { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'mobilityShoulder' as keyof FormData, type: 'select' as FieldType, label: 'Shoulder mobility', options: [
            { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'mobilityAnkle' as keyof FormData, type: 'select' as FieldType, label: 'Ankle mobility', options: [
            { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
        ]
      },
    ],
  },
  {
    id: 'P4',
    title: 'Muscular strength and endurance',
    summary: 'Basic strength and endurance metrics.',
    sections: [
      {
        id: 'strength-endurance',
        title: 'Muscular strength and endurance',
        description: 'Reps and holds.',
        instructions: {
          clientInstructions: 'Perform with proper form for accurate results.',
          coachNotes: 'Record best effort and quality.'
        },
        fields: [
          { id: 'squatsOneMinuteReps' as keyof FormData, type: 'number' as FieldType, label: 'Squats in one minute', placeholder: 'e.g., 40' },
          { id: 'pushupsOneMinuteReps' as keyof FormData, type: 'number' as FieldType, label: 'Pushups in one minute', placeholder: 'e.g., 25' },
          { id: 'plankDurationSeconds' as keyof FormData, type: 'number' as FieldType, label: 'Plank duration (seconds)', placeholder: 'e.g., 60' },
          { id: 'gripLeftKg' as keyof FormData, type: 'number' as FieldType, label: 'Grip strength left (kg)', placeholder: 'e.g., 24' },
          { id: 'gripRightKg' as keyof FormData, type: 'number' as FieldType, label: 'Grip strength right (kg)', placeholder: 'e.g., 26' },
        ]
      },
    ],
  },
  {
    id: 'P5',
    title: 'Fitness assessment',
    summary: 'Select and run cardio test.',
    sections: [
      {
        id: 'fitness-assessment',
        title: 'Fitness assessment',
        description: 'Choose the test to run.',
        instructions: {
          clientInstructions: 'Follow coach instructions during the test.',
          coachNotes: 'Select appropriate test.'
        },
        fields: [
          { id: 'cardioTestSelected' as keyof FormData, type: 'select' as FieldType, label: 'Select test', options: [
            { value: 'ymca-step', label: 'YMCA step test' },
            { value: 'treadmill', label: 'Treadmill test' },
          ]},
        ],
      },
    ],
  },
  {
    id: 'P6',
    title: 'Results',
    summary: 'Review results and create reports.',
    gateHint: 'Assessment complete.',
    sections: [
      {
        id: 'assessment-summary',
        title: 'Results',
        description: 'Coaches and client reports.',
        instructions: {
          clientInstructions: 'Review your results with your coach.',
          coachNotes: 'Summarize findings and next steps.'
        },
        fields: [
          {
            id: 'coachReport' as keyof FormData,
            type: 'textarea' as FieldType,
            label: 'Coaches report',
            placeholder: 'Key findings, recommendations, next steps...',
          },
          {
            id: 'clientReport' as keyof FormData,
            type: 'textarea' as FieldType,
            label: 'Client report',
            placeholder: 'Plain-language summary for the client...',
          },
        ],
      },
    ],
  },
];
