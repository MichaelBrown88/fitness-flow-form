/**
 * Coach-only consultation prompts (studio). Not shown on client AXIS report.
 */

export const CONSULTATION_COPY = {
  prepNotesLabel: 'Prep notes (coach only)',
  prepNotesPlaceholder: 'Review before they arrive — follow-ups, red flags, topics to cover…',
  sectionTitle: 'Consultation',
  sectionSummary: 'Capture what they say in their own words. This stays on your client profile, not their report.',
  goalsLabel: 'Goal direction',
  goalsPlaceholder: 'Select primary and optional secondary focus',
  goalDeadlineLabel: 'Target date (optional)',
  trainingFrequencyLabel: 'Sessions per week (current)',
  historyTitle: 'Previous consultations',
  continueToPhysical: 'Start physical assessment',
  continueToConsultation: 'Continue to consultation',
  intakeReviewTitle: 'Intake review',
  intakeReviewSummary:
    'Walk through what they submitted at home. Tap a section to correct anything before you continue.',
  intakeReviewTitleStudio: 'Before physical tests',
  intakeReviewSummaryStudio:
    'You will capture client info, PAR-Q, and lifestyle in the next sections — there is nothing from a home link yet.',
} as const;

export const CONSULTATION_QUESTIONS = [
  {
    id: 'whyNow',
    label: 'What made you start now / book in?',
    placeholder: 'In their words…',
  },
  {
    id: 'successInWords',
    label: 'What would success look like in about 3–4 months?',
    placeholder: 'How they describe progress…',
  },
  {
    id: 'motivationNotes',
    label: 'What matters most to them?',
    placeholder: 'Health, performance, appearance, event, pain, confidence…',
  },
  {
    id: 'injuryHistory',
    label: 'Past injuries, surgeries, what still flares',
    placeholder: 'History and current relevance…',
  },
  {
    id: 'currentLimitations',
    label: 'Anything hurting today or movements to avoid',
    placeholder: 'Current pain, limitations…',
  },
  {
    id: 'occupationTypicalDay',
    label: 'Work and typical day',
    placeholder: 'Desk, manual, shifts, travel…',
  },
  {
    id: 'previousCoaching',
    label: 'Previous PT / coaching — what worked or didn’t',
    placeholder: 'Past experience…',
  },
  {
    id: 'barriers',
    label: 'Barriers',
    placeholder: 'Time, confidence, travel, budget…',
  },
  {
    id: 'anythingElse',
    label: 'Anything else we should know',
    placeholder: 'Open notes…',
  },
] as const;

export type ConsultationQuestionId = (typeof CONSULTATION_QUESTIONS)[number]['id'];
