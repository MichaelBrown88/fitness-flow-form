import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import type {
  CoachAssistantBlock,
  CoachAssistantMessage,
  CoachAssistantStreamPreview,
  CoachAssistantThinkingPhase,
} from '@/types/coachAssistant';
import { AssistantVisualBlock } from '@/components/dashboard/assistant/AssistantVisualBlock';
import { AssistantTypewriterShell } from '@/components/dashboard/assistant/AssistantTypewriterShell';
import { ThinkingIndicator } from '@/components/dashboard/assistant/ThinkingIndicator';
import { AssistantMessageMarkdown } from '@/components/dashboard/assistant/AssistantMessageMarkdown';
import { cn } from '@/lib/utils';

interface AssistantThreadPanelProps {
  messages: CoachAssistantMessage[];
  thinkingPhase?: CoachAssistantThinkingPhase | null;
  thinkingSteps?: readonly string[];
  thinkingSessionKey?: string | null;
  streamPreview?: CoachAssistantStreamPreview | null;
  assistantTypewriterMessageId?: string | null;
  onAssistantTypewriterComplete?: (messageId: string) => void;
  /** Prefill assessment flow then navigate to /assessment */
  onStartAssessmentForClient?: (clientFullName: string) => void;
}

function MessageText({ text }: { text: string }) {
  const paragraphs = text.split(/\n+/).filter(Boolean);
  return (
    <div className="space-y-1.5 leading-relaxed">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

/** Leading text blocks only; used so charts/tables wait until prose finishes typing. */
function splitLeadingAssistantTextBlocks(blocks: CoachAssistantBlock[]): {
  leadingText: string;
  rest: CoachAssistantBlock[];
} | null {
  let idx = 0;
  const parts: string[] = [];
  while (idx < blocks.length && blocks[idx].type === 'text') {
    const b = blocks[idx];
    if (b.type === 'text') parts.push(b.content);
    idx += 1;
  }
  const leadingText = parts.join('\n\n').trim();
  if (leadingText.length === 0) return null;
  return { leadingText, rest: blocks.slice(idx) };
}

function DismissibleChart({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  if (!open) {
    return (
      <button
        type="button"
        className="text-[11px] font-semibold text-foreground-secondary underline underline-offset-2"
        onClick={() => setOpen(true)}
      >
        Show chart
      </button>
    );
  }
  return (
    <div className="relative pt-1">
      <button
        type="button"
        className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
        aria-label="Hide chart"
        onClick={() => setOpen(false)}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
      {children}
    </div>
  );
}

function CoachAssistantBlockList({
  m,
  assistantTextRich = false,
  onStartAssessmentForClient,
}: {
  m: CoachAssistantMessage;
  /** Assistant-only: render Markdown in text blocks (workouts, long coaching answers). */
  assistantTextRich?: boolean;
  onStartAssessmentForClient?: (clientFullName: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 break-words text-foreground">
      {m.blocks.map((b, i) => {
        if (b.type === 'text') {
          if (!b.content.trim()) return null;
          if (assistantTextRich) {
            return <AssistantMessageMarkdown key={`${m.id}-tx-${i}`} content={b.content} />;
          }
          return <MessageText key={`${m.id}-tx-${i}`} text={b.content} />;
        }
        if (b.type === 'visual') {
          return (
            <DismissibleChart key={`${m.id}-vis-${i}`}>
              <AssistantVisualBlock visual={b.visual} />
            </DismissibleChart>
          );
        }
        return (
          <div key={`${m.id}-act-${i}`} className="flex flex-wrap gap-2 pt-1">
            {b.actions.map((a, j) => {
              if (!('kind' in a)) {
                return (
                  <Button
                    key={`${a.label}-${a.to}-${j}`}
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs font-semibold"
                  >
                    <Link to={a.to}>{a.label}</Link>
                  </Button>
                );
              }
              if (a.kind === 'start_assessment') {
                return (
                  <Button
                    key={`${a.label}-${j}`}
                    type="button"
                    size="sm"
                    variant={a.variant === 'secondary' ? 'outline' : 'default'}
                    className="h-8 rounded-lg text-xs font-semibold"
                    onClick={() => onStartAssessmentForClient?.(a.clientName)}
                  >
                    {a.label}
                  </Button>
                );
              }
              return (
                <Button
                  key={`${a.label}-${a.to}-${j}`}
                  type="button"
                  size="sm"
                  variant={a.variant === 'secondary' ? 'outline' : 'default'}
                  className="h-8 rounded-lg text-xs font-semibold"
                  onClick={() => navigate(a.to)}
                >
                  {a.label}
                </Button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function AssistantBubbleContent({
  m,
  assistantTypewriterMessageId,
  onAssistantTypewriterComplete,
  onStartAssessmentForClient,
}: {
  m: CoachAssistantMessage;
  assistantTypewriterMessageId: string | null;
  onAssistantTypewriterComplete?: (messageId: string) => void;
  onStartAssessmentForClient?: (clientFullName: string) => void;
}) {
  const split = splitLeadingAssistantTextBlocks(m.blocks);
  const useTw =
    m.id === assistantTypewriterMessageId &&
    split !== null &&
    onAssistantTypewriterComplete !== undefined;

  const handleDone = useCallback(() => {
    onAssistantTypewriterComplete?.(m.id);
  }, [m.id, onAssistantTypewriterComplete]);

  if (!useTw || !split) {
    return (
      <CoachAssistantBlockList
        m={m}
        assistantTextRich
        onStartAssessmentForClient={onStartAssessmentForClient}
      />
    );
  }

  return (
    <AssistantTypewriterShell
      fullText={split.leadingText}
      active={m.id === assistantTypewriterMessageId}
      msPerChar={COACH_ASSISTANT_COPY.ASSISTANT_TYPEWRITER_MS_PER_CHAR}
      onComplete={handleDone}
      childrenAfterText={
        split.rest.length > 0 ? (
          <CoachAssistantBlockList
            m={{ ...m, blocks: split.rest }}
            assistantTextRich
            onStartAssessmentForClient={onStartAssessmentForClient}
          />
        ) : null
      }
    />
  );
}

export function AssistantThreadPanel({
  messages,
  thinkingPhase = null,
  thinkingSteps = [],
  thinkingSessionKey = null,
  streamPreview = null,
  assistantTypewriterMessageId = null,
  onAssistantTypewriterComplete,
  onStartAssessmentForClient,
}: AssistantThreadPanelProps) {
  if (messages.length === 0 && !thinkingPhase && !streamPreview?.active) return null;

  return (
    <div className="space-y-6 w-full pb-2" role="log" aria-live="polite">
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
        >
          <div
            className={cn(
              'w-full px-0 py-1 text-sm',
              m.role === 'user' ? 'max-w-2xl text-right' : 'max-w-[min(100%,42rem)] text-left',
            )}
          >
            {m.role === 'assistant' && m.provenance === 'data_plus_llm' && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/55 dark:text-muted-foreground mb-2">
                {COACH_ASSISTANT_COPY.PROVENANCE_LLM}
              </p>
            )}
            <div
              className={cn(
                'inline-block max-w-full rounded-xl px-3.5 py-2.5 text-left text-sm',
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border/50 bg-muted/40 text-foreground dark:bg-muted/25 dark:border-border',
              )}
            >
              {m.role === 'user' ? (
                <CoachAssistantBlockList m={m} onStartAssessmentForClient={onStartAssessmentForClient} />
              ) : (
                <AssistantBubbleContent
                  m={m}
                  assistantTypewriterMessageId={assistantTypewriterMessageId}
                  onAssistantTypewriterComplete={onAssistantTypewriterComplete}
                  onStartAssessmentForClient={onStartAssessmentForClient}
                />
              )}
            </div>
          </div>
        </div>
      ))}

      {thinkingPhase !== null && thinkingSteps.length > 0 && thinkingSessionKey !== null && (
        <ThinkingIndicator sessionKey={thinkingSessionKey} steps={thinkingSteps} phase={thinkingPhase} />
      )}

      {streamPreview?.active === true && (
        <div className="flex justify-start">
          <div className="w-full max-w-2xl px-0 py-1 text-left text-sm">
            <div
              className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3.5 py-2.5 dark:bg-muted/25 dark:border-border"
              aria-label={COACH_ASSISTANT_COPY.STREAM_PREVIEW_ARIA}
            >
              <span className="inline-flex gap-0.5" aria-hidden>
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-duration:0.9s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-duration:0.9s] [animation-delay:0.12s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-duration:0.9s] [animation-delay:0.24s]" />
              </span>
              <span className="text-[13px] text-muted-foreground">{COACH_ASSISTANT_COPY.STREAM_COMPOSING_LINE}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
