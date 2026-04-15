import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ASSESSMENT_OPTIONS, ASSESSMENT_LABELS } from '@/constants/assessment';

const P1_LABELS = ASSESSMENT_LABELS.P1;

export type LifestyleRemoteState = {
  activityLevel: string;
  sleepArchetype: string;
  stressLevel: string;
  nutritionHabits: string;
  hydrationHabits: string;
  stepsPerDay: string;
  sedentaryHours: string;
  caffeineCupsPerDay: string;
  alcoholFrequency: string;
  medicationsFlag: string;
  medicationsNotes: string;
};

export const INITIAL_LIFESTYLE_REMOTE: LifestyleRemoteState = {
  activityLevel: '',
  sleepArchetype: '',
  stressLevel: '',
  nutritionHabits: '',
  hydrationHabits: '',
  stepsPerDay: '',
  sedentaryHours: '',
  caffeineCupsPerDay: '',
  alcoholFrequency: '',
  medicationsFlag: '',
  medicationsNotes: '',
};

type PublicRemoteLifestyleFieldsProps = {
  value: LifestyleRemoteState;
  onChange: (next: LifestyleRemoteState) => void;
  allowedKeys: Set<string>;
};

export function PublicRemoteLifestyleFields({
  value,
  onChange,
  allowedKeys,
}: PublicRemoteLifestyleFieldsProps) {
  const patch = (partial: Partial<LifestyleRemoteState>) => onChange({ ...value, ...partial });

  return (
    <div className="space-y-4">
      {allowedKeys.has('activityLevel') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.activityLevel}</Label>
          <Select value={value.activityLevel} onValueChange={(v) => patch({ activityLevel: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.activityLevel.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {allowedKeys.has('sleepArchetype') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.sleepArchetype}</Label>
          <Select value={value.sleepArchetype} onValueChange={(v) => patch({ sleepArchetype: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.sleepArchetype.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {allowedKeys.has('stressLevel') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.stressLevel}</Label>
          <Select value={value.stressLevel} onValueChange={(v) => patch({ stressLevel: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.stressLevel.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {allowedKeys.has('nutritionHabits') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.nutritionHabits}</Label>
          <Select value={value.nutritionHabits} onValueChange={(v) => patch({ nutritionHabits: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.nutritionHabits.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {allowedKeys.has('hydrationHabits') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.hydrationHabits}</Label>
          <Select value={value.hydrationHabits} onValueChange={(v) => patch({ hydrationHabits: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.hydrationHabits.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {allowedKeys.has('stepsPerDay') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.stepsPerDay}</Label>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            inputMode="numeric"
            value={value.stepsPerDay}
            onChange={(e) => patch({ stepsPerDay: e.target.value })}
            placeholder="e.g. 8000"
          />
        </div>
      ) : null}
      {allowedKeys.has('sedentaryHours') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.sedentaryHours}</Label>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            inputMode="numeric"
            value={value.sedentaryHours}
            onChange={(e) => patch({ sedentaryHours: e.target.value })}
            placeholder="e.g. 8"
          />
        </div>
      ) : null}
      {allowedKeys.has('caffeineCupsPerDay') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.caffeineCupsPerDay}</Label>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            inputMode="numeric"
            value={value.caffeineCupsPerDay}
            onChange={(e) => patch({ caffeineCupsPerDay: e.target.value })}
            placeholder="e.g. 2"
          />
        </div>
      ) : null}
      {allowedKeys.has('alcoholFrequency') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.alcoholFrequency}</Label>
          <Select value={value.alcoholFrequency} onValueChange={(v) => patch({ alcoholFrequency: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.alcoholFrequency.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {allowedKeys.has('medicationsFlag') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.medicationsFlag}</Label>
          <Select value={value.medicationsFlag} onValueChange={(v) => patch({ medicationsFlag: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.medicationsFlag.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {allowedKeys.has('medicationsNotes') && value.medicationsFlag === 'yes' ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.medicationsNotes}</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            value={value.medicationsNotes}
            onChange={(e) => patch({ medicationsNotes: e.target.value })}
            placeholder="List medications and any relevant notes"
          />
        </div>
      ) : null}
    </div>
  );
}
