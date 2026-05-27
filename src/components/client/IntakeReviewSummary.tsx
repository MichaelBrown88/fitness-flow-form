import type { FormData } from '@/contexts/FormContext';
import { ASSESSMENT_LABELS } from '@/constants/assessment';
import { CONSULTATION_COPY } from '@/constants/consultation';
import {
  countParqYesAnswers,
  formatIntakeFieldLabel,
} from '@/lib/consultation/displayHelpers';
import { hasRemotePostureCaptureComplete } from '@/lib/assessment/studioSessionSteps';

type Row = { label: string; value: string };

function SectionBlock({ title, rows }: { title: string; rows: Row[] }) {
  if (rows.every((r) => r.value === '—')) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="text-sm text-foreground break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export interface IntakeReviewSummaryProps {
  formData: FormData;
  /** Remote home intake vs all-in-studio (copy only). */
  variant?: 'remote' | 'studio';
}

export function IntakeReviewSummary({
  formData,
  variant = 'remote',
}: IntakeReviewSummaryProps) {
  const p0 = ASSESSMENT_LABELS.P0;
  const p1 = ASSESSMENT_LABELS.P1;
  const parqYes = countParqYesAnswers(formData);
  const postureDone = hasRemotePostureCaptureComplete(formData);

  const aboutRows: Row[] = [
    { label: p0.fullName, value: formatIntakeFieldLabel('fullName', formData.fullName) },
    { label: p0.email, value: formatIntakeFieldLabel('email', formData.email) },
    { label: p0.phone, value: formatIntakeFieldLabel('phone', formData.phone) },
    { label: p0.dateOfBirth, value: formatIntakeFieldLabel('dateOfBirth', formData.dateOfBirth) },
    { label: p0.gender, value: formatIntakeFieldLabel('gender', formData.gender) },
    { label: p0.trainingHistory, value: formatIntakeFieldLabel('trainingHistory', formData.trainingHistory) },
    { label: p0.recentActivity, value: formatIntakeFieldLabel('recentActivity', formData.recentActivity) },
  ];

  if (formData.recentActivity === 'currently-training') {
    aboutRows.push({
      label: p0.primaryTrainingStyles,
      value: formatIntakeFieldLabel('primaryTrainingStyles', formData.primaryTrainingStyles),
    });
  }

  const lifestyleRows: Row[] = [
    { label: p1.activityLevel, value: formatIntakeFieldLabel('activityLevel', formData.activityLevel) },
    { label: p1.stepsPerDay, value: formatIntakeFieldLabel('stepsPerDay', formData.stepsPerDay) },
    { label: p1.sedentaryHours, value: formatIntakeFieldLabel('sedentaryHours', formData.sedentaryHours) },
    { label: p1.sleepArchetype, value: formatIntakeFieldLabel('sleepArchetype', formData.sleepArchetype) },
    { label: p1.stressLevel, value: formatIntakeFieldLabel('stressLevel', formData.stressLevel) },
    { label: p1.nutritionHabits, value: formatIntakeFieldLabel('nutritionHabits', formData.nutritionHabits) },
    { label: p1.hydrationHabits, value: formatIntakeFieldLabel('hydrationHabits', formData.hydrationHabits) },
    { label: p1.alcoholFrequency, value: formatIntakeFieldLabel('alcoholFrequency', formData.alcoholFrequency) },
    { label: p1.medicationsFlag, value: formatIntakeFieldLabel('medicationsFlag', formData.medicationsFlag) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {variant === 'studio'
            ? CONSULTATION_COPY.intakeReviewTitleStudio
            : CONSULTATION_COPY.intakeReviewTitle}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {variant === 'studio'
            ? CONSULTATION_COPY.intakeReviewSummaryStudio
            : CONSULTATION_COPY.intakeReviewSummary}
        </p>
      </div>
      <SectionBlock title="About them" rows={aboutRows} />
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Health screening (PAR-Q)</h3>
        <p className="text-sm text-foreground">
          {parqYes === 0
            ? 'No yes answers flagged — confirm verbally before physical testing.'
            : `${parqYes} yes answer${parqYes === 1 ? '' : 's'} — review clearance before physical testing.`}
        </p>
      </section>
      <SectionBlock title="Lifestyle" rows={lifestyleRows} />
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Posture at home</h3>
        <p className="text-sm text-foreground">
          {postureDone
            ? 'All four views captured at home — studio posture capture can be skipped.'
            : 'Posture not completed at home — plan for in-studio capture after physical tests.'}
        </p>
      </section>
    </div>
  );
}
