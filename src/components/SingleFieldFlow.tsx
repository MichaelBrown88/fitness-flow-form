import { useMemo, useState, useCallback, useEffect } from 'react';
import { useFormContext } from '@/contexts/FormContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Check } from 'lucide-react';

type FieldDef = {
  key?: keyof import('@/contexts/FormContext').FormData;
  label: string;
  type: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'boolean' | 'posture' | 'multiselect';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
};

export default function SingleFieldFlow({ onSubmit }: { onSubmit: () => void }) {
  const { formData, updateFormData } = useFormContext();
  const [index, setIndex] = useState(0);

  const fields: FieldDef[] = useMemo(() => [
    // Identity
    { key: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Enter full name', required: true },
    { key: 'dateOfBirth', label: 'Date of Birth', type: 'text', placeholder: 'YYYY-MM-DD', required: true },
    { key: 'gender', label: 'Gender', type: 'select', options: [ { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' } ], required: true },
    { key: 'assignedCoach', label: 'Assigned Coach', type: 'select', options: [ { value: 'coach-mike', label: 'Coach Mike' }, { value: 'coach-selina', label: 'Coach Selina' } ], required: true },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'email@example.com', required: true },
    // Body Composition
    { key: 'heightCm', label: 'Height (cm)', type: 'number', placeholder: '170', required: true },
    { key: 'inbodyWeightKg', label: 'Weight (kg)', type: 'number', placeholder: '70', required: true },
    { key: 'inbodyBodyFatPct', label: 'Body Fat %', type: 'number', placeholder: '20.5', required: true },
    { key: 'skeletalMuscleMassKg', label: 'Skeletal Muscle Mass (kg)', type: 'number', placeholder: '30', required: true },
    { key: 'visceralFatLevel', label: 'Visceral Fat Rating', type: 'number', placeholder: '10' },
    // Posture
    { label: 'Posture Assessment', type: 'posture' },
    // Overhead Squat
    { key: 'ohsKneeAlignment', label: 'Overhead Squat – Knee Alignment', type: 'select', options: [ { value: 'no-issue', label: 'No issue' }, { value: 'mild-cave', label: 'Mild cave-in' }, { value: 'severe-cave', label: 'Severe cave-in' }, { value: 'knees-out', label: 'Knees push out' } ] },
    { key: 'ohsTorsoLean', label: 'Overhead Squat – Torso Lean', type: 'select', options: [ { value: 'upright', label: 'Upright' }, { value: 'mild-lean', label: 'Mild forward lean' }, { value: 'excessive-lean', label: 'Excessive forward lean' } ] },
    { key: 'ohsHipShift', label: 'Overhead Squat – Hip Shift', type: 'select', options: [ { value: 'no-shift', label: 'No shift' }, { value: 'shift-left', label: 'Shifts left' }, { value: 'shift-right', label: 'Shifts right' }, { value: 'shift-unstable', label: 'Unstable' } ] },
    { key: 'ohsSquatDepth', label: 'Overhead Squat – Depth', type: 'select', options: [ { value: 'full-depth', label: 'Full depth' }, { value: 'mid-range', label: 'Mid range' }, { value: 'shallow', label: 'Shallow' } ] },
    { key: 'ohsHeelBehavior', label: 'Overhead Squat – Heel Behavior', type: 'select', options: [ { value: 'heels-down', label: 'Heels down' }, { value: 'heels-lift', label: 'Heels lift' }, { value: 'feet-roll-in', label: 'Feet roll in' }, { value: 'feet-roll-out', label: 'Feet roll out' } ] },
    { key: 'ohsHasPain', label: 'Overhead Squat – Pain/Discomfort?', type: 'select', options: [ { value: 'no', label: 'No pain' }, { value: 'yes', label: 'Yes - Pain reported' } ] },
    { key: 'ohsPainLevel', label: 'Overhead Squat – Pain Level (1-10)', type: 'select', options: [ { value: '1', label: '1 - Very Mild' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4 - Moderate' }, { value: '5', label: '5' }, { value: '6', label: '6' }, { value: '7', label: '7 - Severe' }, { value: '8', label: '8' }, { value: '9', label: '9' }, { value: '10', label: '10 - Unbearable' } ] },
    // Lunge left/right
    { key: 'lungeLeftKneeAlignment', label: 'Lunge – Left Front Knee Alignment', type: 'select', options: [ { value: 'tracks-center', label: 'Tracks center' }, { value: 'caves-inward', label: 'Caves inward' }, { value: 'pushes-out', label: 'Pushes out' }, { value: 'wobbles', label: 'Wobbles' } ] },
    { key: 'lungeLeftBalance', label: 'Lunge – Left Balance', type: 'select', options: [ { value: 'stable', label: 'Stable' }, { value: 'slight-wobble', label: 'Slight wobble' }, { value: 'unstable', label: 'Unstable' } ] },
    { key: 'lungeLeftTorso', label: 'Lunge – Left Torso', type: 'select', options: [ { value: 'upright', label: 'Upright' }, { value: 'mild-lean', label: 'Mild lean' }, { value: 'excessive-lean', label: 'Excessive lean' } ] },
    { key: 'lungeRightKneeAlignment', label: 'Lunge – Right Front Knee Alignment', type: 'select', options: [ { value: 'tracks-center', label: 'Tracks center' }, { value: 'caves-inward', label: 'Caves inward' }, { value: 'pushes-out', label: 'Pushes out' }, { value: 'wobbles', label: 'Wobbles' } ] },
    { key: 'lungeRightBalance', label: 'Lunge – Right Balance', type: 'select', options: [ { value: 'stable', label: 'Stable' }, { value: 'slight-wobble', label: 'Slight wobble' }, { value: 'unstable', label: 'Unstable' } ] },
    { key: 'lungeRightTorso', label: 'Lunge – Right Torso', type: 'select', options: [ { value: 'upright', label: 'Upright' }, { value: 'mild-lean', label: 'Mild lean' }, { value: 'excessive-lean', label: 'Excessive lean' } ] },
    { key: 'lungeHasPain', label: 'Lunge – Pain/Discomfort?', type: 'select', options: [ { value: 'no', label: 'No pain' }, { value: 'yes', label: 'Yes - Pain reported' } ] },
    { key: 'lungePainLevel', label: 'Lunge – Pain Level (1-10)', type: 'select', options: [ { value: '1', label: '1 - Very Mild' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4 - Moderate' }, { value: '5', label: '5' }, { value: '6', label: '6' }, { value: '7', label: '7 - Severe' }, { value: '8', label: '8' }, { value: '9', label: '9' }, { value: '10', label: '10 - Unbearable' } ] },
    // Overhead reach / shoulder
    { key: 'ohsShoulderMobility', label: 'Overhead Reach Result', type: 'select', options: [ { value: 'full-range', label: 'Full range' }, { value: 'compensated', label: 'Compensated' }, { value: 'limited', label: 'Limited' } ] },
    { key: 'mobilityShoulder', label: 'Shoulder Mobility Rating', type: 'select', options: [ { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' } ] },
    // Hinge
    { key: 'hingeQuality', label: 'Hip Hinge – Quality', type: 'select', options: [ { value: 'good', label: 'Good' }, { value: 'compensation', label: 'Compensations' }, { value: 'poor', label: 'Poor' } ] },
    { key: 'hingeBalance', label: 'Hip Hinge – Balance', type: 'select', options: [ { value: 'stable', label: 'Stable' }, { value: 'slight-wobble', label: 'Slight wobble' }, { value: 'unstable', label: 'Unstable' } ] },
    { key: 'hingeHasPain', label: 'Hip Hinge – Pain/Discomfort?', type: 'select', options: [ { value: 'no', label: 'No pain' }, { value: 'yes', label: 'Yes - Pain reported' } ] },
    { key: 'hingePainLevel', label: 'Hip Hinge – Pain Level (1-10)', type: 'select', options: [ { value: '1', label: '1 - Very Mild' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4 - Moderate' }, { value: '5', label: '5' }, { value: '6', label: '6' }, { value: '7', label: '7 - Severe' }, { value: '8', label: '8' }, { value: '9', label: '9' }, { value: '10', label: '10 - Unbearable' } ] },
    // Muscular Strength
    { key: 'pushupsOneMinuteReps', label: 'Push-ups in 1 minute', type: 'number', placeholder: 'e.g., 25', required: true },
    { key: 'plankDurationSeconds', label: 'Plank Hold (sec)', type: 'number', placeholder: 'e.g., 60', required: true },
    { key: 'squatsOneMinuteReps', label: 'Bodyweight Squats in 1 minute', type: 'number', placeholder: 'e.g., 35', required: true },
    // Metabolic Fitness
    { key: 'cardioTestSelected', label: 'Cardio Test Type', type: 'select', options: [ { value: 'ymca-step', label: 'Step Test (3 min)' }, { value: 'treadmill', label: 'Treadmill (3 min)' } ] },
    { key: 'cardioRestingHr', label: 'Resting Heart Rate (bpm)', type: 'number', placeholder: 'e.g., 65' },
    { key: 'cardioPost1MinHr', label: '1-min Post-Test HR (bpm)', type: 'number', placeholder: 'e.g., 110' },
    // Flexibility & grip
    { key: 'gripLeftKg', label: 'Grip Strength – Left (kg)', type: 'number', placeholder: 'e.g., 28.5' },
    { key: 'gripRightKg', label: 'Grip Strength – Right (kg)', type: 'number', placeholder: 'e.g., 32.0' },
  ], []);

  const total = fields.length;
  const current = fields[index];

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(total - 1, i + 1));
  }, [total]);
  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    // Autofocus whenever the field changes (skip posture group)
    if (current?.type === 'posture') return;
    const el = document.getElementById('single-field-input') as HTMLInputElement | HTMLTextAreaElement | null;
    if (el) el.focus();
  }, [current?.key, current?.type]);

  const handleSet = (value: string | boolean) => {
    if (current.key) {
      updateFormData({ [current.key]: value } as any);
    }
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === total - 1) onSubmit(); else goNext();
    }
  };

  const renderField = () => {
    if (current.type === 'posture') {
      return (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Head and neck alignment</Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: 'neutral', label: 'Neutral' },
                  { value: 'forward-head', label: 'Forward Head' },
                  { value: 'tilted', label: 'Head Tilt' }
                ].map(opt => {
                  const selected = formData.postureHeadOverall || [];
                  const active = selected.includes(opt.value);
                  return (
                    <Button
                      key={opt.value}
                      variant={active ? 'default' : 'outline'}
                      className="justify-start gap-3"
                      onClick={() => {
                        const next = active ? selected.filter(v => v !== opt.value) : [...selected, opt.value];
                        updateFormData({ postureHeadOverall: next });
                      }}
                    >
                      <div className={`h-4 w-4 rounded border ${active ? 'bg-white border-white' : 'border-slate-300'}`}>
                        {active && <Check className="h-3 w-3 text-slate-900" />}
                      </div>
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Shoulder and upper back</Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: 'neutral', label: 'Neutral' },
                  { value: 'rounded', label: 'Rounded Shoulders' },
                  { value: 'elevated', label: 'One Shoulder Elevated' },
                  { value: 'winged-scapula', label: 'Scapula Winging' }
                ].map(opt => {
                  const selected = formData.postureShouldersOverall || [];
                  const active = selected.includes(opt.value);
                  return (
                    <Button
                      key={opt.value}
                      variant={active ? 'default' : 'outline'}
                      className="justify-start gap-3"
                      onClick={() => {
                        const next = active ? selected.filter(v => v !== opt.value) : [...selected, opt.value];
                        updateFormData({ postureShouldersOverall: next });
                      }}
                    >
                      <div className={`h-4 w-4 rounded border ${active ? 'bg-white border-white' : 'border-slate-300'}`}>
                        {active && <Check className="h-3 w-3 text-slate-900" />}
                      </div>
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }
    const value = current.key ? (formData as any)[current.key] ?? '' : '';
    switch (current.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <Input
            id="single-field-input"
            type={current.type === 'number' ? 'number' : current.type}
            value={value}
            onChange={(e) => handleSet(e.target.value)}
            onKeyDown={handleEnter}
            placeholder={current.placeholder}
            className="h-14 text-lg"
          />
        );
      case 'textarea':
        return (
          <Textarea
            id="single-field-input"
            value={value}
            onChange={(e) => handleSet(e.target.value)}
            onKeyDown={handleEnter}
            placeholder={current.placeholder}
            className="min-h-[120px] text-base"
          />
        );
      case 'select':
        return (
          <Select value={value} onValueChange={(v) => { handleSet(v); goNext(); }}>
            <SelectTrigger id="single-field-input" className="h-14 text-lg">
              <SelectValue placeholder={`Select ${current.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {current.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'boolean':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Button variant={value === true ? 'default' : 'secondary'} className="h-14 text-lg" onClick={() => { handleSet(true); goNext(); }}>Yes</Button>
            <Button variant={value === false ? 'default' : 'secondary'} className="h-14 text-lg" onClick={() => { handleSet(false); goNext(); }}>No</Button>
          </div>
        );
      case 'multiselect':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {current.options?.map((opt) => {
              const selected = Array.isArray(value) ? value : [];
              const isSelected = selected.includes(opt.value);
              return (
                <Button
                  key={opt.value}
                  variant={isSelected ? 'default' : 'outline'}
                  className="h-14 justify-start px-6 text-left font-bold transition-all"
                  onClick={() => {
                    const next = isSelected 
                      ? selected.filter(v => v !== opt.value)
                      : [...selected, opt.value];
                    handleSet(next as any);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-white border-white' : 'border-slate-300'}`}>
                      {isSelected && <div className="h-2.5 w-2.5 rounded-sm bg-slate-900" />}
                    </div>
                    {opt.label}
                  </div>
                </Button>
              );
            })}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Progress value={((index + 1) / total) * 100} className="h-2" />
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center">{current.label}</h2>
      </div>
      <div className="mt-2">
        {renderField()}
      </div>
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={goPrev} disabled={index === 0}>Back</Button>
        {index === total - 1 ? (
          <Button onClick={onSubmit}>Finish</Button>
        ) : (
          <Button onClick={goNext}>Next</Button>
        )}
      </div>

    </div>
  );
}
