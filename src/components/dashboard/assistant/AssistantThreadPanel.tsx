import { Link } from 'react-router-dom';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import type { CoachAssistantMessage } from '@/types/coachAssistant';
import { cn } from '@/lib/utils';

interface AssistantThreadPanelProps {
  messages: CoachAssistantMessage[];
}

export function AssistantThreadPanel({ messages }: AssistantThreadPanelProps) {
  if (messages.length === 0) return null;

  return (
    <div className="space-y-6 w-full pb-2" role="log" aria-live="polite">
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
        >
          <div
            className={cn(
              'w-full max-w-2xl px-0 py-1 text-sm',
              m.role === 'user' ? 'text-right' : 'text-left',
            )}
          >
            {m.role === 'assistant' && m.provenance && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/55 dark:text-muted-foreground mb-2">
                {m.provenance === 'data_plus_llm'
                  ? COACH_ASSISTANT_COPY.PROVENANCE_LLM
                  : COACH_ASSISTANT_COPY.PROVENANCE_DATA_ONLY}
              </p>
            )}
            <div
              className={cn(
                'inline-block max-w-full rounded-md px-3 py-2.5 text-left',
                m.role === 'user'
                  ? 'bg-muted text-foreground dark:bg-primary/90 dark:text-primary-foreground'
                  : 'border border-border/50 bg-muted/40 text-foreground dark:bg-muted/25 dark:border-border',
              )}
            >
              <div className="space-y-2 whitespace-pre-wrap break-words leading-relaxed text-foreground">
                {m.blocks.map((b, i) => {
                  if (b.type === 'text') {
                    return <p key={i}>{b.content}</p>;
                  }
                  return (
                    <div key={i} className="flex flex-wrap gap-2 pt-1">
                      {b.actions.map((a) => (
                        <Link
                          key={a.to + a.label}
                          to={a.to}
                          className="text-xs font-semibold text-foreground underline underline-offset-2 decoration-foreground/30 hover:decoration-foreground"
                        >
                          {a.label}
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
