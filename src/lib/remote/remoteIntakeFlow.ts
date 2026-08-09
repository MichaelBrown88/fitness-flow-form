import { parqQuestions } from '@/components/ParQQuestionnaire';
import type { BasicInfoState } from '@/components/remote/steps/RemoteBasicInfoStep';
import {
  basicFieldNeedsClientInput,
  type RemoteBasicInfoPrefill,
} from '@/lib/remote/remoteIntakePrefill';
import type { LifestyleRemoteState } from '@/components/remote/PublicRemoteLifestyleFields';
import { ASSESSMENT_LABELS, ASSESSMENT_OPTIONS } from '@/constants/assessment';

const P6 = ASSESSMENT_LABELS.P6;

const P0 = ASSESSMENT_LABELS.P0;
const P1 = ASSESSMENT_LABELS.P1;

export type RemoteIntakeScreen =
  | { id: 'welcome'; kind: 'welcome' }
  | {
      id: string;
      kind: 'text';
      field: keyof BasicInfoState | keyof LifestyleRemoteState;
      label: string;
      placeholder?: string;
      inputType?: string;
      autoComplete?: string;
      inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal';
      readOnly?: boolean;
      domain: 'basic' | 'lifestyle';
    }
  | {
      id: 'dateOfBirth';
      kind: 'dateOfBirth';
      label: string;
      readOnly?: boolean;
      domain: 'basic';
    }
  | {
      id: string;
      kind: 'select';
      field: keyof BasicInfoState | keyof LifestyleRemoteState;
      label: string;
      options: SelectOption[];
      readOnly?: boolean;
      domain: 'basic' | 'lifestyle';
    }
  | {
      id: string;
      kind: 'group';
      title: string;
      fields: { field: keyof LifestyleRemoteState; label: string; placeholder?: string }[];
      domain: 'lifestyle';
    }
  | { id: string; kind: 'parq'; questionId: string; label: string }
  | { id: 'goals'; kind: 'goals'; label: string; options: SelectOption[] }
  | {
      id: 'trainingFrequency';
      kind: 'trainingFrequency';
      label: string;
      options: SelectOption[];
    }
  | { id: 'posture'; kind: 'posture' };

type SelectOption = { value: string; label: string };

function selectOptions(
  opts: ReadonlyArray<{ readonly value: string; readonly label: string }>,
): SelectOption[] {
  return opts.map((o) => ({ value: o.value, label: o.label }));
}

const LIFESTYLE_SELECTS: {
  field: keyof LifestyleRemoteState;
  label: string;
  options: SelectOption[];
}[] = [
  { field: 'activityLevel', label: P1.activityLevel, options: selectOptions(ASSESSMENT_OPTIONS.activityLevel) },
  { field: 'sleepArchetype', label: P1.sleepArchetype, options: selectOptions(ASSESSMENT_OPTIONS.sleepArchetype) },
  { field: 'stressLevel', label: P1.stressLevel, options: selectOptions(ASSESSMENT_OPTIONS.stressLevel) },
  { field: 'nutritionHabits', label: P1.nutritionHabits, options: selectOptions(ASSESSMENT_OPTIONS.nutritionHabits) },
  { field: 'hydrationHabits', label: P1.hydrationHabits, options: selectOptions(ASSESSMENT_OPTIONS.hydrationHabits) },
  { field: 'alcoholFrequency', label: P1.alcoholFrequency, options: selectOptions(ASSESSMENT_OPTIONS.alcoholFrequency) },
  { field: 'medicationsFlag', label: P1.medicationsFlag, options: selectOptions(ASSESSMENT_OPTIONS.medicationsFlag) },
];

export function buildRemoteIntakeScreens(params: {
  allowedKeys: Set<string>;
  prefill: RemoteBasicInfoPrefill;
  gender: string;
}): RemoteIntakeScreen[] {
  const screens: RemoteIntakeScreen[] = [{ id: 'welcome', kind: 'welcome' }];

  const basicScreens: RemoteIntakeScreen[] = [
    {
      id: 'fullName',
      kind: 'text',
      field: 'fullName',
      label: P0.fullName,
      placeholder: 'First and last name',
      autoComplete: 'name',
      readOnly: !basicFieldNeedsClientInput('fullName', params.prefill),
      domain: 'basic',
    },
    {
      id: 'email',
      kind: 'text',
      field: 'email',
      label: P0.email,
      placeholder: 'you@email.com',
      inputType: 'email',
      autoComplete: 'email',
      inputMode: 'email',
      readOnly: !basicFieldNeedsClientInput('email', params.prefill),
      domain: 'basic',
    },
    {
      id: 'phone',
      kind: 'text',
      field: 'phone',
      label: P0.phone,
      placeholder: 'Your mobile number',
      inputType: 'tel',
      autoComplete: 'tel',
      inputMode: 'tel',
      readOnly: !basicFieldNeedsClientInput('phone', params.prefill),
      domain: 'basic',
    },
    {
      id: 'dateOfBirth',
      kind: 'dateOfBirth',
      label: P0.dateOfBirth,
      readOnly: !basicFieldNeedsClientInput('dateOfBirth', params.prefill),
      domain: 'basic',
    },
    {
      id: 'gender',
      kind: 'select',
      field: 'gender',
      label: P0.gender,
      options: selectOptions(ASSESSMENT_OPTIONS.gender),
      readOnly: !basicFieldNeedsClientInput('gender', params.prefill),
      domain: 'basic',
    },
    {
      id: 'heightCm',
      kind: 'text',
      field: 'heightCm',
      label: 'Height (cm)',
      placeholder: 'e.g. 175',
      inputMode: 'numeric',
      readOnly: !basicFieldNeedsClientInput('heightCm', params.prefill),
      domain: 'basic',
    },
    {
      id: 'trainingHistory',
      kind: 'select',
      field: 'trainingHistory',
      label: P0.trainingHistory,
      options: selectOptions(ASSESSMENT_OPTIONS.trainingHistory),
      readOnly: !basicFieldNeedsClientInput('trainingHistory', params.prefill),
      domain: 'basic',
    },
    {
      id: 'recentActivity',
      kind: 'select',
      field: 'recentActivity',
      label: P0.recentActivity,
      options: selectOptions(ASSESSMENT_OPTIONS.recentActivity),
      readOnly: !basicFieldNeedsClientInput('recentActivity', params.prefill),
      domain: 'basic',
    },
  ];

  for (const screen of basicScreens) {
    if (screen.kind === 'dateOfBirth') {
      if (basicFieldNeedsClientInput('dateOfBirth', params.prefill)) {
        screens.push(screen);
      }
      continue;
    }
    if (screen.kind === 'text' || screen.kind === 'select') {
      if (basicFieldNeedsClientInput(screen.field as keyof BasicInfoState, params.prefill)) {
        screens.push(screen);
      }
    }
  }

  if (params.allowedKeys.has('stepsPerDay')) {
    screens.push({
      id: 'dailyMovement',
      kind: 'group',
      title: 'Daily movement',
      domain: 'lifestyle',
      fields: [
        { field: 'stepsPerDay', label: P1.stepsPerDay, placeholder: 'e.g. 8000' },
      ],
    });
  }

  for (const row of LIFESTYLE_SELECTS) {
    if (!params.allowedKeys.has(row.field)) continue;
    screens.push({
      id: `lifestyle_${row.field}`,
      kind: 'select',
      field: row.field,
      label: row.label,
      options: row.options,
      domain: 'lifestyle',
    });
  }

  if (params.allowedKeys.has('caffeineCupsPerDay')) {
    screens.push({
      id: 'lifestyle_caffeine',
      kind: 'text',
      field: 'caffeineCupsPerDay',
      label: P1.caffeineCupsPerDay,
      placeholder: 'e.g. 2',
      inputMode: 'numeric',
      domain: 'lifestyle',
    });
  }


  if (params.allowedKeys.has('medicationsNotes')) {
    screens.push({
      id: 'lifestyle_medicationsNotes',
      kind: 'text',
      field: 'medicationsNotes',
      label: P1.medicationsNotes,
      placeholder: 'List medications or supplements',
      domain: 'lifestyle',
    });
  }

  if (params.allowedKeys.has('clientGoals')) {
    screens.push({
      id: 'goals',
      kind: 'goals',
      label: P6.clientGoals,
      options: selectOptions(ASSESSMENT_OPTIONS.clientGoals),
    });
  }

  if (params.allowedKeys.has('trainingFrequency')) {
    screens.push({
      id: 'trainingFrequency',
      kind: 'trainingFrequency',
      label: P6.trainingFrequency,
      options: selectOptions(ASSESSMENT_OPTIONS.trainingFrequency),
    });
  }

  for (const q of parqQuestions) {
    if (q.conditional && params.gender !== q.conditional.showWhen.value) continue;
    screens.push({
      id: `parq_${q.id}`,
      kind: 'parq',
      questionId: q.id,
      label: q.question,
    });
  }

  screens.push({ id: 'posture', kind: 'posture' });

  return screens;
}

export { initialBasicFromPrefill } from '@/lib/remote/remoteIntakePrefill';

export type PreAssessmentGoalsState = {
  selectedGoals: string[];
  trainingFrequency: string;
};

export const INITIAL_PRE_ASSESSMENT_GOALS: PreAssessmentGoalsState = {
  selectedGoals: [],
  trainingFrequency: '',
};

export function isScreenValid(
  screen: RemoteIntakeScreen,
  basic: BasicInfoState,
  lifestyle: LifestyleRemoteState,
  parq: Record<string, string>,
  posturePaths: Partial<Record<string, string>>,
  goals: PreAssessmentGoalsState,
): boolean {
  switch (screen.kind) {
    case 'welcome':
      return true;
    case 'dateOfBirth':
      return basic.dateOfBirth.trim().length > 0;
    case 'text': {
      const v =
        screen.domain === 'basic'
          ? basic[screen.field as keyof BasicInfoState]
          : lifestyle[screen.field as keyof LifestyleRemoteState];
      return typeof v === 'string' && v.trim().length > 0;
    }
    case 'select': {
      const v =
        screen.domain === 'basic'
          ? basic[screen.field as keyof BasicInfoState]
          : lifestyle[screen.field as keyof LifestyleRemoteState];
      return typeof v === 'string' && v.trim().length > 0;
    }
    case 'group':
      return screen.fields.every((f) => lifestyle[f.field].trim().length > 0);
    case 'parq':
      return (parq[screen.questionId] ?? '').trim().length > 0;
    case 'goals':
      return goals.selectedGoals.length > 0;
    case 'trainingFrequency':
      return goals.trainingFrequency.trim().length > 0;
    case 'posture':
      return true;
    default:
      return false;
  }
}

export function screenTitle(screen: RemoteIntakeScreen): string | undefined {
  if (screen.kind === 'welcome') return undefined;
  if (screen.kind === 'group') return screen.title;
  if (screen.kind === 'parq') return screen.label;
  if (screen.kind === 'posture') return undefined;
  if (screen.kind === 'dateOfBirth') return undefined;
  if (
    screen.kind === 'goals' ||
    screen.kind === 'trainingFrequency' ||
    screen.kind === 'text' ||
    screen.kind === 'select'
  ) {
    return screen.label;
  }
  return undefined;
}

export function screenSubtitle(screen: RemoteIntakeScreen): string | undefined {
  if (
    screen.kind === 'welcome' ||
    screen.kind === 'posture' ||
    screen.kind === 'dateOfBirth'
  ) {
    return undefined;
  }
  if (screen.kind === 'goals') {
    return 'Pick up to two.';
  }
  if (screen.kind === 'parq') {
    return 'Your coach reviews this before your session.';
  }
  if (screen.kind === 'text' && screen.readOnly) {
    return 'We already have this from your coach — tap Next to confirm.';
  }
  return undefined;
}
