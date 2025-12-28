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
        { kind: 'number', key: 'age', label: 'Age', placeholder: 'Enter age' },
        { kind: 'select', key: 'gender', label: 'Gender', options: [ { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' } ] },
        { kind: 'select', key: 'assignedCoach', label: 'Assigned Coach', options: [ { value: 'Coach Mike', label: 'Coach Mike' }, { value: 'Coach Selina', label: 'Coach Selina' } ] },
        { kind: 'email', key: 'contactEmail', label: 'Contact Email', placeholder: 'email@example.com' },
        { kind: 'checkbox-multi', key: 'clientGoals', label: 'Goals', options: [ { value: 'weight-loss', label: 'Weight Loss' }, { value: 'muscle-gain', label: 'Muscle Gain' }, { value: 'improve-mobility', label: 'Improve Mobility' }, { value: 'general-fitness', label: 'General Fitness' } ] },
      ],
    },
    // 2) InBody Results
    {
      sectionTitle: 'InBody Results',
      cardTitle: 'Body Composition',
      fields: [
        { kind: 'number', key: 'height', label: 'Height (cm)', placeholder: '170' },
        { kind: 'number', key: 'weight', label: 'Weight (kg)', placeholder: '70' },
        { kind: 'number', key: 'bodyFat', label: 'Body Fat %', placeholder: '20.5' },
        { kind: 'number', key: 'skeletalMuscleMass', label: 'Skeletal Muscle Mass (kg)', placeholder: '30' },
        { kind: 'number', key: 'visceralFat', label: 'Visceral Fat Rating', placeholder: '10' },
      ],
    },
    // 3) Posture
    {
      sectionTitle: 'Posture',
      cardTitle: 'Posture Assessment',
      fields: [
        { kind: 'boolean', key: 'forwardHeadPosture', label: 'Forward head posture' },
        { kind: 'boolean', key: 'roundedShoulders', label: 'Rounded shoulders' },
        { kind: 'boolean', key: 'anteriorPelvicTilt', label: 'Anterior pelvic tilt' },
        { kind: 'boolean', key: 'kyphosisLordosis', label: 'Kyphosis/Lordosis' },
        { kind: 'select', key: 'kneeAlignment', label: 'Knee alignment', options: [ { value: 'none', label: 'None' }, { value: 'valgus', label: 'Valgus' }, { value: 'varus', label: 'Varus' }, { value: 'hyperextension', label: 'Hyperextension' } ] },
        { kind: 'select', key: 'footPosition', label: 'Foot position', options: [ { value: 'none', label: 'None' }, { value: 'overpronation', label: 'Overpronation' }, { value: 'underpronation', label: 'Underpronation (Supination)' }, { value: 'flat-feet', label: 'Flat Feet' }, { value: 'high-arch', label: 'High Arch' } ] },
      ],
    },
    // 4) Movement: Overhead Squat (alone)
    {
      sectionTitle: 'Movement',
      cardTitle: 'Overhead Squat',
      fields: [
        { kind: 'select', key: 'ohsHasPain', label: 'Pain/Discomfort?', options: [ { value: 'no', label: 'No pain' }, { value: 'yes', label: 'Yes - Pain reported' } ] },
        { kind: 'select', key: 'overheadSquatKneeAlignment', label: 'Knee alignment', options: [ { value: 'no-issue', label: 'No issue' }, { value: 'mild-cave', label: 'Mild cave-in' }, { value: 'severe-cave', label: 'Severe cave-in' }, { value: 'knees-out', label: 'Knees out' } ] },
        { kind: 'select', key: 'overheadSquatTorsoLean', label: 'Torso lean', options: [ { value: 'upright', label: 'Upright' }, { value: 'mild-lean', label: 'Mild forward lean' }, { value: 'excessive-lean', label: 'Excessive forward lean' } ] },
        { kind: 'select', key: 'overheadSquatHipShift', label: 'Hip shift', options: [ { value: 'no-shift', label: 'No shift' }, { value: 'shift-left', label: 'Shifts left' }, { value: 'shift-right', label: 'Shifts right' }, { value: 'shift-unstable', label: 'Unstable' } ] },
        { kind: 'select', key: 'overheadSquatDepth', label: 'Depth', options: [ { value: 'full-depth', label: 'Full depth' }, { value: 'mid-range', label: 'Mid range' }, { value: 'shallow', label: 'Shallow' } ] },
        { kind: 'select', key: 'overheadSquatFootHeel', label: 'Foot/heel', options: [ { value: 'heels-down', label: 'Heels down' }, { value: 'heels-lift', label: 'Heels lift' }, { value: 'feet-roll-in', label: 'Feet roll in' }, { value: 'feet-roll-out', label: 'Feet roll out' } ] },
      ],
    },
    // 5) Movement: Lunge (own screen)
    {
      sectionTitle: 'Movement',
      cardTitle: 'Lunge',
      fields: [
        { kind: 'select', key: 'lungeHasPain', label: 'Pain/Discomfort?', options: [ { value: 'no', label: 'No pain' }, { value: 'yes', label: 'Yes - Pain reported' } ] },
        { kind: 'select', key: 'lungeLeftKneeAlignment', label: 'Left: Knee', options: [ { value: 'tracks-center', label: 'Tracks center' }, { value: 'caves-inward', label: 'Caves inward' }, { value: 'pushes-out', label: 'Pushes out' }, { value: 'wobbles', label: 'Wobbles' } ] },
        { kind: 'select', key: 'lungeRightKneeAlignment', label: 'Right: Knee', options: [ { value: 'tracks-center', label: 'Tracks center' }, { value: 'caves-inward', label: 'Caves inward' }, { value: 'pushes-out', label: 'Pushes out' }, { value: 'wobbles', label: 'Wobbles' } ] },
      ],
    },
    // 6) Movement: Overhead Reach (own screen)
    {
      sectionTitle: 'Movement',
      cardTitle: 'Overhead Reach',
      fields: [
        { kind: 'select', key: 'overheadReachResult', label: 'Result', options: [ { value: 'full-range', label: 'Full range' }, { value: 'limited-range', label: 'Limited range' }, { value: 'limited-with-arch', label: 'Limited with low-back arch' }, { value: 'pain-reported', label: 'Pain reported' } ] },
        { kind: 'select', key: 'shoulderMobilityRating', label: 'Shoulder mobility', options: [ { value: 'good', label: 'Good' }, { value: 'ok', label: 'OK' }, { value: 'poor', label: 'Poor' } ] },
      ],
    },
    // 7) Movement: Hinge (own screen)
    {
      sectionTitle: 'Movement',
      cardTitle: 'Hinge',
      fields: [
        { kind: 'select', key: 'hingeHasPain', label: 'Pain/Discomfort?', options: [ { value: 'no', label: 'No pain' }, { value: 'yes', label: 'Yes - Pain reported' } ] },
        { kind: 'select', key: 'hingeQuality', label: 'Hinge quality', options: [ { value: 'good', label: 'Good' }, { value: 'compensation', label: 'Compensations' }, { value: 'poor', label: 'Poor' } ] },
        { kind: 'select', key: 'hingeBalance', label: 'Hinge balance', options: [ { value: 'stable', label: 'Stable' }, { value: 'slight-wobble', label: 'Slight wobble' }, { value: 'unstable', label: 'Unstable' } ] },
      ],
    },
    // 8) Muscular Endurance grouped
    {
      sectionTitle: 'Muscular Endurance',
      cardTitle: 'Upper / Lower Endurance',
      fields: [
        { kind: 'number', key: 'pushupReps', label: 'Push-ups in 1 minute', placeholder: 'e.g., 25' },
        { kind: 'number', key: 'bwSquats1Min', label: 'Bodyweight squats in 1 minute', placeholder: 'e.g., 35' },
      ],
    },
    // 9) Core strength & stability grouped
    {
      sectionTitle: 'Core Strength & Stability',
      cardTitle: 'Core Tests',
      fields: [
        { kind: 'number', key: 'plankHold', label: 'Plank hold (sec)', placeholder: 'e.g., 60' },
        { kind: 'number', key: 'windshieldWipersReps', label: 'Windshield wipers (reps)', placeholder: 'e.g., 12' },
      ],
    },
    // 10) Grip strength & Sit-and-Reach grouped
    {
      sectionTitle: 'Grip & Flexibility',
      cardTitle: 'Grip Strength & Sit-and-Reach',
      fields: [
        { kind: 'select', key: 'sitAndReachCategory', label: 'Sit-and-reach', options: [ { value: 'poor', label: "Can't reach toes" }, { value: 'average', label: 'Can reach toes' }, { value: 'good', label: 'Reach past toes' } ] },
        { kind: 'number', key: 'gripLeftKg', label: 'Grip left (kg)', placeholder: 'e.g., 28.5' },
        { kind: 'number', key: 'gripRightKg', label: 'Grip right (kg)', placeholder: 'e.g., 32.0' },
      ],
    },
    // 11) Fitness one screen
    {
      sectionTitle: 'Fitness',
      cardTitle: 'Cardio Test',
      fields: [
        { kind: 'select', key: 'cardioTestType', label: 'Test type', options: [ { value: 'step-test', label: 'Step Test (3 min)' }, { value: 'treadmill-3min', label: 'Treadmill (3 min)' } ] },
        { kind: 'number', key: 'stepTestImmediateHr', label: 'Step Test – Immediate HR (bpm)', placeholder: 'e.g., 140' },
        { kind: 'number', key: 'stepTestRecoveryIntervalSec', label: 'Step Test – Recovery Interval (sec)', placeholder: '60' },
        { kind: 'number', key: 'stepTestRecoveryHr', label: 'Step Test – Recovery HR (bpm)', placeholder: 'e.g., 110' },
        { kind: 'number', key: 'treadmillSpeed', label: 'Treadmill – Speed', placeholder: 'e.g., 5.0' },
        { kind: 'select', key: 'treadmillSpeedUnit', label: 'Speed unit', options: [ { value: 'mph', label: 'mph' }, { value: 'kmh', label: 'km/h' } ] },
        { kind: 'number', key: 'treadmillImmediateHr', label: 'Treadmill – Immediate HR (bpm)', placeholder: 'e.g., 150' },
        { kind: 'number', key: 'treadmillRecoveryHr', label: 'Treadmill – 1-min Recovery HR (bpm)', placeholder: 'e.g., 120' },
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


