import { Check, Smartphone, Users } from 'lucide-react';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import { cn } from '@/lib/utils';

export type PostureIntakePlan = 'phone' | 'studio' | null;

export interface PostureIntakeChoiceProps {
  plan: PostureIntakePlan;
  onSelectPhone: () => void;
  onSelectStudio: () => void;
}

export function PostureIntakeChoice({ plan, onSelectPhone, onSelectStudio }: PostureIntakeChoiceProps) {
  const options = [
    {
      id: 'phone' as const,
      label: ASSESSMENT_COPY.REMOTE_INTAKE_POSTURE_OPTION_PHONE,
      hint: ASSESSMENT_COPY.REMOTE_INTAKE_POSTURE_OPTION_PHONE_HINT,
      icon: Smartphone,
    },
    {
      id: 'studio' as const,
      label: ASSESSMENT_COPY.REMOTE_INTAKE_POSTURE_OPTION_STUDIO,
      hint: ASSESSMENT_COPY.REMOTE_INTAKE_POSTURE_OPTION_STUDIO_HINT,
      icon: Users,
    },
  ];

  return (
    <div className="flex w-full max-w-sm flex-col gap-2" role="radiogroup" aria-label="Posture photos">
      {options.map((opt) => {
        const selected = plan === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={opt.id === 'phone' ? onSelectPhone : onSelectStudio}
            className={cn(
              'flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors',
              selected
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-foreground active:bg-muted',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/40',
              )}
              aria-hidden
            >
              {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3.5 w-3.5 opacity-60" />}
            </span>
            <span className="min-w-0 flex-1 space-y-0.5">
              <span className="block text-base font-semibold leading-snug">{opt.label}</span>
              <span className="block text-sm leading-snug text-muted-foreground">{opt.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
