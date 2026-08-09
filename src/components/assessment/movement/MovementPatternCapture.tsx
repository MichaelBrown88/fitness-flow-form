import { useMemo, useState } from 'react';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';

export type MovementPatternSectionId = 'overhead-squat' | 'hinge-assessment' | 'lunge-assessment';

interface MovementPatternCaptureProps {
  sectionId: MovementPatternSectionId;
  sectionTitle: string;
  onComplete: () => void;
  onBack?: () => void;
}

type PartialForm = Partial<FormData>;

interface IssueChip {
  id: string;
  label: string;
  patch: PartialForm;
}

const OHS_BENIGN: PartialForm = {
  ohsShoulderMobility: 'full-range',
  ohsTorsoLean: 'upright',
  ohsSquatDepth: 'full-depth',
  ohsHipShift: 'none',
  ohsKneeAlignment: 'stable',
  ohsFeetPosition: 'stable',
  ohsHasPain: 'no',
};

const OHS_CHIPS: IssueChip[] = [
  { id: 'depth', label: 'Limited squat depth', patch: { ohsSquatDepth: 'quarter-depth' } },
  { id: 'knees', label: 'Knees cave inward', patch: { ohsKneeAlignment: 'valgus' } },
  { id: 'lean', label: 'Leans forward', patch: { ohsTorsoLean: 'moderate-lean' } },
  { id: 'shoulders', label: 'Shoulders struggle overhead', patch: { ohsShoulderMobility: 'limited' } },
  { id: 'feet', label: 'Feet roll inward', patch: { ohsFeetPosition: 'pronation' } },
  { id: 'shift', label: 'Shifts to one side', patch: { ohsHipShift: 'left' } },
];

const HINGE_BENIGN: PartialForm = {
  hingeDepth: 'good',
  hingeBackRounding: 'none',
  hingeHasPain: 'no',
};

const HINGE_CHIPS: IssueChip[] = [
  { id: 'depth', label: 'Limited hinge depth', patch: { hingeDepth: 'fair' } },
  { id: 'rounding', label: 'Rounding through the back', patch: { hingeBackRounding: 'moderate' } },
];

const LUNGE_BENIGN: PartialForm = {
  lungeLeftBalance: 'good',
  lungeRightBalance: 'good',
  lungeLeftKneeAlignment: 'tracks-straight',
  lungeRightKneeAlignment: 'tracks-straight',
  lungeLeftTorso: 'neutral',
  lungeRightTorso: 'neutral',
  lungeHasPain: 'no',
};

const LUNGE_CHIPS: IssueChip[] = [
  { id: 'balance-l', label: 'Left side — balance issues', patch: { lungeLeftBalance: 'fair' } },
  { id: 'balance-r', label: 'Right side — balance issues', patch: { lungeRightBalance: 'fair' } },
  { id: 'knee-l', label: 'Left knee caves in', patch: { lungeLeftKneeAlignment: 'caves-inward' } },
  { id: 'knee-r', label: 'Right knee caves in', patch: { lungeRightKneeAlignment: 'caves-inward' } },
  { id: 'torso-l', label: 'Left side — torso shifts', patch: { lungeLeftTorso: 'shifts-left' } },
  { id: 'torso-r', label: 'Right side — torso shifts', patch: { lungeRightTorso: 'shifts-right' } },
];

function configForSection(sectionId: MovementPatternSectionId): {
  benign: PartialForm;
  chips: IssueChip[];
  painField: keyof FormData;
  painOptions: readonly { value: string; label: string }[];
} {
  if (sectionId === 'hinge-assessment') {
    return {
      benign: HINGE_BENIGN,
      chips: HINGE_CHIPS,
      painField: 'hingeHasPain',
      painOptions: ASSESSMENT_OPTIONS.hingeHasPain,
    };
  }
  if (sectionId === 'lunge-assessment') {
    return {
      benign: LUNGE_BENIGN,
      chips: LUNGE_CHIPS,
      painField: 'lungeHasPain',
      painOptions: ASSESSMENT_OPTIONS.lungeHasPain,
    };
  }
  return {
    benign: OHS_BENIGN,
    chips: OHS_CHIPS,
    painField: 'ohsHasPain',
    painOptions: ASSESSMENT_OPTIONS.ohsHasPain,
  };
}

function mergePatches(base: PartialForm, chips: IssueChip[], selected: Set<string>): PartialForm {
  const out = { ...base };
  for (const chip of chips) {
    if (selected.has(chip.id)) {
      Object.assign(out, chip.patch);
    }
  }
  return out;
}

export function MovementPatternCapture({
  sectionId,
  sectionTitle,
  onComplete,
  onBack,
}: MovementPatternCaptureProps) {
  const { formData, updateFormData } = useFormContext();
  const { benign, chips, painField, painOptions } = useMemo(
    () => configForSection(sectionId),
    [sectionId],
  );

  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(() => new Set());
  const [markedGood, setMarkedGood] = useState(false);

  const canContinue = markedGood || selectedIssues.size > 0;

  const toggleIssue = (id: string) => {
    setMarkedGood(false);
    setSelectedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLooksGood = () => {
    setMarkedGood(true);
    setSelectedIssues(new Set());
    updateFormData({ ...benign });
    onComplete();
  };

  const handleContinue = () => {
    const patch = mergePatches(benign, chips, selectedIssues);
    updateFormData(patch);
    onComplete();
  };

  const setPain = (value: string) => {
    updateFormData({ [painField]: value === 'no' ? 'no' : 'yes' } as PartialForm);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-background rounded-3xl border border-primary/5 p-8 shadow-xl shadow-primary/10 lg:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          Movement pattern
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{sectionTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Watch the client move once, then tap what you saw — or mark it as looking good.
        </p>

        <div className="mt-8">
          <Button
            type="button"
            className="h-12 w-full rounded-2xl text-base font-semibold"
            onClick={handleLooksGood}
          >
            Looks good
          </Button>
        </div>

        <div className="mt-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Or note what you saw
          </p>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => {
              const active = selectedIssues.has(chip.id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => toggleIssue(chip.id)}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/40 text-foreground-secondary hover:bg-muted'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 space-y-3 border-t border-border/60 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pain during this pattern?
          </p>
          <div className="flex flex-wrap gap-2">
            {painOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPain(opt.value)}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  formData[painField] === opt.value
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-muted/40 text-foreground-secondary hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-8">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={!onBack}
            className="h-12 px-6 rounded-lg font-bold text-muted-foreground"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="h-12 rounded-lg px-8 font-bold"
          >
            Section complete
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
