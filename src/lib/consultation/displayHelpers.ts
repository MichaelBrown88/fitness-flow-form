import { ASSESSMENT_OPTIONS } from '@/constants/assessment';
import type { FormData } from '@/contexts/FormContext';

function labelFor(
  options: ReadonlyArray<{ readonly value: string; readonly label: string }>,
  value: string | undefined,
): string {
  if (!value?.trim()) return '—';
  return options.find((o) => o.value === value)?.label ?? value;
}

export function formatIntakeFieldLabel(field: keyof FormData, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value
      .map((v) => {
        if (field === 'primaryTrainingStyles') {
          return labelFor(ASSESSMENT_OPTIONS.primaryTrainingStyles, String(v));
        }
        if (field === 'clientGoals') {
          return labelFor(ASSESSMENT_OPTIONS.clientGoals, String(v));
        }
        return String(v);
      })
      .join(', ');
  }
  const str = String(value);
  switch (field) {
    case 'gender':
      return labelFor(ASSESSMENT_OPTIONS.gender, str);
    case 'trainingHistory':
      return labelFor(ASSESSMENT_OPTIONS.trainingHistory, str);
    case 'recentActivity':
      return labelFor(ASSESSMENT_OPTIONS.recentActivity, str);
    case 'activityLevel':
      return labelFor(ASSESSMENT_OPTIONS.activityLevel, str);
    case 'sleepArchetype':
      return labelFor(ASSESSMENT_OPTIONS.sleepArchetype, str);
    case 'stressLevel':
      return labelFor(ASSESSMENT_OPTIONS.stressLevel, str);
    case 'nutritionHabits':
      return labelFor(ASSESSMENT_OPTIONS.nutritionHabits, str);
    case 'hydrationHabits':
      return labelFor(ASSESSMENT_OPTIONS.hydrationHabits, str);
    case 'alcoholFrequency':
      return labelFor(ASSESSMENT_OPTIONS.alcoholFrequency, str);
    case 'medicationsFlag':
      return labelFor(ASSESSMENT_OPTIONS.medicationsFlag, str);
    case 'trainingFrequency':
      return labelFor(ASSESSMENT_OPTIONS.trainingFrequency, str);
    default:
      return str;
  }
}

export function countParqYesAnswers(formData: FormData): number {
  let count = 0;
  for (let i = 1; i <= 13; i++) {
    const key = `parq${i}` as keyof FormData;
    const v = formData[key];
    if (typeof v === 'string' && v.toLowerCase() === 'yes') count += 1;
  }
  return count;
}
