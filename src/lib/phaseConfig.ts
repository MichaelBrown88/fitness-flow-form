import type { FormData } from '@/contexts/FormContext';

export type PhaseId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'choice' | 'multiselect' | 'parq';

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

export const intakeFields: IntakeField[] = [
  {
    id: 'fullName',
    type: 'text',
    label: 'Client Name',
    placeholder: 'e.g., Jordan Smith',
    required: true,
    tooltip: 'Enter your client\'s full legal name for records'
  },
  {
    id: 'contactEmail',
    type: 'text',
    label: 'Contact Email',
    placeholder: 'client@email.com',
    tooltip: 'Email address for sending assessment results and updates'
  },
  {
    id: 'age',
    type: 'number',
    label: 'Age',
    placeholder: 'e.g., 34',
    tooltip: 'Client\'s age in years - affects exercise recommendations'
  },
  {
    id: 'gender',
    type: 'select',
    label: 'Gender',
    options: [
      { value: 'female', label: 'Female' },
      { value: 'male', label: 'Male' },
    ],
    tooltip: 'Biological sex affects body composition norms and exercise guidelines'
  },
  {
    id: 'assignedCoach',
    type: 'select',
    label: 'Assigned Coach',
    options: [
      { value: 'Coach Selina', label: 'Coach Selina' },
      { value: 'Coach Mike', label: 'Coach Mike' },
    
    ],
    tooltip: 'Who will be leading this client\'s training sessions'
  },
  {
    id: 'clientGoals',
    type: 'multiselect',
    label: 'Client Goals',
    required: true,
    description: 'Select all goals that apply to this client',
    tooltip: 'Client\'s main fitness objectives - multiple selections allowed',
    options: [
      { value: 'build-muscle', label: 'Build muscle' },
      { value: 'build-strength', label: 'Build strength' },
      { value: 'lose-weight', label: 'Lose weight' },
      { value: 'improve-fitness', label: 'Improve fitness' },
      { value: 'general-health', label: 'General health and wellbeing' },
    ],
  },
];

export const phaseDefinitions = [
  {
    id: 'P0',
    title: 'Client Profile',
    summary: 'Collect basic client information.',
    gateHint: 'Complete client details before starting assessment.',
    sections: [
      {
        id: 'intake',
        title: 'Client Information',
        description: 'Basic information about the client.',
        instructions: {
          clientInstructions: 'Please provide accurate information to help us customize your assessment.',
          coachNotes: 'Collect all required client information before proceeding with the assessment.'
        },
        fields: [
          {
            id: 'firstName' as keyof FormData,
            type: 'text' as FieldType,
            label: 'First Name',
            required: true,
            placeholder: 'Enter first name',
          },
          {
            id: 'lastName' as keyof FormData,
            type: 'text' as FieldType,
            label: 'Last Name',
            required: true,
            placeholder: 'Enter last name',
          },
          {
            id: 'email' as keyof FormData,
            type: 'email' as FieldType,
            label: 'Email Address',
            required: true,
            placeholder: 'client@email.com',
          },
          {
            id: 'phone' as keyof FormData,
            type: 'tel' as FieldType,
            label: 'Phone Number',
            required: true,
            placeholder: '(555) 123-4567',
          },
          {
            id: 'dateOfBirth' as keyof FormData,
            type: 'date' as FieldType,
            label: 'Date of Birth',
            required: true,
          },
          {
            id: 'gender' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Gender',
            required: true,
            options: [
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ],
          },
          {
            id: 'heightCm' as keyof FormData,
            type: 'number' as FieldType,
            label: 'Height (cm)',
            required: true,
            placeholder: '170',
          },
          {
            id: 'assignedCoach' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Assigned Coach',
            required: true,
            options: [
              { value: 'coach-mike', label: 'Coach Mike' },
              { value: 'coach-selina', label: 'Coach Selina' },
            ],
          },
          {
            id: 'activityLevel' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Current Activity Level',
            required: true,
            options: [
              { value: 'sedentary', label: 'Sedentary (little to no exercise)' },
              { value: 'lightly-active', label: 'Lightly Active (light exercise 1-3 days/week)' },
              { value: 'moderately-active', label: 'Moderately Active (moderate exercise 3-5 days/week)' },
              { value: 'very-active', label: 'Very Active (hard exercise 6-7 days/week)' },
              { value: 'extremely-active', label: 'Extremely Active (very hard exercise, physical job, or 2x training)' },
            ],
          },
          {
            id: 'sleepDuration' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Average Sleep Duration (hours/night)',
            required: true,
            options: [
              { value: 'less-than-5', label: 'Less than 5 hours' },
              { value: '5-6', label: '5-6 hours' },
              { value: '6-7', label: '6-7 hours' },
              { value: '7-8', label: '7-8 hours' },
              { value: '8-9', label: '8-9 hours' },
              { value: 'more-than-9', label: 'More than 9 hours' },
            ],
          },
          {
            id: 'sleepQuality' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Sleep Quality',
            required: true,
            options: [
              { value: 'poor', label: 'Poor - Wake up tired, restless sleep' },
              { value: 'fair', label: 'Fair - Some nights good, some restless' },
              { value: 'good', label: 'Good - Generally restful sleep' },
              { value: 'excellent', label: 'Excellent - Very restful, energizing sleep' },
            ],
          },
          {
            id: 'sleepConsistency' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Sleep Schedule Consistency',
            required: true,
            options: [
              { value: 'very-inconsistent', label: 'Very Inconsistent - Varies by 3+ hours' },
              { value: 'inconsistent', label: 'Inconsistent - Varies by 1-2 hours' },
              { value: 'consistent', label: 'Consistent - Within 30-60 minutes' },
              { value: 'very-consistent', label: 'Very Consistent - Same time every day' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'P1',
    title: 'Health Screening & Body Composition',
    summary: 'Check for health risks and measure body composition.',
    gateHint: 'If health risks are identified, we\'ll pause before cardio testing.',
    sections: [
      {
        id: 'health-screening',
        title: 'Health Screening',
        description: 'Assess exercise safety and identify potential health risks.',
        instructions: {
          clientInstructions: 'Please answer the PAR-Q+ questionnaire honestly. Your safety is our priority.',
          coachNotes: 'Review PAR-Q+ responses carefully. If any concerns are identified, consult with a medical professional before proceeding with exercise testing.'
        },
        fields: [
          {
            id: 'parqQuestionnaire' as keyof FormData,
            type: 'parq' as FieldType,
            label: 'PAR-Q Questionnaire',
            required: true,
            description: 'Complete the Physical Activity Readiness Questionnaire',
          },
        ],
      },
    ],
  },
  {
    id: 'P2',
    title: 'Posture & Movement Assessment',
    summary: 'Evaluate standing posture and movement quality patterns.',
    sections: [
      {
        id: 'posture-assessment',
        title: 'Posture Assessment',
        description: 'Comprehensive standing posture evaluation.',
        instructions: {
          clientInstructions: 'Stand naturally with feet shoulder-width apart, looking straight ahead. Keep arms relaxed at your sides.',
          coachNotes: 'Observe from front, side, and back. Note any asymmetries, compensations, or areas of tension. Look for forward head posture, rounded shoulders, spinal curves, pelvic tilt, and knee alignment.'
        },
        fields: [
          {
            id: 'postureSeverity' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Overall Posture Quality',
            description: 'Rate the overall alignment from head to toe',
            tooltip: 'Consider the entire postural chain - head position, shoulder alignment, spinal curves, hip positioning, and knee alignment.',
            options: [
              { value: '1', label: 'Excellent alignment' },
              { value: '2', label: 'Minor deviations only' },
              { value: '3', label: 'Moderate compensations' },
              { value: '4', label: 'Significant issues' },
              { value: '5', label: 'Severe postural problems' },
            ],
          },
          {
            id: 'postureHeadOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Head & Neck Alignment',
            description: 'How is the head positioned relative to the spine?',
            tooltip: 'Check if the head is centered over the shoulders and spine. Forward head posture often indicates desk/screen work compensation.',
            options: [
              { value: 'neutral', label: 'Head centered over spine' },
              { value: 'forward-head', label: 'Forward head posture' },
              { value: 'tilted', label: 'Head tilted to one side' },
              { value: 'chin-tucked', label: 'Chin excessively tucked' },
            ],
          },
          {
            id: 'postureShouldersOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Shoulder & Upper Back',
            description: 'How do the shoulders and upper back appear?',
            tooltip: 'Look for shoulder height symmetry, scapular positioning, and thoracic spine curvature. Rounded shoulders often indicate weak upper back muscles.',
            options: [
              { value: 'neutral', label: 'Shoulders level and back' },
              { value: 'rounded', label: 'Rounded shoulders forward' },
              { value: 'elevated', label: 'One shoulder elevated' },
              { value: 'winged-scapula', label: 'Scapula winging visible' },
            ],
          },
          {
            id: 'postureBackOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Back & Spine Alignment',
            description: 'How is the spinal alignment from neck to lower back?',
            tooltip: 'Observe the natural curves of the spine. Excessive kyphosis or lordosis may indicate postural issues.',
            options: [
              { value: 'neutral', label: 'Natural spinal curves maintained' },
              { value: 'increased-kyphosis', label: 'Excessive upper back rounding' },
              { value: 'increased-lordosis', label: 'Excessive lower back arch' },
              { value: 'scoliosis', label: 'Lateral spinal curvature' },
              { value: 'flat-back', label: 'Loss of natural curves' },
            ],
          },
          {
            id: 'postureHipsOverall' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Hip & Pelvic Position',
            description: 'How is the pelvis positioned and are hips level?',
            tooltip: 'Check for pelvic tilt, hip height symmetry, and anterior/posterior pelvic positioning.',
            options: [
              { value: 'neutral', label: 'Hips level, pelvis neutral' },
              { value: 'anterior-tilt', label: 'Pelvis tilted forward' },
              { value: 'posterior-tilt', label: 'Pelvis tilted backward' },
              { value: 'hip-hike', label: 'One hip higher than other' },
              { value: 'rotated', label: 'Pelvis rotated to one side' },
            ],
          },
        ],
      },
      {
        id: 'overhead-squat',
        title: 'Overhead Squat Assessment',
        description: 'Comprehensive movement quality assessment during squat pattern.',
        instructions: {
          clientInstructions: 'Stand with feet shoulder-width apart, arms extended overhead with elbows locked. Squat down as low as comfortable while keeping arms overhead.',
          coachNotes: 'Watch for compensations throughout the movement. Note shoulder mobility, torso lean, depth achieved, hip stability, knee tracking, foot position, and lumbar control.'
        },
        fields: [
          {
            id: 'ohsShoulderMobility' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Shoulder Mobility',
            description: 'Can client maintain arms overhead without compensation?',
            tooltip: 'Arms should stay vertical without shrugging shoulders or arching excessively.',
            options: [
              { value: 'full-range', label: 'Full range - arms stay vertical' },
              { value: 'compensated', label: 'Shoulders shrug or arch' },
              { value: 'limited', label: 'Cannot maintain overhead position' },
            ],
          },
          {
            id: 'ohsTorsoLean' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Torso Lean',
            description: 'Does the torso remain upright or lean excessively?',
            tooltip: 'Torso should stay relatively vertical. Excessive forward lean indicates tight hip flexors.',
            options: [
              { value: 'upright', label: 'Torso stays upright' },
              { value: 'moderate-lean', label: 'Moderate forward lean' },
              { value: 'excessive-lean', label: 'Heavy forward lean' },
            ],
          },
          {
            id: 'ohsSquatDepth' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Squat Depth',
            description: 'How deep can the client squat while maintaining form?',
            tooltip: 'Assess the lowest point reached. Limited depth indicates mobility restrictions.',
            options: [
              { value: 'full-depth', label: 'Below parallel (full depth)' },
              { value: 'parallel', label: 'To parallel' },
              { value: 'quarter-depth', label: 'Quarter squat only' },
              { value: 'no-depth', label: 'Minimal movement' },
            ],
          },
          {
            id: 'ohsKneeAlignment' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Knee Tracking',
            description: 'How do knees move relative to toes?',
            tooltip: 'Knees should track in line with toes. Inward collapse indicates weak glutes.',
            options: [
              { value: 'neutral', label: 'Knees track straight over toes' },
              { value: 'valgus', label: 'Knees collapse inward' },
              { value: 'varus', label: 'Knees bow outward' },
            ],
          },
          {
            id: 'ohsHipShift' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Hip Shift',
            description: 'Do hips stay level or shift during movement?',
            tooltip: 'Hips should move symmetrically. Uneven hip movement indicates strength imbalances.',
            options: [
              { value: 'level', label: 'Hips stay level' },
              { value: 'slight-shift', label: 'Minor hip shift' },
              { value: 'significant-shift', label: 'One hip hikes up' },
            ],
          },
        ],
      },
      {
        id: 'hinge-assessment',
        title: 'Hinge Movement Assessment',
        description: 'Posterior chain mobility and control during hip hinge.',
        instructions: {
          clientInstructions: 'Stand with feet hip-width apart, slight bend in knees. Push hips back while keeping back straight, reaching hands toward the floor.',
          coachNotes: 'Assess hinge mechanics and balance. Look for back rounding, hip mobility limitations, and balance control.'
        },
        fields: [
          {
            id: 'hingeQuality' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Hinge Movement Quality',
            description: 'How well does the client perform a basic hinge?',
            tooltip: 'Romanian Deadlift assessment: Client bends at hips while keeping back straight.',
            options: [
              { value: 'excellent', label: 'Smooth, controlled movement' },
              { value: 'good', label: 'Minor compensations' },
              { value: 'fair', label: 'Noticeable rounding or stiffness' },
              { value: 'poor', label: 'Significant issues with form' },
            ],
          },
          {
            id: 'hingeBalance' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Hinge Balance & Stability',
            description: 'Is the hinge movement balanced?',
            tooltip: 'Checks if the client can maintain balance during the hinge movement.',
            options: [
              { value: 'stable', label: 'Maintains balance throughout' },
              { value: 'slight-wobble', label: 'Minor balance adjustments' },
              { value: 'unstable', label: 'Significant balance issues' },
            ],
          },
        ],
      },
      {
        id: 'lunge-assessment',
        title: 'Lunge Assessment',
        description: 'Single-leg stability and movement quality during lunges.',
        instructions: {
          clientInstructions: 'Step forward into a lunge position with one foot, lowering until both knees are bent at 90 degrees. Keep torso upright.',
          coachNotes: 'Test each leg separately. Watch for knee tracking over toes, balance stability, torso lean, and symmetry between sides.'
        },
        fields: [
          {
            id: 'lungeLeftKneeAlignment' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Left Lunge Knee Tracking',
            description: 'How does left knee move in forward lunge?',
            tooltip: 'Forward lunge assessment: Client steps forward into lunge position.',
            options: [
              { value: 'tracks-straight', label: 'Knee tracks straight over toes' },
              { value: 'caves-inward', label: 'Knee caves inward (valgus)' },
              { value: 'bows-outward', label: 'Knee bows outward (varus)' },
            ],
          },
          {
            id: 'lungeLeftBalance' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Left Lunge Balance',
            description: 'How stable is the left leg in lunge?',
            tooltip: 'Assesses single-leg stability and balance during the lunge movement.',
            options: [
              { value: 'stable', label: 'Solid balance and control' },
              { value: 'slight-wobble', label: 'Minor balance adjustments needed' },
              { value: 'unstable', label: 'Significant balance issues' },
            ],
          },
          {
            id: 'lungeRightKneeAlignment' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Right Lunge Knee Tracking',
            description: 'How does right knee move in forward lunge?',
            tooltip: 'Forward lunge assessment: Client steps forward into lunge position.',
            options: [
              { value: 'tracks-straight', label: 'Knee tracks straight over toes' },
              { value: 'caves-inward', label: 'Knee caves inward (valgus)' },
              { value: 'bows-outward', label: 'Knee bows outward (varus)' },
            ],
          },
          {
            id: 'lungeRightBalance' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Right Lunge Balance',
            description: 'How stable is the right leg in lunge?',
            tooltip: 'Assesses single-leg stability and balance during the lunge movement.',
            options: [
              { value: 'stable', label: 'Solid balance and control' },
              { value: 'slight-wobble', label: 'Minor balance adjustments needed' },
              { value: 'unstable', label: 'Significant balance issues' },
            ],
          },
          {
            id: 'movementNotes' as keyof FormData,
            type: 'textarea' as FieldType,
            label: 'Movement Assessment Notes',
            placeholder: 'Record any compensations, asymmetries, or concerns noted during movement screening.',
            tooltip: 'Document observations from all movement assessments.'
          },
        ],
      },
    ],
  },
  {
    id: 'P3',
    title: 'Core Stability & Balance',
    summary: 'Assess core endurance and single-leg balance stability.',
    sections: [
      {
        id: 'core-endurance',
        title: 'Core Endurance Assessment',
        description: 'Test anterior and posterior core muscle endurance.',
        instructions: {
          clientInstructions: 'Hold each position for as long as possible while maintaining proper form. Stop when form breaks.',
          coachNotes: 'Ensure proper positioning and form. Time each hold accurately. Note any compensations or asymmetries.'
        },
        fields: [
          {
            id: 'plankHoldSeconds' as keyof FormData,
            type: 'number' as FieldType,
        label: 'Forearm Plank Hold (seconds)',
        description: 'Maximum time client can hold proper plank position',
        placeholder: 'e.g., 45',
            tooltip: 'Client holds forearm plank with straight body line, no sagging hips or piked shoulders.',
          },
          {
            id: 'sidePlankLeftSeconds' as keyof FormData,
            type: 'number' as FieldType,
            label: 'Left Side Plank Hold (seconds)',
            description: 'Maximum time client can hold left side plank',
            placeholder: 'e.g., 32',
            tooltip: 'Client supports on left forearm with body in straight line, feet stacked.',
          },
          {
            id: 'sidePlankRightSeconds' as keyof FormData,
            type: 'number' as FieldType,
            label: 'Right Side Plank Hold (seconds)',
            description: 'Maximum time client can hold right side plank',
            placeholder: 'e.g., 28',
            tooltip: 'Client supports on right forearm with body in straight line, feet stacked.',
          },
        ],
      },
      {
        id: 'balance-assessment',
        title: 'Balance & Stability Assessment',
        description: 'Test static and dynamic balance capabilities.',
        instructions: {
          clientInstructions: 'Stand on one leg with eyes open, hands on hips. Maintain balance for 30 seconds.',
          coachNotes: 'Grade balance quality and note any compensations. Test both sides. Eyes remain open throughout.'
        },
        fields: [
          {
            id: 'singleLegStanceLeftGrade' as keyof FormData,
            type: 'select' as FieldType,
        label: 'Left Single-Leg Stance (30 seconds)',
        description: 'Balance quality while standing on left leg for 30 seconds',
            tooltip: 'Client stands on left leg with eyes open, hands on hips. Grade ability to maintain balance.',
        options: [
          { value: 'excellent', label: 'Perfect balance, no wobble (25-30 sec)' },
          { value: 'good', label: 'Minor adjustments needed (15-24 sec)' },
          { value: 'fair', label: 'Moderate wobble, some adjustments (5-14 sec)' },
          { value: 'poor', label: 'Significant instability (<5 sec)' },
        ],
      },
      {
            id: 'singleLegStanceRightGrade' as keyof FormData,
            type: 'select' as FieldType,
        label: 'Right Single-Leg Stance (30 seconds)',
        description: 'Balance quality while standing on right leg for 30 seconds',
            tooltip: 'Client stands on right leg with eyes open, hands on hips. Grade ability to maintain balance.',
        options: [
          { value: 'excellent', label: 'Perfect balance, no wobble (25-30 sec)' },
          { value: 'good', label: 'Minor adjustments needed (15-24 sec)' },
          { value: 'fair', label: 'Moderate wobble, some adjustments (5-14 sec)' },
          { value: 'poor', label: 'Significant instability (<5 sec)' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'P4',
    title: 'Cardiovascular Fitness',
    summary: 'Assess cardiovascular fitness with appropriate testing method.',
    sections: [
      {
        id: 'cardio-assessment',
        title: 'Cardiovascular Assessment',
        description: 'Evaluate cardiovascular fitness and recovery capacity.',
        instructions: {
          clientInstructions: 'We\'ll perform a submaximal cardiovascular test appropriate for your fitness level. Follow all instructions carefully.',
          coachNotes: 'Select appropriate test based on client fitness level and any medical considerations. Monitor heart rate and perceived exertion throughout.'
        },
        fields: [
          {
            id: 'cardioTestType' as keyof FormData,
            type: 'select' as FieldType,
        label: 'Recommended Cardio Test',
        description: 'Test type selected based on client profile and fitness level',
        tooltip: 'Treadmill test for higher fitness levels, step test for beginners or those with joint concerns.',
        options: [
          { value: 'treadmill', label: 'Ebbeling Treadmill Test' },
          { value: 'step', label: 'YMCA Step Test' },
        ],
        required: true,
      },
      {
            id: 'cardioFinalHeartRate' as keyof FormData,
            type: 'number' as FieldType,
        label: 'Final Steady-State Heart Rate (bpm)',
        placeholder: 'e.g., 148',
            tooltip: 'Heart rate achieved at the end of the test protocol.',
      },
      {
            id: 'cardioVo2MaxEstimate' as keyof FormData,
            type: 'number' as FieldType,
        label: 'Estimated VO₂max',
        placeholder: 'e.g., 32',
            tooltip: 'Estimated maximum oxygen consumption based on test results.',
      },
      {
            id: 'cardioMedicationFlag' as keyof FormData,
            type: 'select' as FieldType,
        label: 'HR-Limiting Medication?',
            tooltip: 'Certain medications may affect heart rate response during exercise.',
        options: [
          { value: 'no', label: 'No' },
          { value: 'yes', label: 'Yes' },
        ],
      },
      {
            id: 'cardioTestInstructions' as keyof FormData,
            type: 'textarea' as FieldType,
        label: 'Test Protocol Instructions',
        description: 'Auto-generated instructions for the selected cardio test',
        tooltip: 'These instructions are automatically populated based on test selection. Read them to the client and follow exactly.',
        readOnly: true,
      },
      {
            id: 'cardioNotes' as keyof FormData,
            type: 'textarea' as FieldType,
        label: 'Cardio Assessment Notes',
        placeholder: 'Record RPE, observed response, HR recovery, or any modifications made.',
        tooltip: 'Document client feedback, any issues during testing, and overall response to exercise.',
          },
        ],
      },
    ],
  },
  {
    id: 'P5',
    title: 'Strength & Power',
    summary: 'Capture upper body, grip, and functional lower body capacity.',
    sections: [
      {
        id: 'strength-assessment',
        title: 'Strength & Power Assessment',
        description: 'Evaluate upper and lower body strength capabilities.',
        instructions: {
          clientInstructions: 'Perform each exercise with proper form. For timed tests, give maximum effort for the full time period.',
          coachNotes: 'Assess relative strength and muscular endurance. Note form quality and any compensations.'
        },
        fields: [
          {
            id: 'pushupTest' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Push-up Capacity (1 minute)',
            description: 'How many push-ups can be performed in 1 minute?',
            tooltip: 'Modified push-ups allowed. Assesses upper body strength and endurance.',
            options: [
              { value: 'excellent', label: '30+ push-ups' },
              { value: 'good', label: '20-29 push-ups' },
              { value: 'fair', label: '10-19 push-ups' },
              { value: 'poor', label: '5-9 push-ups' },
              { value: 'very-poor', label: '0-4 push-ups' },
            ],
          },
          {
            id: 'squatTest' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Bodyweight Squat Capacity (1 minute)',
            description: 'How many bodyweight squats in 1 minute?',
            tooltip: 'Air squats with good form. Assesses lower body strength and endurance.',
            options: [
              { value: 'excellent', label: '50+ squats' },
              { value: 'good', label: '35-49 squats' },
              { value: 'fair', label: '20-34 squats' },
              { value: 'poor', label: '10-19 squats' },
              { value: 'very-poor', label: '0-9 squats' },
            ],
          },
        ],
      },
      {
        id: 'grip-strength',
        title: 'Grip Strength Assessment',
        description: 'Measure hand and forearm strength.',
        instructions: {
          clientInstructions: 'Squeeze the dynamometer as hard as you can for 3-5 seconds. We\'ll test both hands.',
          coachNotes: 'Use proper grip positioning. Record the highest reading from 2-3 attempts per hand. Note any pain or discomfort.'
        },
        fields: [
      {
            id: 'gripLeftKg' as keyof FormData,
            type: 'number' as FieldType,
        label: 'Grip Strength Left (kg)',
        placeholder: 'e.g., 24',
            tooltip: 'Measure with dominant hand first. Use dynamometer for accurate readings.',
      },
      {
            id: 'gripRightKg' as keyof FormData,
            type: 'number' as FieldType,
        label: 'Grip Strength Right (kg)',
        placeholder: 'e.g., 26',
            tooltip: 'Measure with non-dominant hand. Compare bilateral strength differences.',
          },
        ],
      },
    ],
  },
  {
    id: 'P6',
    title: 'Assessment Complete - Results & Reports',
    summary: 'Review assessment results and generate reports.',
    gateHint: 'Assessment completed successfully.',
    sections: [
      {
        id: 'assessment-summary',
        title: 'Assessment Summary',
        description: 'Comprehensive overview of all assessment findings.',
        instructions: {
          clientInstructions: 'Your assessment is now complete! Review your results below and discuss next steps with your coach.',
          coachNotes: 'Review all assessment data, identify key findings, and prepare personalized recommendations. Generate client and coach reports as needed.'
        },
        fields: [
          {
            id: 'assessmentComplete' as keyof FormData,
            type: 'textarea' as FieldType,
            label: 'Assessment Summary Notes',
            description: 'Add any final notes or observations from the complete assessment.',
            placeholder: 'Document key findings, recommendations, or next steps...',
            required: false,
          },
        ],
      },
    ],
  },
];
