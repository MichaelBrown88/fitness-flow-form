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
  options?: { 
    value: string; 
    label: string; 
    subtitle?: string;
    isRecommended?: boolean;
    tag?: string;
  }[];
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
    summary: 'Collect basic client information and health screening.',
    gateHint: 'Complete before starting assessment.',
    sections: [
      {
        id: 'basic-client-info',
        title: 'Basic Client Info',
        fields: [
          { id: 'fullName' as keyof FormData, type: 'text' as FieldType, label: 'Name', required: true, placeholder: 'First and last name', tooltip: 'Enter the client\'s official full name for report generation.' },
          { id: 'email' as keyof FormData, type: 'email' as FieldType, label: 'Email address', required: true, placeholder: 'client@email.com', tooltip: 'Used for sending the digital assessment report.' },
          { id: 'phone' as keyof FormData, type: 'tel' as FieldType, label: 'Phone number', required: true, placeholder: '(555) 123-4567', tooltip: 'Used for SMS notifications and contact.' },
          { id: 'dateOfBirth' as keyof FormData, type: 'date' as FieldType, label: 'Date of birth', required: true, tooltip: 'Required to calculate age-adjusted health and fitness scores.' },
          { id: 'gender' as keyof FormData, type: 'select' as FieldType, label: 'Gender', required: true, options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }], tooltip: 'Used for physiological baseline comparisons (SMM, Body Fat).' },
          { id: 'assignedCoach' as keyof FormData, type: 'select' as FieldType, label: 'Assigned Coach', required: true, tooltip: 'Select the primary coach responsible for this client. Coaches are specific to your organization.' },
          { 
            id: 'trainingHistory' as keyof FormData, 
            type: 'select' as FieldType, 
            label: 'Training History', 
            required: true, 
            tooltip: 'Experience level determines the speed of physiological adaptations (e.g., "Newbie Gains" vs. Diminishing Returns).',
            options: [
              { value: 'beginner', label: 'None / Beginner (< 6 months)' },
              { value: 'intermediate', label: 'Intermediate (6 months – 2 years)' },
              { value: 'advanced', label: 'Advanced (> 2 years consistent training)' }
            ] 
          },
          { 
            id: 'recentActivity' as keyof FormData, 
            type: 'select' as FieldType, 
            label: 'Recent Activity', 
            required: true, 
            tooltip: 'Current readiness determines joint/tendon durability and immediate volume tolerance.',
            options: [
              { value: 'currently-training', label: 'Currently Training' },
              { value: 'stopped-3-months', label: 'Stopped < 3 months ago' },
              { value: 'stopped-6-months', label: 'Stopped > 6 months ago' }
            ] 
          },
          { 
            id: 'primaryTrainingStyle' as keyof FormData, 
            type: 'select' as FieldType, 
            label: 'Primary Training Style', 
            tooltip: 'Provides context for functional tests (e.g., powerlifters may have high strength but lower endurance).',
            options: [
              { value: 'bodybuilding', label: 'Bodybuilding / Hypertrophy' },
              { value: 'powerlifting', label: 'Powerlifting / Strength' },
              { value: 'crossfit', label: 'CrossFit / Functional Fitness' },
              { value: 'calisthenics', label: 'Calisthenics / Bodyweight' },
              { value: 'running', label: 'Running / Endurance' },
              { value: 'yoga-pilates', label: 'Yoga / Pilates' },
              { value: 'hiit', label: 'HIIT / Bootcamps' },
              { value: 'sports-performance', label: 'Sports Performance' },
              { value: 'general-wellness', label: 'General Wellness' }
            ],
            conditional: { 
              showWhen: { 
                field: 'recentActivity', 
                notValue: 'stopped-6-months' 
              } 
            } 
          },
        ],
      },
      {
        id: 'parq',
        title: 'PAR-Q',
        fields: [
          {
            id: 'parqQuestionnaire' as keyof FormData,
            type: 'parq' as FieldType,
            label: 'PAR-Q Questionnaire',
            required: true,
            tooltip: 'Instructions:\n1. Answer each question carefully.\n2. Any "YES" answer requires medical clearance before physical testing.',
          },
        ],
      },
    ],
  },
  {
    id: 'P1',
    title: 'Lifestyle Factors',
    summary: 'Daily habits that impact training and recovery.',
    gateHint: 'Complete lifestyle before health screening.',
    sections: [
      {
        id: 'lifestyle-overview',
        title: 'Lifestyle Factors',
        fields: [
          { id: 'activityLevel' as keyof FormData, type: 'select' as FieldType, label: 'Activity Level', required: true, tooltip: 'Instructions:\n1. Consider daily movement outside of the gym (job, chores).\n2. Sedentary = Desk job, minimal walking.\n3. Active = Standing job or 10k+ steps daily.', options: [
            { value: 'sedentary', label: 'Sedentary' },
            { value: 'lightly-active', label: 'Lightly Active' },
            { value: 'moderately-active', label: 'Moderately Active' },
            { value: 'very-active', label: 'Very Active' },
            { value: 'extremely-active', label: 'Extremely Active' },
          ]},
          { id: 'stepsPerDay' as keyof FormData, type: 'number' as FieldType, label: 'Average steps per day', placeholder: 'e.g., 6500', tooltip: 'Typical daily steps over the last 1–2 weeks (watch/phone estimate is fine).' },
          { id: 'sedentaryHours' as keyof FormData, type: 'number' as FieldType, label: 'Sedentary hours', placeholder: 'e.g., 8', tooltip: 'Approximate hours spent sitting or inactive on a typical day.' },
          { id: 'workHoursPerDay' as keyof FormData, type: 'number' as FieldType, label: 'Work hours', placeholder: 'e.g., 9', tooltip: 'Typical hours worked per day. Helps tailor training volume and recovery.' },
          { id: 'sleepQuality' as keyof FormData, type: 'select' as FieldType, label: 'Sleep quality', tooltip: 'Coach framing: overall restfulness and continuity (uninterrupted sleep, fewer awakenings, feel rested). Not deep sleep %, just perceived quality.', options: [
            { value: 'poor', label: 'Poor' }, { value: 'fair', label: 'Fair' }, { value: 'good', label: 'Good' }, { value: 'excellent', label: 'Excellent' }
          ]},
          { id: 'sleepDuration' as keyof FormData, type: 'select' as FieldType, label: 'Sleep Duration', tooltip: 'Average total hours of sleep per night over the last 1–2 weeks.', options: [
            { value: 'less-than-7', label: 'Less than 7 Hours' }, 
            { value: '7-9', label: '7 to 9 Hours (Ideal)' }, 
            { value: 'more-than-9', label: 'More than 9 Hours' }
          ]},
          { id: 'sleepConsistency' as keyof FormData, type: 'select' as FieldType, label: 'Sleep schedule consistency', tooltip: 'How consistent are bedtime and wake times across the week.', options: [
            { value: 'very-inconsistent', label: 'Very inconsistent' }, { value: 'inconsistent', label: 'Inconsistent' }, { value: 'consistent', label: 'Consistent' }, { value: 'very-consistent', label: 'Very consistent' }
          ]},
          { id: 'stressLevel' as keyof FormData, type: 'select' as FieldType, label: 'Stress levels', tooltip: 'Perceived day-to-day stress (work, life load). Helps modulate training intensity.', options: [
            { value: 'very-low', label: 'Very low' }, { value: 'low', label: 'Low' }, { value: 'moderate', label: 'Moderate' }, { value: 'high', label: 'High' }, { value: 'very-high', label: 'Very high' }
          ]},
          { id: 'nutritionHabits' as keyof FormData, type: 'select' as FieldType, label: 'Nutrition habits', tooltip: 'Overall food quality and consistency (protein, whole foods, balanced meals).', options: [
            { value: 'poor', label: 'Poor' }, { value: 'fair', label: 'Fair' }, { value: 'good', label: 'Good' }, { value: 'excellent', label: 'Excellent' }
          ]},
          { id: 'hydrationHabits' as keyof FormData, type: 'select' as FieldType, label: 'Hydration habits', tooltip: 'Typical daily water/fluid intake and consistency.', options: [
            { value: 'poor', label: 'Poor' }, { value: 'fair', label: 'Fair' }, { value: 'good', label: 'Good' }, { value: 'excellent', label: 'Excellent' }
          ]},
          { id: 'caffeineCupsPerDay' as keyof FormData, type: 'number' as FieldType, label: 'Caffeine intake (cups per day)', placeholder: 'e.g., 2', tooltip: 'Average number of caffeinated drinks per day (coffee, tea, energy drinks).' },
          { id: 'lastCaffeineIntake' as keyof FormData, type: 'time' as FieldType, label: 'Time of last caffeine intake', tooltip: 'Time of your most recent caffeine serving (helps with sleep timing).', conditional: { showWhen: { field: 'caffeineCupsPerDay', exists: true, notValue: '0' } } },
        ],
      }
    ],
  },
  {
    id: 'P2',
    title: 'Body Composition',
    summary: 'InBody scan and body composition analysis.',
    gateHint: 'Complete before movement assessment.',
    sections: [
      {
        id: 'body-comp',
        title: 'Body Composition',
        fields: [
          { id: 'heightCm' as keyof FormData, type: 'number' as FieldType, label: 'Height (cm)', required: true, placeholder: 'e.g., 175', tooltip: 'Required for BMI and body composition calculations.' },
          { id: 'inbodyWeightKg' as keyof FormData, type: 'number' as FieldType, label: 'Weight (kg)', required: true, placeholder: 'e.g., 78.2', tooltip: 'Required for BMI and body composition calculations.' },
          
          // Body Composition - Body Measurements (STANDARD for all users)
          // When analyzer data is not used, these measurements are used to calculate body composition scores
          // Measurements taken separately for left/right limbs to detect imbalances
          { id: 'shouldersCm' as keyof FormData, type: 'number' as FieldType, label: 'Shoulders (cm)', placeholder: 'e.g., 110', tooltip: 'Optional: Measure around the widest part of the shoulders. Used for muscle mass estimation when analyzer data is not available.' },
          { id: 'chestCm' as keyof FormData, type: 'number' as FieldType, label: 'Chest (cm)', placeholder: 'e.g., 100', tooltip: 'Optional: Measure around the chest at nipple level. Used for muscle mass estimation when analyzer data is not available.' },
          { id: 'armLeftCm' as keyof FormData, type: 'number' as FieldType, label: 'Left Arm (cm)', side: 'left', pairId: 'arm-circumference', placeholder: 'e.g., 32', tooltip: 'Optional: Measure around the midpoint of the upper arm (bicep). Used for muscle mass estimation when analyzer data is not available.' },
          { id: 'armRightCm' as keyof FormData, type: 'number' as FieldType, label: 'Right Arm (cm)', side: 'right', pairId: 'arm-circumference', placeholder: 'e.g., 33', tooltip: 'Optional: Measure around the midpoint of the upper arm (bicep). Used for muscle mass estimation when analyzer data is not available.' },
          { id: 'waistCm' as keyof FormData, type: 'number' as FieldType, label: 'Waist (cm)', placeholder: 'e.g., 85', tooltip: 'Measure at the narrowest point, or at navel level. Required for body fat calculation (US Navy method) when analyzer data is not available.' },
          { id: 'neckCm' as keyof FormData, type: 'number' as FieldType, label: 'Neck (cm)', placeholder: 'e.g., 38', tooltip: 'Measure just below the larynx (Adam\'s apple). Required for body fat calculation (US Navy method) when analyzer data is not available.' },
          { id: 'hipsCm' as keyof FormData, type: 'number' as FieldType, label: 'Hips (cm)', placeholder: 'e.g., 95', tooltip: 'Measure at the widest part of the hips. Required for women\'s body fat calculation when analyzer data is not available.' },
          { id: 'thighLeftCm' as keyof FormData, type: 'number' as FieldType, label: 'Left Thigh (cm)', side: 'left', pairId: 'thigh-circumference', placeholder: 'e.g., 58', tooltip: 'Optional: Measure around the midpoint of the thigh. Used for muscle mass estimation when analyzer data is not available.' },
          { id: 'thighRightCm' as keyof FormData, type: 'number' as FieldType, label: 'Right Thigh (cm)', side: 'right', pairId: 'thigh-circumference', placeholder: 'e.g., 59', tooltip: 'Optional: Measure around the midpoint of the thigh. Used for muscle mass estimation when analyzer data is not available.' },
          { id: 'calfLeftCm' as keyof FormData, type: 'number' as FieldType, label: 'Left Calf (cm)', side: 'left', pairId: 'calf-circumference', placeholder: 'e.g., 38', tooltip: 'Optional: Measure around the widest part of the calf. Used for progress tracking.' },
          { id: 'calfRightCm' as keyof FormData, type: 'number' as FieldType, label: 'Right Calf (cm)', side: 'right', pairId: 'calf-circumference', placeholder: 'e.g., 38', tooltip: 'Optional: Measure around the widest part of the calf. Used for progress tracking.' },
          
          // Body Composition - Analyzer Fields (InBody/DEXA - shown when equipment enabled OR when client brings report)
          // Note: The "Scan InBody Report" button is shown below these fields in SingleFieldFlow component
          // These fields are hidden when equipment is disabled UNLESS analyzer data has been entered
          { 
            id: 'inbodyScore' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'InBody Score', 
            placeholder: 'e.g., 78', 
            tooltip: 'A combined health score that increases as you gain muscle and lose body fat.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'skeletalMuscleMassKg' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'Skeletal Muscle Mass (kg)', 
            placeholder: 'e.g., 36.4', 
            tooltip: 'The weight of the muscles you can strengthen and grow. More muscle boosts metabolism and functional strength.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'bodyFatMassKg' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'Body Fat Mass (kg)', 
            placeholder: 'e.g., 21.3', 
            tooltip: 'The total weight of fat in your body. We use this to track actual fat loss versus just weight changes.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'inbodyBodyFatPct' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'Body Fat (%)', 
            placeholder: 'e.g., 18.5', 
            tooltip: 'The percentage of your body weight that is fat. This is a primary indicator of long-term health risk.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'inbodyBmi' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'BMI', 
            placeholder: 'e.g., 24.8', 
            tooltip: 'A general score based on your height and weight. Useful for broad health category tracking.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'totalBodyWaterL' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'Total Body Water (L)', 
            placeholder: 'e.g., 41.0', 
            tooltip: 'The amount of fluid in your body. Helps ensure your scan results are consistent and accurate.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'waistHipRatio' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'Waist-to-Hip Ratio (WHR)', 
            placeholder: 'e.g., 0.92', 
            tooltip: 'A measure of fat distribution. Lower ratios generally indicate lower risk of metabolic health issues.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'visceralFatLevel' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'Visceral Fat Level', 
            placeholder: 'e.g., 9', 
            tooltip: 'The level of fat stored deep around your internal organs. Staying below 10 is ideal for health.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'segmentalTrunkKg' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'Trunk lean (kg)', 
            placeholder: 'e.g., 28.5', 
            tooltip: 'The amount of muscle in your core and torso region.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'segmentalArmLeftKg' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'Left arm', 
            side: 'left', 
            pairId: 'arm-lean', 
            placeholder: 'e.g., 3.1', 
            tooltip: 'Muscle mass in your left arm. Compare with your right side to check for balance.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'segmentalArmRightKg' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'Right arm', 
            side: 'right', 
            pairId: 'arm-lean', 
            placeholder: 'e.g., 3.2', 
            tooltip: 'Muscle mass in your right arm. Compare with your right side to check for balance.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'segmentalLegLeftKg' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'Left leg', 
            side: 'left', 
            pairId: 'leg-lean', 
            placeholder: 'e.g., 9.1', 
            tooltip: 'Muscle mass in your left leg. Compare with your right side to check for balance.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'segmentalLegRightKg' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'Right leg', 
            side: 'right', 
            pairId: 'leg-lean', 
            placeholder: 'e.g., 9.7', 
            tooltip: 'Muscle mass in your right leg. Compare with your left side to check for balance.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
          { 
            id: 'bmrKcal' as keyof FormData, 
            type: 'number' as FieldType, 
            label: 'BMR (kcal)', 
            placeholder: 'e.g., 1620', 
            tooltip: 'The calories your body burns at rest. This helps us set your personalized nutrition targets.',
            conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
          },
        ]
      }
    ],
  },
  {
    id: 'P3',
    title: 'Metabolic Fitness',
    summary: 'Resting heart rate and cardio fitness assessment.',
    gateHint: 'Complete first physical assessment - requires resting heart rate.',
    sections: [
      {
        id: 'fitness-assessment',
        title: 'Metabolic Fitness',
        fields: [
          { id: 'cardioTestSelected' as keyof FormData, type: 'select' as FieldType, label: 'Select test', tooltip: 'Instructions:\n1. Choose the YMCA Step Test for a portable option.\n2. Choose the Treadmill Test for a more controlled environment.', options: [
            { value: 'ymca-step', label: 'YMCA step test' },
            { value: 'treadmill', label: 'Treadmill test' },
          ]},
          // Standardized fields for both tests (same 3 readings for both treadmill and step test)
          { id: 'cardioRestingHr' as keyof FormData, type: 'number' as FieldType, label: 'Resting Heart Rate (bpm)', tooltip: 'Instructions:\n1. Client should sit quietly for 5 minutes.\n2. Measure pulse for 60s or use a heart rate monitor.\n3. Record before starting the test.' },
          { id: 'cardioPeakHr' as keyof FormData, type: 'number' as FieldType, label: 'Peak Heart Rate (bpm)', tooltip: 'Record the highest heart rate reached just after completing the test (at the 3-minute mark).\n\nStep Test: Record HR immediately after stepping down.\nTreadmill: Record HR right before stopping.' },
          { id: 'cardioPost1MinHr' as keyof FormData, type: 'number' as FieldType, label: 'Recovery Heart Rate (bpm)', tooltip: 'Instructions:\n1. Stop the test at exactly 3:00.\n2. Have client sit down immediately.\n3. Wait exactly 60 seconds.\n4. Record heart rate at the 1-minute mark.\n\nBoth tests use the same recovery measurement.' },
        ],
      },
    ],
  },
  {
    id: 'P4',
    title: 'Movement Quality',
    summary: 'Posture, movement patterns, and mobility screens.',
    sections: [
      {
        id: 'posture',
        title: 'Posture',
        fields: [
          {
            id: 'postureInputMode' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Assessment Method',
            required: true,
            tooltip: 'Instructions:\n1. Choose "AI Posture Scan" for automated landmark detection using an iPhone.\n2. Choose "Manual" to record observations directly.',
            options: [
              { value: 'manual', label: 'Manual Observation' },
              { value: 'ai', label: 'AI Posture Scan (iPhone)' },
            ],
          },
          {
            id: 'postureHeadOverall' as keyof FormData,
            type: 'multiselect' as FieldType,
            label: 'Head and neck alignment',
            tooltip: 'Instructions:\n1. Observe client from the side view.\n2. Note if the ear is positioned directly over the shoulder (Neutral).\n3. If the head sits forward of the shoulder line, mark as Forward Head.',
            conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
            options: [
              { value: 'neutral', label: 'Neutral' },
              { value: 'forward-head', label: 'Forward head posture (head juts forward)' },
              { value: 'tilted', label: 'Head tilted to one side' },
              { value: 'chin-tucked', label: 'Chin excessively tucked' },
            ],
          },
          {
            id: 'postureShouldersOverall' as keyof FormData,
            type: 'multiselect' as FieldType,
            label: 'Shoulder and upper back',
            tooltip: 'Instructions:\n1. View from the side for rounded positions.\n2. View from the back for height symmetry or winged blades.\n3. Note any persistent elevation on one side.',
            conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
            options: [
              { value: 'neutral', label: 'Neutral' },
              { value: 'rounded', label: 'Rounded shoulders' },
              { value: 'elevated', label: 'One shoulder elevated' },
              { value: 'winged-scapula', label: 'Scapula winging (shoulder blade sticks out)' },
            ],
          },
          {
            id: 'postureBackOverall' as keyof FormData,
            type: 'multiselect' as FieldType,
            label: 'Back and spine',
            tooltip: 'Instructions:\n1. Observe spinal curves from the side view.\n2. Note excessive upper back rounding (Kyphosis) or lower back arch (Lordosis).\n3. Check for side-to-side curvature (Scoliosis) from the back.',
            conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
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
            type: 'multiselect' as FieldType,
            label: 'Hips alignment',
            tooltip: 'Instructions:\n1. Place hands on hip bones from the side.\n2. Note if the pelvis tilts forward (Anterior) or backward (Posterior).\n3. Check for height difference between left and right sides.',
            conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
            options: [
              { value: 'neutral', label: 'Neutral' },
              { value: 'anterior-tilt', label: 'Anterior pelvic tilt (pelvis forward)' },
              { value: 'posterior-tilt', label: 'Posterior pelvic tilt (pelvis backward)' },
            ],
          },
          {
            id: 'postureKneesOverall' as keyof FormData,
            type: 'multiselect' as FieldType,
            label: 'Knees alignment',
            tooltip: 'Instructions:\n1. View from the front for inward/outward bowing.\n2. Inward cave = Valgus; Outward bow = Varus.\n3. Note any excessive locking back (hyperextension) from the side.',
            conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
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
        fields: [
          {
            id: 'ohsShoulderMobility' as keyof FormData, type: 'select' as FieldType, label: 'Shoulder mobility', pattern: 'Overhead Squat', tooltip: 'Instructions:\n1. Stand with feet shoulder-width apart.\n2. Raise arms overhead with elbows locked.\n3. Note if arms stay vertical or tilt forward.', options: [
              { value: 'full-range', label: 'Full range' }, { value: 'compensated', label: 'Compensated' }, { value: 'limited', label: 'Limited' }
            ]
          },
          { id: 'ohsTorsoLean' as keyof FormData, type: 'select' as FieldType, label: 'Torso lean', pattern: 'Overhead Squat', tooltip: 'Instructions:\n1. Squat as deep as comfortable.\n2. Observe from the side view.\n3. Note if the torso stays upright or leans excessively forward.', options: [
            { value: 'upright', label: 'Upright' }, { value: 'moderate-lean', label: 'Moderate lean' }, { value: 'excessive-lean', label: 'Excessive lean' }
          ]},
          { id: 'ohsSquatDepth' as keyof FormData, type: 'select' as FieldType, label: 'Squat depth', pattern: 'Overhead Squat', tooltip: 'Instructions:\n1. Observe depth relative to parallel.\n2. Full = Hips below knees.\n3. Parallel = Thighs horizontal.', options: [
            { value: 'full-depth', label: 'Full depth' }, { value: 'parallel', label: 'Parallel' }, { value: 'quarter-depth', label: 'Quarter' }, { value: 'no-depth', label: 'Minimal' }
          ]},
          { id: 'ohsHipShift' as keyof FormData, type: 'select' as FieldType, label: 'Hip shift', pattern: 'Overhead Squat', tooltip: 'Instructions:\n1. Observe from the back view.\n2. Watch for hips drifting to one side during the squat.', options: [
            { value: 'none', label: 'None' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }
          ]},
          { id: 'ohsKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: 'Knee alignment', pattern: 'Overhead Squat', tooltip: 'Instructions:\n1. View from the front.\n2. Note if knees cave in (Valgus) or bow out (Varus) during movement.', options: [
            { value: 'stable', label: 'Stable' }, { value: 'valgus', label: 'Valgus (knees cave in)' }, { value: 'varus', label: 'Varus (knees bow out)' }
          ]},
          { id: 'ohsFeetPosition' as keyof FormData, type: 'select' as FieldType, label: 'Foot behaviour', pattern: 'Overhead Squat', tooltip: 'Instructions:\n1. Watch for arches collapsing (Pronation) or feet turning out excessively.', options: [
            { value: 'stable', label: 'Stable' }, { value: 'pronation', label: 'Pronation (rolls inward)' }, { value: 'supination', label: 'Supination (rolls outward)' }
          ]},
          { id: 'ohsHasPain' as keyof FormData, type: 'select' as FieldType, label: 'Pain or Discomfort?', tooltip: 'Does the client feel any pain or discomfort during this movement?', options: [
            { value: 'no', label: 'No pain' },
            { value: 'yes', label: 'Yes - Pain reported' }
          ]},
          { id: 'ohsPainLevel' as keyof FormData, type: 'select' as FieldType, label: 'Pain Level (1-10)', tooltip: 'Rate the intensity of the pain reported.', conditional: { showWhen: { field: 'ohsHasPain', value: 'yes' } }, options: [
            { value: '1', label: '1 - Very Mild' }, { value: '2', label: '2' }, { value: '3', label: '3' },
            { value: '4', label: '4 - Moderate' }, { value: '5', label: '5' }, { value: '6', label: '6' },
            { value: '7', label: '7 - Severe' }, { value: '8', label: '8' }, { value: '9', label: '9' }, { value: '10', label: '10 - Unbearable' }
          ]},
        ],
      },
      {
        id: 'hinge-assessment',
        title: 'Hinge',
        fields: [
          { id: 'hingeDepth' as keyof FormData, type: 'select' as FieldType, label: 'Depth', pattern: 'Hip Hinge', tooltip: 'Instructions:\n1. Perform a hip hinge (reaching hips back).\n2. Note the range of motion before form breaks or hamstrings limit movement.', options: [
            { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'hingeBackRounding' as keyof FormData, type: 'select' as FieldType, label: 'Back rounding', pattern: 'Hip Hinge', tooltip: 'Instructions:\n1. Watch the lumbar spine during the hinge.\n2. Note any rounding (flexion) as the client reaches back.', options: [
            { value: 'none', label: 'None' }, { value: 'minor', label: 'Minor' }, { value: 'moderate', label: 'Moderate' }, { value: 'severe', label: 'Severe' }
          ]},
          { id: 'hingeHasPain' as keyof FormData, type: 'select' as FieldType, label: 'Pain or Discomfort?', tooltip: 'Does the client feel any pain or discomfort during this movement?', options: [
            { value: 'no', label: 'No pain' },
            { value: 'yes', label: 'Yes - Pain reported' }
          ]},
          { id: 'hingePainLevel' as keyof FormData, type: 'select' as FieldType, label: 'Pain Level (1-10)', tooltip: 'Rate the intensity of the pain reported.', conditional: { showWhen: { field: 'hingeHasPain', value: 'yes' } }, options: [
            { value: '1', label: '1 - Very Mild' }, { value: '2', label: '2' }, { value: '3', label: '3' },
            { value: '4', label: '4 - Moderate' }, { value: '5', label: '5' }, { value: '6', label: '6' },
            { value: '7', label: '7 - Severe' }, { value: '8', label: '8' }, { value: '9', label: '9' }, { value: '10', label: '10 - Unbearable' }
          ]},
        ]
      },
      {
        id: 'lunge-assessment',
        title: 'Lunge',
        fields: [
          { id: 'lungeLeftBalance' as keyof FormData, type: 'select' as FieldType, label: 'Balance', pattern: 'Lunge', side: 'left', pairId: 'lunge-balance', tooltip: 'Instructions:\n1. Step forward into a lunge.\n2. Note any wobble or loss of stability on the working leg.', options: [
            { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'lungeRightBalance' as keyof FormData, type: 'select' as FieldType, label: 'Balance', pattern: 'Lunge', side: 'right', pairId: 'lunge-balance', tooltip: 'Instructions:\n1. Step forward into a lunge.\n2. Note any wobble or loss of stability on the working leg.', options: [
            { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'lungeLeftKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: 'Knee tracking', pattern: 'Lunge', side: 'left', pairId: 'lunge-knee', tooltip: 'Instructions:\n1. Watch the front knee during the descent.\n2. Note if the knee stays over the foot or caves inward.', options: [
            { value: 'tracks-straight', label: 'Tracks straight' }, { value: 'caves-inward', label: 'Caves inward (valgus)' }, { value: 'bows-outward', label: 'Bows outward (varus)' }
          ]},
          { id: 'lungeRightKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: 'Knee tracking', pattern: 'Lunge', side: 'right', pairId: 'lunge-knee', tooltip: 'Instructions:\n1. Watch the front knee during the descent.\n2. Note if the knee stays over the foot or caves inward.', options: [
            { value: 'tracks-straight', label: 'Tracks straight' }, { value: 'caves-inward', label: 'Caves inward (valgus)' }, { value: 'bows-outward', label: 'Bows outward (varus)' }
          ]},
          { id: 'lungeLeftTorso' as keyof FormData, type: 'select' as FieldType, label: 'Hip shift', pattern: 'Lunge', side: 'left', pairId: 'lunge-hips', tooltip: 'Instructions:\n1. Observe from the front or back view.\n2. Note if the hips shift to one side during the lunge.\n3. This indicates asymmetrical strength or stability.', options: [
            { value: 'neutral', label: 'No shift (stable)' }, { value: 'shifts-left', label: 'Shifts to the left' }, { value: 'shifts-right', label: 'Shifts to the right' }
          ]},
          { id: 'lungeRightTorso' as keyof FormData, type: 'select' as FieldType, label: 'Hip shift', pattern: 'Lunge', side: 'right', pairId: 'lunge-hips', tooltip: 'Instructions:\n1. Observe from the front or back view.\n2. Note if the hips shift to one side during the lunge.\n3. This indicates asymmetrical strength or stability.', options: [
            { value: 'neutral', label: 'No shift (stable)' }, { value: 'shifts-left', label: 'Shifts to the left' }, { value: 'shifts-right', label: 'Shifts to the right' }
          ]},
          { id: 'lungeHasPain' as keyof FormData, type: 'select' as FieldType, label: 'Pain or Discomfort?', tooltip: 'Does the client feel any pain or discomfort during this movement?', options: [
            { value: 'no', label: 'No pain' },
            { value: 'yes', label: 'Yes - Pain reported' }
          ]},
          { id: 'lungePainLevel' as keyof FormData, type: 'select' as FieldType, label: 'Pain Level (1-10)', tooltip: 'Rate the intensity of the pain reported.', conditional: { showWhen: { field: 'lungeHasPain', value: 'yes' } }, options: [
            { value: '1', label: '1 - Very Mild' }, { value: '2', label: '2' }, { value: '3', label: '3' },
            { value: '4', label: '4 - Moderate' }, { value: '5', label: '5' }, { value: '6', label: '6' },
            { value: '7', label: '7 - Severe' }, { value: '8', label: '8' }, { value: '9', label: '9' }, { value: '10', label: '10 - Unbearable' }
          ]},
        ]
      },
      {
        id: 'mobility',
        title: 'Mobility',
        fields: [
          { id: 'mobilityHip' as keyof FormData, type: 'select' as FieldType, label: 'Hip mobility', pattern: 'Hip Mobility', tooltip: 'Instructions:\n1. Perform active hip flexion and internal/external rotation tests.\n2. Record range of motion quality.', options: [
            { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'mobilityShoulder' as keyof FormData, type: 'select' as FieldType, label: 'Shoulder mobility', pattern: 'Shoulder Mobility', tooltip: 'Instructions:\n1. Perform reaching tests (Apley scratch test or similar).\n2. Record quality of overhead and behind-back reach.', options: [
            { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
          { id: 'mobilityAnkle' as keyof FormData, type: 'select' as FieldType, label: 'Ankle mobility', pattern: 'Ankle Mobility', tooltip: 'Instructions:\n1. Knee-to-wall test or similar dorsiflexion check.\n2. Note if movement is restricted by tightness or joint block.', options: [
            { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }
          ]},
        ]
      },
    ],
  },
  {
    id: 'P5',
    title: 'Functional Strength',
    summary: 'Basic strength and endurance metrics.',
    gateHint: 'Complete movement before strength testing.',
    sections: [
      {
        id: 'strength-endurance',
        title: 'Functional Strength',
        fields: [
          { id: 'squatsOneMinuteReps' as keyof FormData, type: 'number' as FieldType, label: 'Squats in one minute', placeholder: 'e.g., 40', tooltip: 'Instructions:\n1. Set timer for 60 seconds.\n2. Count only reps with full range of motion (thighs parallel to floor).\n3. Stop immediately when time expires.' },
          { id: 'pushupsOneMinuteReps' as keyof FormData, type: 'number' as FieldType, label: 'Pushups in one minute', placeholder: 'e.g., 25', tooltip: 'Instructions:\n1. Maintain a rigid plank position throughout.\n2. Chest must come within 2 inches of the floor.\n3. Arms must reach full lockout at the top.' },
          { id: 'plankDurationSeconds' as keyof FormData, type: 'number' as FieldType, label: 'Plank duration (seconds)', placeholder: 'e.g., 60', tooltip: 'Instructions:\n1. Hold a forearm plank with a flat back and active core.\n2. Record the total time until form breaks or knees touch.' },
          // Grip Strength - Test Method Selection (shown when equipment is disabled)
          { id: 'gripTestMethod' as keyof FormData, type: 'select' as FieldType, label: 'Select grip test method', pattern: 'Grip Strength', tooltip: 'Choose the test method based on your client\'s needs and available equipment.', options: [
            { value: 'deadhang', label: 'Dead Hang Test' },
            { value: 'pinch', label: 'Plate Pinch Test' },
          ]},
          // Grip Strength - Dynamometer (default when equipment enabled)
          { id: 'gripLeftKg' as keyof FormData, type: 'number' as FieldType, label: 'Left hand', pattern: 'Grip Strength', side: 'left', pairId: 'grip-strength', placeholder: 'e.g., 24', tooltip: 'Instructions:\n1. Squeeze the dynamometer with maximum effort.\n2. Keep arm at your side, not touching your body.\n3. Record the best of 3 attempts.' },
          { id: 'gripRightKg' as keyof FormData, type: 'number' as FieldType, label: 'Right hand', pattern: 'Grip Strength', side: 'right', pairId: 'grip-strength', placeholder: 'e.g., 26', tooltip: 'Instructions:\n1. Squeeze the dynamometer with maximum effort.\n2. Keep arm at your side, not touching your body.\n3. Record the best of 3 attempts.' },
          // Grip Strength - Dead Hang (alternative when equipment disabled)
          { id: 'gripDeadhangSeconds' as keyof FormData, type: 'number' as FieldType, label: 'Dead hang time (seconds)', pattern: 'Grip Strength', placeholder: 'e.g., 45', tooltip: 'Instructions:\n1. Hang from a pull-up bar with full grip.\n2. Record maximum time until grip fails or form breaks.\n3. Bodyweight is used to calculate equivalent grip strength.' },
          // Grip Strength - Plate Pinch (alternative when equipment disabled)
          { id: 'gripPlatePinchSeconds' as keyof FormData, type: 'number' as FieldType, label: 'Plate pinch time (seconds)', pattern: 'Grip Strength', placeholder: 'e.g., 30', tooltip: 'Instructions:\n1. Pinch grip a standardized weight plate (10kg for females, 15kg for males).\n2. Lift and hold for maximum time.\n3. Record time in seconds until grip fails.' },
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
        fields: [
          {
            id: 'clientGoals' as keyof FormData,
            type: 'multiselect' as FieldType,
            label: 'Client Goals',
            placeholder: 'Select one or more goals',
            tooltip: 'Instructions:\n1. Select all goals that apply to the client.\n2. Specific levels will be requested for each selection to calibrate the roadmap.',
            options: [
              { value: 'build-muscle', label: 'Build muscle' },
              { value: 'weight-loss', label: 'Weight loss' },
              { value: 'body-recomposition', label: 'Body recomposition' },
              { value: 'build-strength', label: 'Build strength' },
              { value: 'improve-fitness', label: 'Improve fitness' },
              { value: 'general-health', label: 'General health' },
            ],
          },
          {
            id: 'goalLevelWeightLoss' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Weight loss target',
            tooltip: 'Select your target weight loss. This can be a percentage of your total body weight or a specific amount in kilograms.',
            options: [
              { value: '5', label: '5% body weight' },
              { value: '10', label: '10% body weight' },
              { value: '15', label: '15% body weight (recommended)' },
              { value: '5kg', label: '5 kg weight loss' },
              { value: '10kg', label: '10 kg weight loss' },
              { value: '15kg', label: '15 kg weight loss' },
            ],
            conditional: { showWhen: { field: 'clientGoals', includes: 'weight-loss' } },
          },
          {
            id: 'goalLevelMuscle' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Muscle gain target',
            tooltip: 'Select your target muscle gain in kilograms. The recommended option provides a realistic and sustainable rate of muscle growth.',
            options: [
              { value: '2', label: '2 kg' },
              { value: '4', label: '4 kg' },
              { value: '6', label: '6 kg (recommended)' },
              { value: '8', label: '8 kg' },
            ],
            conditional: { showWhen: { field: 'clientGoals', includes: 'build-muscle' } },
          },
          {
            id: 'goalLevelStrength' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Strength target',
            tooltip: 'Select your target strength milestone. These benchmarks help calibrate your strength programming.',
            options: [
              // Male
              { value: '2x-bw-deadlift', label: '2.0x BW Deadlift' },
              { value: '1.75x-bw-squat', label: '1.75x BW Squat' },
              { value: '1.5x-bw-bench', label: '1.5x BW Bench Press' },
              { value: 'powerlifting-total', label: 'Maximize Total' },
              // Female
              { value: '1.5x-bw-deadlift', label: '1.75x/1.5x BW Deadlift' },
              { value: '1.5x-bw-squat', label: '1.5x BW Squat' },
              { value: '1x-bw-bench', label: '1.0x BW Bench' },
              { value: 'chinup-mastery', label: '3 Strict Pull-ups' },
              // Intermediate
              { value: '0.75x-bw-bench', label: '0.75x BW Bench' },
              { value: '1x-bw-squat', label: '1.0x BW Squat' },
              { value: '1.25x-bw-deadlift', label: '1.25x BW Deadlift' },
              { value: 'pullup-mastery', label: '10 Pull-ups' },
              { value: 'pushup-mastery', label: '10 Pushups' },
              // Beginner
              { value: 'technique-mastery', label: 'Master Technique' },
              { value: 'linear-progression', label: 'Linear Progression' },
              { value: 'bodyweight-basics', label: 'Bodyweight Basics' },
              { value: 'core-foundation', label: 'Core Foundation' },
            ],
            conditional: { showWhen: { field: 'clientGoals', includes: 'build-strength' } },
          },
          {
            id: 'goalLevelFitness' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Fitness target',
            tooltip: 'Select your target fitness level. Targets are based on VO2 max percentiles and include specific RHR and recovery HR goals.',
            options: [
              { value: 'health', label: 'Health Focus (50th percentile)' },
              { value: 'active', label: 'Active (75th percentile) (recommended)' },
              { value: 'athletic', label: 'Athletic (85th percentile)' },
              { value: 'elite', label: 'Elite (95th percentile)' },
            ],
            conditional: { showWhen: { field: 'clientGoals', includes: 'improve-fitness' } },
          },
          {
            id: 'goalLevelBodyRecomp' as keyof FormData,
            type: 'select' as FieldType,
            label: 'Body recomposition target',
            tooltip: 'Select your target body composition look. Body recomposition uses a slight calorie deficit to lose fat while building muscle simultaneously. Target body fat percentages are automatically adjusted based on your gender.',
            options: [
              { value: 'healthy', label: 'Healthy / Soft' },
              { value: 'fit', label: 'Fit' },
              { value: 'athletic', label: 'Athletic (recommended)' },
              { value: 'shredded', label: 'Shredded' },
            ],
            conditional: { showWhen: { field: 'clientGoals', includes: 'body-recomposition' } },
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
