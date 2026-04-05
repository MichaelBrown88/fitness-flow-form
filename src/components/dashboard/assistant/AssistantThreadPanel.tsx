import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import type { CoachAssistantMessage } from '@/types/coachAssistant';
import { cn } from '@/lib/utils';

interface AssistantThreadPanelProps {
  messages: CoachAssistantMessage[];
  /** Show the "thinking" dots while a response is being generated */
  thinking?: boolean;
}

/** Renders text with newlines as paragraph breaks. */
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

/**
 * Character-by-character typewriter animation.
 * Keyed by message ID via the parent so it replays on each new message.
 */
function TypewriterText({ text }: { text: string }) {
  const [visibleLen, setVisibleLen] = useState(0);

  useEffect(() => {
    setVisibleLen(0);
    if (!text) return;
    // ~400 chars/sec — fast enough to feel like streaming, slow enough to read
    const CHUNK = 10;
    const INTERVAL = 25;
    let pos = 0;
    const timer = setInterval(() => {
      pos = Math.min(pos + CHUNK, text.length);
      setVisibleLen(pos);
      if (pos >= text.length) clearInterval(timer);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [text]);

  const done = visibleLen >= text.length;
  const visible = text.slice(0, visibleLen);
  const paragraphs = visible.split(/\n+/).filter(Boolean);

  return (
    <div className="space-y-1.5 leading-relaxed">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {!done && (
        <span
          className="inline-block h-3.5 w-0.5 align-middle bg-foreground/60 animate-pulse"
          aria-hidden
        />
      )}
    </div>
  );
}

/** Animated three-dot "thinking" indicator */
function ThinkingDots() {
  return (
    <div
      className="flex items-center gap-1 py-0.5"
      aria-label={COACH_ASSISTANT_COPY.LOADING}
      role="status"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: `${i * 160}ms`, animationDuration: '800ms' }}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function AssistantThreadPanel({ messages, thinking = false }: AssistantThreadPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages or thinking state change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, thinking]);

  if (messages.length === 0 && !thinking) return null;

  // The most recent assistant message gets the typewriter treatment
  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id ?? null;

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
              <div className="space-y-2 break-words text-foreground">
                {m.blocks.map((b, i) => {
                  if (b.type === 'text') {
                    const isLatest = m.role === 'assistant' && m.id === lastAssistantId;
                    return isLatest ? (
                      <TypewriterText key={`${m.id}-tw`} text={b.content} />
                    ) : (
                      <MessageText key={i} text={b.content} />
                    );
                  }
                  return (
                    <div key={i} className="flex flex-wrap gap-2 pt-1">
                      {b.actions.map((a) => (
                        <Link
                          key={a.to + a.label}
                          to={a.to}
                          className="text-xs font-semibold text-primary underline underline-offset-2 decoration-primary/30 hover:decoration-primary"
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

      {thinking && (
        <div className="flex justify-start">
          <div className="px-0 py-1">
            <div className="inline-block rounded-xl border border-border/50 bg-muted/40 px-3.5 py-2.5 dark:bg-muted/25 dark:border-border">
              <ThinkingDots />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-px" aria-hidden />
    </div>
  );
}
