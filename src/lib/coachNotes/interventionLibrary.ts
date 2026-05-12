/**
 * Intervention Library — the clinical knowledge base.
 *
 * Maps `(findingId, severity)` → a concrete prescription: exercises,
 * dose, expected outcome, reassessment cadence, contraindications.
 *
 * This is what makes the system useful for coaches: instead of
 * designing a corrective program from scratch, they get an
 * evidence-based starting point per finding. Coaches can override
 * any field in the editor; library values are starting priors.
 *
 * **Seed library — 8 high-value findings.** Add more over time as
 * we discover patterns and validate against outcome data.
 */

import type { PostureSeverity, BehaviourSeverity } from '@/lib/physiology/rates';

// ─── Types ───────────────────────────────────────────────────────────

export interface Intervention {
  /** Exercise / drill / behaviour name. */
  name: string;
  /** Sets — when applicable. */
  sets?: number;
  /** Reps — when applicable. */
  reps?: number;
  /** Hold / duration — when applicable (e.g. "30s"). */
  duration?: string;
  /** Frequency, plain English (e.g., "daily" / "5x/week"). */
  frequency: string;
  /** Optional cue or technique note. */
  notes?: string;
}

export type FindingSeverity = PostureSeverity | BehaviourSeverity | 'mild' | 'moderate' | 'severe';

export interface LibraryEntry {
  /** Coach-facing finding name. */
  finding: string;
  /** Plain-English diagnostic blurb (severity-specific). */
  diagnosis: string;
  /** Prescribed exercises / behaviours. */
  prescription: Intervention[];
  /** Minimum dose for the prescription to actually work. */
  minimumDose: string;
  /** Coach-facing expected outcome with timeline. */
  expectedOutcome: string;
  /** Weeks between reassessments. */
  reassessmentCadence: number[];
  /** Contraindications / red flags / when to refer out. */
  contraindications: string[];
  /** Confidence based on evidence quality. */
  confidence: 'high' | 'medium' | 'low';
  /** Citations / sources for the prescription. */
  references?: string[];
}

export type FindingId =
  | 'forward-head-posture'
  | 'rounded-shoulders'
  | 'limited-shoulder-mobility'
  | 'limited-ankle-dorsiflexion'
  | 'low-vo2max'
  | 'weight-loss-target'
  | 'muscle-building-target'
  | 'sleep-deficit'
  | 'high-stress';

// ─── Library ─────────────────────────────────────────────────────────

export const INTERVENTION_LIBRARY: Record<
  FindingId,
  Partial<Record<FindingSeverity, LibraryEntry>>
> = {
  // ─── Posture ───────────────────────────────────────────────────
  'forward-head-posture': {
    mild: {
      finding: 'Mild forward head posture',
      diagnosis: 'Slight anterior translation of the head — often a desk/screen pattern. Limits overhead work efficiency.',
      prescription: [
        { name: 'Chin tucks', sets: 3, reps: 10, frequency: 'daily', notes: 'Slow tempo, hold 2s at end range' },
        { name: 'Doorway pec stretch', duration: '30s', sets: 2, frequency: 'daily' },
      ],
      minimumDose: '5x/week',
      expectedOutcome: '~50% reduction in deviation by week 8 with adherence.',
      reassessmentCadence: [4, 8],
      contraindications: ['Refer out if persistent neck pain or radicular symptoms (numbness/tingling)'],
      confidence: 'high',
      references: ['Kim et al. 2018 — corrective exercise for forward-head posture'],
    },
    moderate: {
      finding: 'Moderate forward head posture',
      diagnosis: 'Clearly visible anterior head carriage. Likely contributing to upper-trap dominance and limited overhead range.',
      prescription: [
        { name: 'Chin tucks', sets: 3, reps: 10, frequency: 'daily' },
        { name: 'Wall angels', sets: 2, reps: 10, frequency: 'daily' },
        { name: 'Doorway pec stretch', duration: '30s', sets: 2, frequency: 'daily' },
        { name: 'Thoracic extensions on foam roller', sets: 2, reps: 8, frequency: '5x/week' },
      ],
      minimumDose: '5x/week, daily preferred',
      expectedOutcome: '~50% reduction by week 12 with adherence; visible by week 4-6.',
      reassessmentCadence: [4, 8, 12],
      contraindications: ['Refer out if persistent neck pain', 'Stop if radicular symptoms develop'],
      confidence: 'high',
    },
    severe: {
      finding: 'Severe forward head posture',
      diagnosis: 'Pronounced anterior head carriage. Likely impacting cervical comfort and overhead training quality. Worth ruling out structural causes.',
      prescription: [
        { name: 'Chin tucks', sets: 3, reps: 10, frequency: 'daily' },
        { name: 'ABC drill (alphabet drill)', sets: 3, reps: 10, frequency: 'daily' },
        { name: 'Wall angels', sets: 2, reps: 10, frequency: 'daily' },
        { name: 'Thoracic extensions on foam roller', sets: 2, reps: 10, frequency: 'daily' },
        { name: 'Deep neck flexor activation', sets: 2, reps: 10, duration: '5s hold', frequency: 'daily' },
      ],
      minimumDose: '5x/week minimum, daily for fastest progress',
      expectedOutcome: '~60% correction by week 12 (severe → mild). Full normalisation may take 16-20 weeks.',
      reassessmentCadence: [4, 8, 12, 16],
      contraindications: [
        'Refer to physiotherapy if persistent neck pain develops',
        'Stop and reassess if radicular symptoms (numbness, tingling) appear',
        'Consider imaging if no improvement by week 12 with full adherence',
      ],
      confidence: 'high',
      references: ['Kim et al. 2018', 'Page 2011 — postural correction protocols'],
    },
  },

  'rounded-shoulders': {
    mild: {
      finding: 'Mild shoulder protraction',
      diagnosis: 'Slight forward shoulder posture. Pectoral tightness + lower-trap weakness pattern.',
      prescription: [
        { name: 'Band pull-aparts', sets: 3, reps: 15, frequency: 'daily' },
        { name: 'Doorway pec stretch', duration: '30s', sets: 2, frequency: 'daily' },
      ],
      minimumDose: '5x/week',
      expectedOutcome: 'Visible improvement in 6-8 weeks with adherence.',
      reassessmentCadence: [4, 8],
      contraindications: [],
      confidence: 'high',
    },
    moderate: {
      finding: 'Moderate rounded-shoulder posture',
      diagnosis: 'Notable shoulder protraction. Likely upper-cross syndrome pattern with tight pecs + weak lower traps + rhomboids.',
      prescription: [
        { name: 'Band pull-aparts', sets: 3, reps: 15, frequency: 'daily' },
        { name: 'Face pulls', sets: 3, reps: 12, frequency: '4x/week' },
        { name: 'Doorway pec stretch', duration: '30s', sets: 2, frequency: 'daily' },
        { name: 'Prone Y-T-W raises', sets: 2, reps: 10, frequency: '4x/week' },
      ],
      minimumDose: '4-5x/week',
      expectedOutcome: '~50% correction in 10-12 weeks with consistent training.',
      reassessmentCadence: [4, 8, 12],
      contraindications: ['Refer out if shoulder impingement symptoms persist beyond week 4'],
      confidence: 'high',
    },
    severe: {
      finding: 'Severe rounded-shoulder posture',
      diagnosis: 'Pronounced upper-cross pattern. May limit overhead work safely. Worth a thorough movement assessment before loading overhead.',
      prescription: [
        { name: 'Band pull-aparts', sets: 3, reps: 15, frequency: 'daily' },
        { name: 'Face pulls', sets: 3, reps: 12, frequency: '5x/week' },
        { name: 'Doorway pec stretch', duration: '45s', sets: 3, frequency: 'daily' },
        { name: 'Prone Y-T-W raises', sets: 3, reps: 10, frequency: 'daily' },
        { name: 'Thoracic extensions', sets: 2, reps: 10, frequency: 'daily' },
      ],
      minimumDose: 'Daily',
      expectedOutcome: '~50% correction in 12-16 weeks. Reduce overhead loading until moderate level reached.',
      reassessmentCadence: [4, 8, 12, 16],
      contraindications: [
        'Avoid overhead pressing while severe',
        'Refer out if impingement symptoms develop',
      ],
      confidence: 'high',
    },
  },

  // ─── Mobility ──────────────────────────────────────────────────
  'limited-shoulder-mobility': {
    moderate: {
      finding: 'Limited shoulder flexion ROM',
      diagnosis: 'Shoulder flexion below 170°. Restricts overhead training and may indicate thoracic / lat tightness.',
      prescription: [
        { name: 'Lat stretch (kneeling on bench)', duration: '45s', sets: 2, frequency: 'daily' },
        { name: 'Wall slides', sets: 3, reps: 10, frequency: 'daily' },
        { name: 'Foam roller thoracic extensions', sets: 2, reps: 10, frequency: 'daily' },
      ],
      minimumDose: 'Daily',
      expectedOutcome: '~9° ROM gain per 8 weeks. Full range typically restored in 12-16 weeks.',
      reassessmentCadence: [4, 8, 12],
      contraindications: ['Refer out for sharp anterior shoulder pain'],
      confidence: 'medium',
    },
    severe: {
      finding: 'Severely limited shoulder flexion',
      diagnosis: 'Shoulder flexion below 150°. Substantially limits overhead training. Worth ruling out structural / capsular issues.',
      prescription: [
        { name: 'Lat stretch', duration: '60s', sets: 3, frequency: 'daily' },
        { name: 'Wall slides', sets: 3, reps: 12, frequency: 'daily' },
        { name: 'Banded shoulder distractions', sets: 2, reps: 10, frequency: 'daily' },
        { name: 'Foam roller thoracic mobility', sets: 3, reps: 10, frequency: 'daily' },
      ],
      minimumDose: 'Daily',
      expectedOutcome: '~12° per 8 weeks. Plan for 16-20 weeks to full range.',
      reassessmentCadence: [4, 8, 12, 16],
      contraindications: [
        'Avoid loaded overhead work',
        'Refer for imaging if no progress by week 8',
      ],
      confidence: 'medium',
    },
  },

  'limited-ankle-dorsiflexion': {
    moderate: {
      finding: 'Limited ankle dorsiflexion',
      diagnosis: 'Restricted ankle range — limits squat depth and lunge mechanics. Often soft-tissue (calf/soleus tightness).',
      prescription: [
        { name: 'Knee-to-wall calf stretch', sets: 3, reps: 10, duration: '5s hold', frequency: 'daily' },
        { name: 'Banded ankle distractions', sets: 2, reps: 10, frequency: 'daily' },
        { name: 'Calf foam roll', duration: '60s', sets: 2, frequency: 'daily' },
      ],
      minimumDose: 'Daily',
      expectedOutcome: '~5° gain in 8 weeks; functional squat depth typically restored in 8-12 weeks.',
      reassessmentCadence: [4, 8, 12],
      contraindications: [],
      confidence: 'high',
    },
  },

  // ─── Cardio ────────────────────────────────────────────────────
  'low-vo2max': {
    moderate: {
      finding: 'Below-baseline VO₂max',
      diagnosis: 'Aerobic capacity sits below age-percentile baseline. Limits training volume tolerance and work capacity.',
      prescription: [
        { name: 'Zone-2 cardio', duration: '30-45min', frequency: '3x/week' },
        { name: 'Tempo intervals (threshold)', sets: 4, duration: '4min on / 2min off', frequency: '1x/week' },
      ],
      minimumDose: '4 cardio sessions per week (3 zone-2, 1 intervals)',
      expectedOutcome: '~10-15% VO₂max gain in 8-12 weeks at this dose.',
      reassessmentCadence: [8, 12],
      contraindications: ['Medical clearance recommended if RHR > 90 or BP > 140/90'],
      confidence: 'high',
      references: ['ACSM Position Stand on Aerobic Training 2011'],
    },
    severe: {
      finding: 'Significantly below-baseline VO₂max',
      diagnosis: 'Aerobic capacity well below age-percentile. Recovery between sets / sessions likely compromised.',
      prescription: [
        { name: 'Zone-2 cardio (low intensity)', duration: '20-30min', frequency: 'starting 3x/week, build to 4x' },
        { name: 'Walking intervals (build aerobic base)', duration: '20min', frequency: 'daily on non-cardio days' },
      ],
      minimumDose: '3-4 cardio sessions/week, ramping over 4-6 weeks',
      expectedOutcome: '~15-25% gain in 12 weeks at this dose. Build aerobic base before adding intensity.',
      reassessmentCadence: [4, 8, 12],
      contraindications: [
        'Pre-screen for cardiovascular risk',
        'Refer for medical evaluation if abnormal HR recovery (<10 bpm at 1min)',
      ],
      confidence: 'high',
    },
  },

  // ─── Body composition ──────────────────────────────────────────
  'weight-loss-target': {
    mild: {
      finding: 'Modest weight-loss goal',
      diagnosis: 'Targeted weight loss with healthy starting composition. Slow + sustainable approach to preserve muscle.',
      prescription: [
        { name: 'Caloric deficit', frequency: 'daily', notes: '~250-500 kcal below maintenance' },
        { name: 'Resistance training', frequency: '3x/week', notes: 'Preserve lean mass during deficit' },
        { name: 'Protein 1.6-2.2 g/kg bodyweight', frequency: 'daily' },
        { name: 'Step target', frequency: 'daily', notes: '8000+ steps/day' },
      ],
      minimumDose: '3 strength sessions/week, daily protein hit',
      expectedOutcome: '~0.4-0.6 kg/week sustainable rate.',
      reassessmentCadence: [4, 8, 12],
      contraindications: ['Slow rate further if muscle/strength drops'],
      confidence: 'high',
    },
    moderate: {
      finding: 'Significant weight-loss goal',
      diagnosis: 'Above-average body fat with weight-loss intent. Sustainable rate possible without extreme deficit.',
      prescription: [
        { name: 'Caloric deficit', frequency: 'daily', notes: '~500 kcal below maintenance' },
        { name: 'Resistance training', frequency: '3-4x/week' },
        { name: 'Cardio (zone 2)', frequency: '3x/week, 30-45min' },
        { name: 'Protein 1.8-2.2 g/kg bodyweight', frequency: 'daily' },
        { name: 'Step target', frequency: 'daily', notes: '10000+ steps/day' },
      ],
      minimumDose: '3 strength + 2 cardio sessions/week',
      expectedOutcome: '~0.6-0.8 kg/week sustainable rate. Expect plateaus around weeks 8-10 — refeed if needed.',
      reassessmentCadence: [4, 8, 12, 16],
      contraindications: ['Pause progress if HRV / sleep deteriorate sharply'],
      confidence: 'high',
    },
    severe: {
      finding: 'Major weight-loss goal',
      diagnosis: 'Substantial body fat to reduce. Larger initial losses possible; transition to maintenance approach as composition improves.',
      prescription: [
        { name: 'Caloric deficit', frequency: 'daily', notes: '~500-750 kcal below maintenance to start' },
        { name: 'Resistance training', frequency: '3x/week' },
        { name: 'Daily walking', duration: '45-60min', frequency: 'daily' },
        { name: 'Zone-2 cardio', duration: '30min', frequency: '2-3x/week' },
        { name: 'Protein 1.8-2.2 g/kg', frequency: 'daily' },
      ],
      minimumDose: '3 strength + daily walking',
      expectedOutcome: '~0.7-1.0% bodyweight/week initially; rate slows as composition improves.',
      reassessmentCadence: [4, 8, 12, 16, 20],
      contraindications: [
        'Medical clearance if BMI > 35 or comorbidities',
        'Avoid extreme deficits — preserves metabolic rate long-term',
      ],
      confidence: 'high',
    },
  },

  'muscle-building-target': {
    moderate: {
      finding: 'Muscle-building goal',
      diagnosis: 'Targeted muscle gain. Caloric surplus + progressive overload + adequate protein.',
      prescription: [
        { name: 'Caloric surplus', frequency: 'daily', notes: '~200-400 kcal above maintenance' },
        { name: 'Resistance training', frequency: '4-5x/week', notes: 'Progressive overload, hypertrophy rep ranges 6-12' },
        { name: 'Protein 1.6-2.2 g/kg', frequency: 'daily' },
        { name: 'Sleep target', frequency: 'nightly', notes: '7-9 hours; recovery is non-negotiable' },
      ],
      minimumDose: '4 strength sessions/week with progressive overload',
      expectedOutcome: 'Rate scales with training experience — see physiological-rates module for projection.',
      reassessmentCadence: [4, 8, 12, 16],
      contraindications: [],
      confidence: 'high',
    },
  },

  // ─── Lifestyle ─────────────────────────────────────────────────
  'sleep-deficit': {
    moderate: {
      finding: 'Insufficient or inconsistent sleep',
      diagnosis: 'Sleep duration / consistency below ideal. Limits recovery, hormonal balance, training response.',
      prescription: [
        { name: 'Consistent sleep / wake times (same window 7 days/week)', frequency: 'daily' },
        { name: 'Bedroom dark + cool (18-20°C)', frequency: 'nightly' },
        { name: 'Last caffeine ≥ 8h before bed', frequency: 'daily' },
        { name: 'Wind-down routine (30min screen-free pre-bed)', frequency: 'nightly' },
      ],
      minimumDose: 'Daily — small adherence drift compounds quickly',
      expectedOutcome: '8-week habit-change window. Track sleep duration + quality weekly.',
      reassessmentCadence: [4, 8],
      contraindications: ['Refer for sleep study if persistent insomnia or snoring with daytime fatigue'],
      confidence: 'high',
    },
    severe: {
      finding: 'Chronic sleep deficit',
      diagnosis: '< 6 hours nightly or persistent fragmentation. Significantly compromises every other training adaptation.',
      prescription: [
        { name: 'Sleep schedule audit (set + hold targets)', frequency: 'daily' },
        { name: 'Caffeine cutoff at noon', frequency: 'daily' },
        { name: 'No screens 60min pre-bed', frequency: 'nightly' },
        { name: 'Sleep diary (track consistency)', frequency: 'daily' },
        { name: 'Consider melatonin (0.3-1mg, 30min pre-bed) — short-term reset', frequency: 'as discussed' },
      ],
      minimumDose: 'Daily, with weekly review',
      expectedOutcome: '12-week behaviour change. Should see gains in HRV / training response by week 6-8.',
      reassessmentCadence: [4, 8, 12],
      contraindications: [
        'Strongly recommend sleep study if loud snoring + daytime fatigue',
        'Refer to GP if persistent insomnia',
      ],
      confidence: 'medium',
    },
  },

  'high-stress': {
    moderate: {
      finding: 'Moderate-to-high stress',
      diagnosis: 'Elevated stress levels. Limits recovery, impacts decision-making around nutrition + adherence.',
      prescription: [
        { name: 'Daily stress-down practice (breathwork / walk / journal)', duration: '10min', frequency: 'daily' },
        { name: 'Cap caffeine ≤ 2 cups/day', frequency: 'daily' },
        { name: 'Outdoor time (sunlight + low-intensity movement)', duration: '20min', frequency: 'daily' },
      ],
      minimumDose: 'Daily',
      expectedOutcome: 'Subjective improvement in 4-8 weeks; HRV trends often shift in similar window.',
      reassessmentCadence: [4, 8],
      contraindications: ['Refer for psychological support if stress impacting daily function'],
      confidence: 'medium',
    },
    severe: {
      finding: 'Chronic high stress',
      diagnosis: 'Persistent high stress. Recovery + nutrition + sleep all likely compromised. Training adaptations will plateau without addressing.',
      prescription: [
        { name: 'Structured stress-management practice (15-20min/day)', frequency: 'daily' },
        { name: 'Sleep priority (see sleep prescription)', frequency: 'daily' },
        { name: 'Reduce training volume by 20% during high-stress windows', frequency: 'as needed' },
        { name: 'Consider professional support', frequency: 'one-off conversation' },
      ],
      minimumDose: 'Daily structured practice + sleep priority',
      expectedOutcome: '12-16 week timeline for sustained shift. Some clients benefit from professional support.',
      reassessmentCadence: [4, 8, 12, 16],
      contraindications: [
        'Refer for mental-health support if stress affecting work / relationships / sleep persistently',
        'Reduce training intensity during peak stress periods',
      ],
      confidence: 'medium',
    },
  },
};

/** Convenience lookup with safe fallback. */
export function lookupIntervention(
  findingId: FindingId,
  severity: FindingSeverity,
): LibraryEntry | null {
  const entry = INTERVENTION_LIBRARY[findingId]?.[severity];
  return entry ?? null;
}
