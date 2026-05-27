import { Button } from '@/components/ui/button';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import { Loader2 } from 'lucide-react';

export interface RemoteIntakeWelcomeProps {
  onStart: () => void;
  loading?: boolean;
}

/** First screen of the client remote intake — CTA pinned above the browser chrome. */
export function RemoteIntakeWelcome({ onStart, loading = false }: RemoteIntakeWelcomeProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {ASSESSMENT_COPY.REMOTE_INTAKE_WELCOME_EYEBROW}
            </p>
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground">
              {ASSESSMENT_COPY.REMOTE_INTAKE_WELCOME_TITLE}
            </h1>
            <p className="text-lg font-medium leading-snug text-foreground">
              {ASSESSMENT_COPY.REMOTE_INTAKE_WELCOME_SUBTITLE}
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              {ASSESSMENT_COPY.REMOTE_INTAKE_WELCOME_INCLUDES_HEADING}
            </h2>
            <ul className="space-y-3">
              {ASSESSMENT_COPY.REMOTE_INTAKE_WELCOME_INCLUDES.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-base font-semibold leading-snug text-foreground">
                      {item.title}
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {ASSESSMENT_COPY.REMOTE_INTAKE_WELCOME_WHY}
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-md">
          <Button
            type="button"
            className="h-14 w-full rounded-2xl text-base font-semibold"
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
        </div>
      </div>
    </div>
  );
}
