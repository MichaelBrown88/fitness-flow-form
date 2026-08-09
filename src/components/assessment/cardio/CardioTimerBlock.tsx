import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Timer } from 'lucide-react';
import { CARDIO_RUN_SHEET_COPY as COPY } from '@/constants/phaseFormCopy';
import { formatCountdown, type CountdownState } from './useCountdown';

interface CardioTimerBlockProps {
  countdown: CountdownState;
  startLabel: string;
  runningHint: string;
  doneHint: string;
}

/** Timer row for the cardio run sheet: big countdown + start/reset controls. */
export function CardioTimerBlock({ countdown, startLabel, runningHint, doneHint }: CardioTimerBlockProps) {
  const { secondsLeft, running, finished, start, reset } = countdown;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-3xl font-bold tabular-nums ${
          running
            ? 'border-primary/40 bg-primary/5 text-foreground'
            : finished
              ? 'border-score-green-muted bg-score-green-light text-score-green-fg'
              : 'border-border bg-muted/40 text-foreground-secondary'
        }`}
        role="timer"
        aria-live="polite"
      >
        <Timer className="h-5 w-5 opacity-60" aria-hidden />
        {formatCountdown(secondsLeft)}
      </div>

      {!running ? (
        <Button type="button" onClick={start} className="h-11 gap-2 rounded-lg px-5 font-bold">
          <Play className="h-4 w-4" />
          {startLabel}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={reset}
          className="h-11 gap-2 rounded-lg px-4 font-bold text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          {COPY.RESET_TIMER}
        </Button>
      )}

      {running ? (
        <p className="text-sm font-medium text-muted-foreground">{runningHint}</p>
      ) : finished ? (
        <p className="text-sm font-semibold text-score-green-fg">{doneHint}</p>
      ) : null}
    </div>
  );
}
