import { useMemo, useState, useCallback, useEffect } from 'react';
import { useFormContext } from '@/contexts/FormContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type FieldDef = {
  key?: keyof import('@/contexts/FormContext').FormData;
  label: string;
  type: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'boolean' | 'posture';
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
    { key: 'age', label: 'Age', type: 'number', placeholder: 'Enter age', required: true },
    { key: 'gender', label: 'Gender', type: 'select', options: [ { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' } ], required: true },
    { key: 'assignedCoach', label: 'Assigned Coach', type: 'select', options: [ { value: 'Coach Mike', label: 'Coach Mike' }, { value: 'Coach Selina', label: 'Coach Selina' } ], required: true },
    { key: 'contactEmail', label: 'Contact Email', type: 'email', placeholder: 'email@example.com', required: true },
    // Body Composition
    { key: 'height', label: 'Height (cm)', type: 'number', placeholder: '170', required: true },
    { key: 'weight', label: 'Weight (kg)', type: 'number', placeholder: '70', required: true },
    { key: 'bodyFat', label: 'Body Fat %', type: 'number', placeholder: '20.5', required: true },
    { key: 'skeletalMuscleMass', label: 'Skeletal Muscle Mass (kg)', type: 'number', placeholder: '30', required: true },
    { key: 'visceralFat', label: 'Visceral Fat Rating', type: 'number', placeholder: '10' },
    // removed coach notes from flow for minimalism
    // Posture
    { label: 'Posture Assessment', type: 'posture' },
    // Overhead Squat
    { key: 'ohsHasPain', label: 'Overhead Squat – Pain/Discomfort?', type: 'select', options: [ { value: 'no', label: 'No pain' }, { value: 'yes', label: 'Yes - Pain reported' } ] },
    { key: 'overheadSquatKneeAlignment', label: 'Overhead Squat – Knee Alignment', type: 'select', options: [ { value: 'no-issue', label: 'No issue' }, { value: 'mild-cave', label: 'Mild cave-in' }, { value: 'severe-cave', label: 'Severe cave-in' }, { value: 'knees-out', label: 'Knees push out' } ] },
    { key: 'overheadSquatTorsoLean', label: 'Overhead Squat – Torso Lean', type: 'select', options: [ { value: 'upright', label: 'Upright' }, { value: 'mild-lean', label: 'Mild forward lean' }, { value: 'excessive-lean', label: 'Excessive forward lean' } ] },
    { key: 'overheadSquatHipShift', label: 'Overhead Squat – Hip Shift', type: 'select', options: [ { value: 'no-shift', label: 'No shift' }, { value: 'shift-left', label: 'Shifts left' }, { value: 'shift-right', label: 'Shifts right' }, { value: 'shift-unstable', label: 'Unstable' } ] },
    { key: 'overheadSquatDepth', label: 'Overhead Squat – Depth', type: 'select', options: [ { value: 'full-depth', label: 'Full depth' }, { value: 'mid-range', label: 'Mid range' }, { value: 'shallow', label: 'Shallow' } ] },
    { key: 'overheadSquatFootHeel', label: 'Overhead Squat – Foot/Heel', type: 'select', options: [ { value: 'heels-down', label: 'Heels down' }, { value: 'heels-lift', label: 'Heels lift' }, { value: 'feet-roll-in', label: 'Feet roll in' }, { value: 'feet-roll-out', label: 'Feet roll out' } ] },
    // notes removed
    // Lunge left/right
    { key: 'lungeHasPain', label: 'Lunge – Pain/Discomfort?', type: 'select', options: [ { value: 'no', label: 'No pain' }, { value: 'yes', label: 'Yes - Pain reported' } ] },
    { key: 'lungeLeftKneeAlignment', label: 'Lunge – Left Front Knee Alignment', type: 'select', options: [ { value: 'tracks-center', label: 'Tracks center' }, { value: 'caves-inward', label: 'Caves inward' }, { value: 'pushes-out', label: 'Pushes out' }, { value: 'wobbles', label: 'Wobbles' } ] },
    { key: 'lungeLeftBalance', label: 'Lunge – Left Balance', type: 'select', options: [ { value: 'stable', label: 'Stable' }, { value: 'slight-wobble', label: 'Slight wobble' }, { value: 'unstable', label: 'Unstable' } ] },
    { key: 'lungeLeftTorso', label: 'Lunge – Left Torso', type: 'select', options: [ { value: 'upright', label: 'Upright' }, { value: 'mild-lean', label: 'Mild lean' }, { value: 'excessive-lean', label: 'Excessive lean' } ] },
    { key: 'lungeRightKneeAlignment', label: 'Lunge – Right Front Knee Alignment', type: 'select', options: [ { value: 'tracks-center', label: 'Tracks center' }, { value: 'caves-inward', label: 'Caves inward' }, { value: 'pushes-out', label: 'Pushes out' }, { value: 'wobbles', label: 'Wobbles' } ] },
    { key: 'lungeRightBalance', label: 'Lunge – Right Balance', type: 'select', options: [ { value: 'stable', label: 'Stable' }, { value: 'slight-wobble', label: 'Slight wobble' }, { value: 'unstable', label: 'Unstable' } ] },
    { key: 'lungeRightTorso', label: 'Lunge – Right Torso', type: 'select', options: [ { value: 'upright', label: 'Upright' }, { value: 'mild-lean', label: 'Mild lean' }, { value: 'excessive-lean', label: 'Excessive lean' } ] },
    // notes removed
    // Overhead reach / shoulder
    { key: 'overheadReachResult', label: 'Overhead Reach Result', type: 'select', options: [ { value: 'full-range', label: 'Full range' }, { value: 'limited-range', label: 'Limited range' }, { value: 'limited-with-arch', label: 'Limited with low-back arch' }, { value: 'pain-reported', label: 'Pain reported' } ] },
    { key: 'shoulderMobilityRating', label: 'Shoulder Mobility Rating', type: 'select', options: [ { value: 'good', label: 'Good' }, { value: 'ok', label: 'OK' }, { value: 'poor', label: 'Poor' } ] },
    // notes removed
    // Hinge
    { key: 'hingeHasPain', label: 'Hip Hinge – Pain/Discomfort?', type: 'select', options: [ { value: 'no', label: 'No pain' }, { value: 'yes', label: 'Yes - Pain reported' } ] },
    { key: 'hingeQuality', label: 'Hip Hinge – Quality', type: 'select', options: [ { value: 'good', label: 'Good' }, { value: 'compensation', label: 'Compensations' }, { value: 'poor', label: 'Poor' } ] },
    { key: 'hingeBalance', label: 'Hip Hinge – Balance', type: 'select', options: [ { value: 'stable', label: 'Stable' }, { value: 'slight-wobble', label: 'Slight wobble' }, { value: 'unstable', label: 'Unstable' } ] },
    // notes removed
    // Muscular Strength
    { key: 'pushupReps', label: 'Push-ups in 1 minute', type: 'number', placeholder: 'e.g., 25', required: true },
    { key: 'plankHold', label: 'Plank Hold (sec)', type: 'number', placeholder: 'e.g., 60', required: true },
    { key: 'bwSquats1Min', label: 'Bodyweight Squats in 1 minute', type: 'number', placeholder: 'e.g., 35', required: true },
    // notes removed
    // Metabolic Fitness
    { key: 'cardioTestType', label: 'Cardio Test Type', type: 'select', options: [ { value: 'step-test', label: 'Step Test (3 min)' }, { value: 'treadmill-3min', label: 'Treadmill (3 min)' } ] },
    { key: 'stepTestImmediateHr', label: 'Step Test – Immediate HR (bpm)', type: 'number', placeholder: 'e.g., 140' },
    { key: 'stepTestRecoveryIntervalSec', label: 'Step Test – Recovery Interval (sec)', type: 'number', placeholder: '60' },
    { key: 'stepTestRecoveryHr', label: 'Step Test – Recovery HR (bpm)', type: 'number', placeholder: 'e.g., 110' },
    { key: 'treadmillSpeed', label: 'Treadmill – Speed', type: 'number', placeholder: 'e.g., 5.0' },
    { key: 'treadmillSpeedUnit', label: 'Treadmill – Speed Unit', type: 'select', options: [ { value: 'mph', label: 'mph' }, { value: 'kmh', label: 'km/h' } ] },
    { key: 'treadmillImmediateHr', label: 'Treadmill – Immediate HR (bpm)', type: 'number', placeholder: 'e.g., 150' },
    { key: 'treadmillRecoveryHr', label: 'Treadmill – 1-min Recovery HR (bpm)', type: 'number', placeholder: 'e.g., 120' },
    // notes removed
    // Flexibility & grip
    { key: 'sitAndReachCategory', label: 'Sit-and-Reach', type: 'select', options: [ { value: 'poor', label: "Can't reach toes" }, { value: 'average', label: 'Can reach toes' }, { value: 'good', label: 'Reach past toes' } ] },
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
    updateFormData({ [current.key]: value } as any);
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="forwardHeadPosture"
                checked={Boolean((formData as any).forwardHeadPosture)}
                onCheckedChange={(c) => updateFormData({ forwardHeadPosture: Boolean(c) } as any)}
              />
              <Label htmlFor="forwardHeadPosture">Forward head posture</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="roundedShoulders"
                checked={Boolean((formData as any).roundedShoulders)}
                onCheckedChange={(c) => updateFormData({ roundedShoulders: Boolean(c) } as any)}
              />
              <Label htmlFor="roundedShoulders">Rounded shoulders</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="anteriorPelvicTilt"
                checked={Boolean((formData as any).anteriorPelvicTilt)}
                onCheckedChange={(c) => updateFormData({ anteriorPelvicTilt: Boolean(c) } as any)}
              />
              <Label htmlFor="anteriorPelvicTilt">Anterior pelvic tilt</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="kyphosisLordosis"
                checked={Boolean((formData as any).kyphosisLordosis)}
                onCheckedChange={(c) => updateFormData({ kyphosisLordosis: Boolean(c) } as any)}
              />
              <Label htmlFor="kyphosisLordosis">Kyphosis/Lordosis</Label>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kneeAlignment">Knee alignment</Label>
              <Select value={(formData as any).kneeAlignment || ''} onValueChange={(v) => updateFormData({ kneeAlignment: v } as any)}>
                <SelectTrigger id="kneeAlignment" className="mt-1 h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="valgus">Valgus</SelectItem>
                  <SelectItem value="varus">Varus</SelectItem>
                  <SelectItem value="hyperextension">Hyperextension</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="footPosition">Foot position</Label>
              <Select value={(formData as any).footPosition || ''} onValueChange={(v) => updateFormData({ footPosition: v } as any)}>
                <SelectTrigger id="footPosition" className="mt-1 h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="overpronation">Overpronation</SelectItem>
                  <SelectItem value="underpronation">Underpronation (Supination)</SelectItem>
                  <SelectItem value="flat-feet">Flat Feet</SelectItem>
                  <SelectItem value="high-arch">High Arch</SelectItem>
                </SelectContent>
              </Select>
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


