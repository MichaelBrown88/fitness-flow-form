import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { CoachAssistantThinkingPhase } from '@/types/coachAssistant';
import { cn } from '@/lib/utils';

interface ThinkingIndicatorProps {
  sessionKey: string;
  steps: readonly string[];
  phase: CoachAssistantThinkingPhase;
}

function LoadingDots() {
  return (
    <span className="inline-flex w-5 shrink-0 items-center justify-start gap-0.5" aria-hidden>
      <span className="h-1 w-1 rounded-full bg-muted-foreground/75 animate-bounce [animation-duration:0.9s]" />
      <span className="h-1 w-1 rounded-full bg-muted-foreground/75 animate-bounce [animation-duration:0.9s] [animation-delay:0.12s]" />
      <span className="h-1 w-1 rounded-full bg-muted-foreground/75 animate-bounce [animation-duration:0.9s] [animation-delay:0.24s]" />
    </span>
  );
}

/**
 * Contextual pipeline of short status lines before the streamed reply appears.
 * Steps reveal in order; the active line shows animated dots until the stream starts.
 */
export function ThinkingIndicator({ sessionKey, steps, phase }: ThinkingIndicatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [sessionKey]);

  useEffect(() => {
    if (steps.length === 0) return;
    const ms = phase === 'fetching' ? 760 : 480;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i < steps.length - 1 ? i + 1 : i));
    }, ms);
    return () => window.clearInterval(id);
  }, [phase, sessionKey, steps]);

  useEffect(() => {
    if (steps.length === 0) return;
    if (phase !== 'generating') return;
    setActiveIndex((prev) => Math.max(prev, Math.min(steps.length - 2, Math.ceil((steps.length - 1) * 0.45))));
  }, [phase, steps]);

  if (steps.length === 0) return null;

  const visible = steps.slice(0, Math.min(activeIndex + 1, steps.length));
  const aria = visible.join('. ');

  return (
    <div
      className={cn('flex justify-start', 'animate-in fade-in duration-200')}
      role="status"
      aria-live="polite"
      aria-label={aria}
    >
      <div
        className={cn(
          'max-w-[min(100%,22rem)] rounded-xl border border-border/45',
          'bg-muted/25 px-3 py-2 shadow-sm',
          'dark:border-border/50 dark:bg-muted/15',
        )}
      >
        <ul className="flex flex-col gap-2">
          {visible.map((label, idx) => {
            const isActive = idx === visible.length - 1;
            return (
              <li key={`${sessionKey}-${idx}`} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                  {isActive ? <LoadingDots /> : <Check className="h-3.5 w-3.5 text-muted-foreground/80" strokeWidth={2.5} />}
                </span>
                <span
                  className={cn(
                    'text-[11px] leading-snug',
                    isActive ? 'font-medium text-foreground/85' : 'text-muted-foreground/75',
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
