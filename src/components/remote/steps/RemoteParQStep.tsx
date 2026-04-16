import { Check } from 'lucide-react';
import { parqQuestions } from '@/components/ParQQuestionnaire';

interface RemoteParQStepProps {
  value: Record<string, string>;
  onChange: (patch: Record<string, string>) => void;
  gender: string;
}

const PARQ_MEDICAL_IDS = ['parq1','parq2','parq3','parq4','parq5','parq6','parq7'];

export function RemoteParQStep({ value, onChange, gender }: RemoteParQStepProps) {
  const hasFlagged = PARQ_MEDICAL_IDS.some((id) => value[id] === 'yes');

  const visibleQuestions = parqQuestions.filter((q) => {
    if (!q.conditional) return true;
    return gender === q.conditional.showWhen.value;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Answer honestly — your coach reviews these before your session.
      </p>

      {hasFlagged && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Medical clearance required
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
            One or more answers requires medical clearance before physical training. Please consult your doctor before your in-studio session. You can still complete and submit this form — your coach will confirm next steps.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visibleQuestions.map((q) => {
          const answer = value[q.id] ?? '';
          return (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-medium text-foreground leading-snug">{q.question}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ [q.id]: 'no' })}
                  className={`h-10 rounded-lg border-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    answer === 'no'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground active:bg-muted'
                  }`}
                >
                  {answer === 'no' && <Check className="h-3.5 w-3.5 shrink-0" />}
                  No
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ [q.id]: 'yes' })}
                  className={`h-10 rounded-lg border-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    answer === 'yes'
                      ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                      : 'border-border bg-background text-muted-foreground active:bg-muted'
                  }`}
                >
                  {answer === 'yes' && <Check className="h-3.5 w-3.5 shrink-0" />}
                  Yes
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
