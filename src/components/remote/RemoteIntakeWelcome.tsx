import { Button } from '@/components/ui/button';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import { RemoteIntakeBrand } from '@/components/remote/RemoteIntakeBrand';
import { Loader2 } from 'lucide-react';

export interface RemoteIntakeWelcomeProps {
  onStart: () => void;
  loading?: boolean;
}

/** First screen — brand at top, centred copy, single-row footer CTA. */
export function RemoteIntakeWelcome({ onStart, loading = false }: RemoteIntakeWelcomeProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col justify-center px-4 pb-4">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8">
          <RemoteIntakeBrand />
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {ASSESSMENT_COPY.REMOTE_INTAKE_WELCOME_EYEBROW}
            </p>
            <p className="text-2xl font-bold leading-snug tracking-tight text-foreground">
              {ASSESSMENT_COPY.REMOTE_INTAKE_WELCOME_LINE_1}
            </p>
            <p className="mx-auto max-w-[30ch] text-sm leading-snug text-muted-foreground">
              {ASSESSMENT_COPY.REMOTE_INTAKE_WELCOME_LINE_2}
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-1.5">
          <Button
            type="button"
            className="h-11 w-full rounded-xl text-base font-semibold"
            disabled={loading}
            onClick={onStart}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Please wait…
              </>
            ) : (
              ASSESSMENT_COPY.REMOTE_INTAKE_START
            )}
          </Button>
          <p className="text-xs text-muted-foreground">{ASSESSMENT_COPY.REMOTE_INTAKE_DURATION_HINT}</p>
        </div>
      </div>
    </div>
  );
}
