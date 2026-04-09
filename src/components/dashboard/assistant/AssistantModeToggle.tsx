import { Database, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import type { CoachAssistantInteractionMode } from '@/types/coachAssistant';
import { cn } from '@/lib/utils';

interface AssistantModeToggleProps {
  mode: CoachAssistantInteractionMode;
  onChange: (mode: CoachAssistantInteractionMode) => void;
  /** `minimal` = underline / text-only (assistant chrome); `default` = bordered pill */
  variant?: 'default' | 'minimal';
  /** Tighter control for inline composer bars (Claude-style). */
  density?: 'default' | 'compact';
}

export function AssistantModeToggle({
  mode,
  onChange,
  variant = 'default',
  density = 'default',
}: AssistantModeToggleProps) {
  const isMinimal = variant === 'minimal';
  const isCompact = density === 'compact';

  const inner = isMinimal ? (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 border border-border bg-card shadow-sm dark:bg-card/95',
        isCompact ? 'rounded-full p-0.5' : 'rounded-lg p-0.5',
      )}
      role="group"
      aria-label="Assistant response mode"
    >
      <button
        type="button"
        aria-pressed={mode === 'data'}
        className={cn(
          'inline-flex items-center gap-1 font-semibold transition-colors',
          isCompact
            ? 'rounded-full px-2 py-1 text-[10px]'
            : 'rounded-md px-2.5 py-1 text-xs',
          mode === 'data'
            ? 'bg-muted text-foreground shadow-sm dark:bg-background-secondary'
            : 'text-foreground/55 hover:text-foreground/90',
        )}
        onClick={() => onChange('data')}
      >
        <Database className={cn('shrink-0', isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden />
        {COACH_ASSISTANT_COPY.MODE_DATA_LABEL}
      </button>
      <button
        type="button"
        aria-pressed={mode === 'assist'}
        className={cn(
          'inline-flex items-center gap-1 font-semibold transition-colors',
          isCompact
            ? 'rounded-full px-2 py-1 text-[10px]'
            : 'rounded-md px-2.5 py-1 text-xs',
          mode === 'assist'
            ? 'bg-amber-100 text-amber-800 shadow-sm dark:bg-amber-900/40 dark:text-amber-300'
            : 'text-foreground/55 hover:text-foreground/90',
        )}
        onClick={() => onChange('assist')}
      >
        <MessageCircle className={cn('shrink-0', isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden />
        {COACH_ASSISTANT_COPY.MODE_ASSIST_LABEL}
      </button>
    </div>
  ) : (
    <div
      className="inline-flex rounded-lg border border-border bg-card p-0.5 shadow-sm dark:bg-card/95"
      role="group"
      aria-label="Assistant response mode"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 gap-1.5 rounded-md px-3 text-xs font-semibold text-foreground/60',
          mode === 'data' && 'bg-muted text-foreground shadow-sm dark:bg-background-secondary',
        )}
        onClick={() => onChange('data')}
      >
        <Database className="h-3 w-3 shrink-0" aria-hidden />
        {COACH_ASSISTANT_COPY.MODE_DATA_LABEL}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 gap-1.5 rounded-md px-3 text-xs font-semibold',
          mode === 'assist'
            ? 'bg-amber-100 text-amber-800 shadow-sm dark:bg-amber-900/40 dark:text-amber-300'
            : 'text-foreground/60',
        )}
        onClick={() => onChange('assist')}
      >
        <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
        {COACH_ASSISTANT_COPY.MODE_ASSIST_LABEL}
      </Button>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{inner}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs text-popover-foreground">
          {COACH_ASSISTANT_COPY.MODE_TOOLTIP}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
