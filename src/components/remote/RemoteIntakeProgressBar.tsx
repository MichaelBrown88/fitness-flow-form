export interface RemoteIntakeProgressBarProps {
  progress: number;
}

/** Thin progress strip for remote pre-assessment (welcome + wizard). */
export function RemoteIntakeProgressBar({ progress }: RemoteIntakeProgressBarProps) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  return (
    <div className="shrink-0 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
      <div className="mx-auto w-full max-w-md">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </div>
  );
}
