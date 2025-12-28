import { useMemo, useState } from 'react';
import { useFormContext } from '@/contexts/FormContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

type FieldDef =
  | { kind: 'text' | 'number' | 'email'; key: keyof import('@/contexts/FormContext').FormData; label: string; placeholder?: string }
  | { kind: 'select'; key: keyof import('@/contexts/FormContext').FormData; label: string; options: { value: string; label: string }[] }
  | { kind: 'boolean'; key: keyof import('@/contexts/FormContext').FormData; label: string }
  | { kind: 'checkbox-multi'; key: keyof import('@/contexts/FormContext').FormData; label: string; options: { value: string; label: string }[] };

type Group = { sectionTitle: string; cardTitle: string; fields: FieldDef[] };

export default function GroupedFlow({ onSubmit }: { onSubmit: () => void }) {
  const { formData, updateFormData } = useFormContext();
  const [groupIdx, setGroupIdx] = useState(0);

  const groups: Group[] = useMemo(() => [
    // 1) Basic Info
    {
      sectionTitle: 'Client Information',
      cardTitle: 'Basic Info',
      fields: [
        { kind: 'text', key: 'fullName', label: 'Full Name', placeholder: 'Enter full name' },
        { kind: 'text', key: 'dateOfBirth', label: 'Date of Birth', placeholder: 'YYYY-MM-DD' },
        { kind: 'select', key: 'gender', label: 'Gender', options: [ { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' } ] },
        { kind: 'select', key: 'assignedCoach', label: 'Assigned Coach', options: [ { value: 'coach-mike', label: 'Coach Mike' }, { value: 'coach-selina', label: 'Coach Selina' } ] },
        { kind: 'email', key: 'email', label: 'Email', placeholder: 'email@example.com' },
        { kind: 'checkbox-multi', key: 'clientGoals', label: 'Goals', options: [ { value: 'weight-loss', label: 'Weight Loss' }, { value: 'build-muscle', label: 'Muscle Gain' }, { value: 'build-strength', label: 'Build Strength' }, { value: 'improve-fitness', label: 'Improve Fitness' } ] },
      ],
    },
    // 2) InBody Results
    {
      sectionTitle: 'InBody Results',
      cardTitle: 'Body Composition',
      fields: [
        { kind: 'number', key: 'heightCm', label: 'Height (cm)', placeholder: '170' },
        { kind: 'number', key: 'inbodyWeightKg', label: 'Weight (kg)', placeholder: '70' },
        { kind: 'number', key: 'inbodyBodyFatPct', label: 'Body Fat %', placeholder: '20.5' },
        { kind: 'number', key: 'skeletalMuscleMassKg', label: 'Skeletal Muscle Mass (kg)', placeholder: '30' },
        { kind: 'number', key: 'visceralFatLevel', label: 'Visceral Fat Rating', placeholder: '10' },
      ],
    },
    // 3) Posture
    {
      sectionTitle: 'Posture',
      cardTitle: 'Posture Assessment',
      fields: [
        { kind: 'select', key: 'postureHeadOverall', label: 'Head and neck', options: [ { value: 'neutral', label: 'Neutral' }, { value: 'forward-head', label: 'Forward Head' } ] },
        { kind: 'select', key: 'postureShouldersOverall', label: 'Shoulders', options: [ { value: 'neutral', label: 'Neutral' }, { value: 'rounded', label: 'Rounded' } ] },
        { kind: 'select', key: 'postureBackOverall', label: 'Back', options: [ { value: 'neutral', label: 'Neutral' }, { value: 'increased-kyphosis', label: 'Kyphosis' } ] },
        { kind: 'select', key: 'postureHipsOverall', label: 'Hips', options: [ { value: 'neutral', label: 'Neutral' }, { value: 'anterior-tilt', label: 'Anterior Tilt' } ] },
        { kind: 'select', key: 'postureKneesOverall', label: 'Knees', options: [ { value: 'neutral', label: 'Neutral' }, { value: 'valgus-knee', label: 'Valgus' } ] },
      ],
    },
    // 4) Movement: Overhead Squat (alone)
    {
      sectionTitle: 'Movement',
      cardTitle: 'Overhead Squat',
      fields: [
        { kind: 'select', key: 'ohsKneeAlignment', label: 'Knee alignment', options: [ { value: 'no-issue', label: 'No issue' }, { value: 'valgus', label: 'Valgus' } ] },
        { kind: 'select', key: 'ohsTorsoLean', label: 'Torso lean', options: [ { value: 'upright', label: 'Upright' }, { value: 'moderate-lean', label: 'Moderate' } ] },
        { kind: 'select', key: 'ohsHipShift', label: 'Hip shift', options: [ { value: 'none', label: 'None' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' } ] },
        { kind: 'select', key: 'ohsSquatDepth', label: 'Depth', options: [ { value: 'full-depth', label: 'Full depth' }, { value: 'parallel', label: 'Parallel' } ] },
        { kind: 'select', key: 'ohsHeelBehavior', label: 'Heel behavior', options: [ { value: 'heels-down', label: 'Heels down' }, { value: 'heels-lift', label: 'Heels lift' } ] },
        { kind: 'select', key: 'ohsHasPain', label: 'Pain/Discomfort?', options: [ { value: 'no', label: 'No pain' }, { value: 'yes', label: 'Yes - Pain reported' } ] },
      ],
    },
    // 5) Movement: Lunge (own screen)
    {
      sectionTitle: 'Movement',
      cardTitle: 'Lunge',
      fields: [
        { kind: 'select', key: 'lungeLeftKneeAlignment', label: 'Left Knee', options: [ { value: 'tracks-straight', label: 'Tracks straight' }, { value: 'caves-inward', label: 'Valgus' } ] },
        { kind: 'select', key: 'lungeRightKneeAlignment', label: 'Right Knee', options: [ { value: 'tracks-straight', label: 'Tracks straight' }, { value: 'caves-inward', label: 'Valgus' } ] },
        { kind: 'select', key: 'lungeHasPain', label: 'Pain/Discomfort?', options: [ { value: 'no', label: 'No pain' }, { value: 'yes', label: 'Yes - Pain reported' } ] },
      ],
    },
    // 6) Movement: Mobility
    {
      sectionTitle: 'Movement',
      cardTitle: 'Mobility Screens',
      fields: [
        { kind: 'select', key: 'mobilityHip', label: 'Hip Mobility', options: [ { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' } ] },
        { kind: 'select', key: 'mobilityShoulder', label: 'Shoulder Mobility', options: [ { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' } ] },
        { kind: 'select', key: 'mobilityAnkle', label: 'Ankle Mobility', options: [ { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' } ] },
      ],
    },
    // 7) Movement: Hinge (own screen)
    {
      sectionTitle: 'Movement',
      cardTitle: 'Hinge',
      fields: [
        { kind: 'select', key: 'hingeQuality', label: 'Hinge quality', options: [ { value: 'good', label: 'Good' }, { value: 'compensation', label: 'Compensations' }, { value: 'poor', label: 'Poor' } ] },
        { kind: 'select', key: 'hingeBalance', label: 'Hinge balance', options: [ { value: 'stable', label: 'Stable' }, { value: 'slight-wobble', label: 'Slight wobble' }, { value: 'unstable', label: 'Unstable' } ] },
        { kind: 'select', key: 'hingeHasPain', label: 'Pain/Discomfort?', options: [ { value: 'no', label: 'No pain' }, { value: 'yes', label: 'Yes - Pain reported' } ] },
      ],
    },
    // 8) Muscular Endurance grouped
    {
      sectionTitle: 'Muscular Endurance',
      cardTitle: 'Upper / Lower Endurance',
      fields: [
        { kind: 'number', key: 'pushupsOneMinuteReps', label: 'Push-ups in 1 minute', placeholder: 'e.g., 25' },
        { kind: 'number', key: 'squatsOneMinuteReps', label: 'Bodyweight squats in 1 minute', placeholder: 'e.g., 35' },
      ],
    },
    // 9) Core strength & stability grouped
    {
      sectionTitle: 'Core Strength & Stability',
      cardTitle: 'Core Tests',
      fields: [
        { kind: 'number', key: 'plankDurationSeconds', label: 'Plank hold (sec)', placeholder: 'e.g., 60' },
      ],
    },
    // 10) Grip strength grouped
    {
      sectionTitle: 'Grip Strength',
      cardTitle: 'Grip Strength',
      fields: [
        { kind: 'number', key: 'gripLeftKg', label: 'Grip left (kg)', placeholder: 'e.g., 28.5' },
        { kind: 'number', key: 'gripRightKg', label: 'Grip right (kg)', placeholder: 'e.g., 32.0' },
      ],
    },
    // 11) Fitness one screen
    {
      sectionTitle: 'Fitness',
      cardTitle: 'Cardio Test',
      fields: [
        { kind: 'select', key: 'cardioTestSelected', label: 'Test type', options: [ { value: 'ymca-step', label: 'YMCA Step Test' }, { value: 'treadmill', label: 'Treadmill Test' } ] },
        { kind: 'number', key: 'cardioRestingHr', label: 'Resting HR (bpm)', placeholder: 'e.g., 65' },
        { kind: 'number', key: 'cardioPost1MinHr', label: '1-min Post-Test HR (bpm)', placeholder: 'e.g., 110' },
      ],
    },
  ], []);

  const totalGroups = groups.length;
  const group = groups[groupIdx];

  const update = (key: keyof import('@/contexts/FormContext').FormData, value: any) => {
    updateFormData({ [key]: value } as any);
  };

  const renderField = (f: FieldDef) => {
    const value: any = (formData as any)[(f as any).key];
    switch (f.kind) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div key={(f as any).key as string} className="space-y-1">
            <Label>{f.label}</Label>
            <Input
              id={(f as any).key as string}
              type={f.kind === 'number' ? 'number' : f.kind}
              value={value ?? ''}
              onChange={(e) => update((f as any).key, e.target.value)}
              placeholder={f.placeholder}
              className="h-12"
            />
          </div>
        );
      case 'select':
        return (
          <div key={(f as any).key as string} className="space-y-1">
            <Label>{f.label}</Label>
            <Select value={value ?? ''} onValueChange={(v) => update((f as any).key, v)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder={`Select ${f.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {f.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'boolean':
        return (
          <div key={(f as any).key as string} className="flex items-center space-x-2">
            <Checkbox id={(f as any).key as string} checked={Boolean(value)} onCheckedChange={(c) => update((f as any).key, Boolean(c))} />
            <Label htmlFor={(f as any).key as string}>{f.label}</Label>
          </div>
        );
      case 'checkbox-multi':
        return (
          <div key={(f as any).key as string} className="space-y-2">
            <Label>{f.label}</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {f.options.map((opt) => {
                const selected: string[] = Array.isArray(value) ? value : [];
                const checked = selected.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={() => {
                      const next = checked ? selected.filter((v) => v !== opt.value) : [...selected, opt.value];
                      update((f as any).key, next);
                    }} />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
    }
  };

  const next = () => setGroupIdx((i) => Math.min(i + 1, totalGroups - 1));
  const prev = () => setGroupIdx((i) => Math.max(i - 1, 0));

  return (
    <div className="space-y-4">
      <Progress value={((groupIdx + 1) / totalGroups) * 100} className="h-2" />
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{group.sectionTitle}</h2>
      <div className="glass p-6 md:p-8 space-y-4">
        <h3 className="text-lg font-semibold">{group.cardTitle}</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {group.fields.map(renderField)}
        </div>
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={prev} disabled={groupIdx === 0}>Back</Button>
          {groupIdx === totalGroups - 1 ? (
            <Button onClick={onSubmit}>Finish</Button>
          ) : (
            <Button onClick={next}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}


