/**
 * AI Assistant workspace — full-screen modal overlay for rich data exploration.
 * Coaches use this to query their roster, analyze trends, generate charts,
 * and get coaching recommendations. Needs room for visual blocks and tables.
 */

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Square, Loader2, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AssistantModeToggle } from '@/components/dashboard/assistant/AssistantModeToggle';
import { AssistantThreadPanel } from '@/components/dashboard/assistant/AssistantThreadPanel';
import { useCoachAssistantContext } from '@/contexts/CoachAssistantContext';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import { ROUTES } from '@/constants/routes';
import { writePrefillClientPayload } from '@/lib/assessment/assessmentSessionStorage';

interface FloatingAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_PROMPTS = [
  { label: 'Daily brief', prompt: '/today' },
  { label: "Who's due?", prompt: '/due' },
  { label: 'Client progress', prompt: '/progress' },
  { label: 'Roster health', prompt: '/health' },
  { label: 'Best performers', prompt: 'Who are my best performing clients this month? Show me their score trends.' },
  { label: 'Needs attention', prompt: 'Which clients have declined the most? What should I focus on with them?' },
];

export function FloatingAssistantPanel({ open, onOpenChange }: FloatingAssistantPanelProps) {
  const navigate = useNavigate();
  const assistant = useCoachAssistantContext();
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    shouldAutoScrollRef.current = true;
  }, [
    assistant.messages.length,
    assistant.sending,
    assistant.thinkingPhase,
    assistant.thinkingSessionKey,
    assistant.streamPreview?.active,
  ]);

  // ResizeObserver for typewriter scroll-stick
  useEffect(() => {
    const container = scrollContainerRef.current;
    const content = scrollContentRef.current;
    if (!container || !content) return;
    const ro = new ResizeObserver(() => {
      if (shouldAutoScrollRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [assistant.messages.length]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    shouldAutoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  const send = useCallback(async (text?: string) => {
    const t = (text ?? draft).trim();
    if (!t) return;
    setDraft('');
    await assistant.sendMessage(t);
  }, [draft, assistant]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
    if (e.key === 'Escape') {
      onOpenChange(false);
    }
  }, [send, onOpenChange]);

  const handleStartAssessmentForClient = useCallback(
    (fullName: string) => {
      writePrefillClientPayload({ fullName: fullName.trim() });
      navigate(ROUTES.ASSESSMENT);
      onOpenChange(false);
    },
    [navigate, onOpenChange],
  );

  // Focus textarea when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [open]);

  // Close on Escape key (global)
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  const hasMessages = assistant.messages.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      {/* Workspace modal — nearly full screen with padding */}
      <div className="fixed inset-4 sm:inset-6 lg:inset-8 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">AI Assistant</h2>
            {assistant.usageDisplay !== null && assistant.usageDisplay !== undefined && (
              <span className="text-[11px] text-muted-foreground ml-2">
                {COACH_ASSISTANT_COPY.AI_USAGE_REQUESTS_LABEL(
                  assistant.usageDisplay.requestsUsed,
                  assistant.usageDisplay.requestsCap,
                )}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => onOpenChange(false)}
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages area — scrollable, takes all available space */}
        {hasMessages ? (
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
            onScroll={handleScroll}
          >
            <div ref={scrollContentRef} className="mx-auto w-full max-w-4xl px-5 py-6">
              <AssistantThreadPanel
                messages={assistant.messages}
                thinkingPhase={assistant.thinkingPhase}
                thinkingSteps={assistant.thinkingSteps}
                thinkingSessionKey={assistant.thinkingSessionKey}
                streamPreview={assistant.streamPreview}
                assistantTypewriterMessageId={assistant.assistantTypewriterMessageId}
                onAssistantTypewriterComplete={assistant.onAssistantTypewriterComplete}
                onStartAssessmentForClient={handleStartAssessmentForClient}
              />
            </div>
          </div>
        ) : assistant.sending ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Thinking...</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
            <Sparkles className="h-12 w-12 text-primary/20 mb-6" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {COACH_ASSISTANT_COPY.EMPTY_TITLE}
            </h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-md">
              Ask about client progress, score trends, who needs attention, or get coaching recommendations. Charts, tables, and rich insights included.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {QUICK_PROMPTS.map(chip => (
                <button
                  key={chip.prompt}
                  type="button"
                  onClick={() => void send(chip.prompt)}
                  className="rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-muted hover:text-foreground transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Composer — fixed at bottom */}
        <div className="shrink-0 border-t border-border/60 bg-background/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {assistant.interactionMode === 'assist' && (
            <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-score-amber/30 bg-score-amber-muted/40 px-2.5 py-1.5">
              <span className="text-[11px] font-semibold text-score-amber-fg">
                {COACH_ASSISTANT_COPY.MODE_ASSIST_WARNING}
              </span>
            </div>
          )}
          <div className="mx-auto w-full max-w-4xl">
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
              placeholder={COACH_ASSISTANT_COPY.PLACEHOLDER}
              onKeyDown={handleKeyDown}
              aria-label={COACH_ASSISTANT_COPY.PLACEHOLDER}
              className="min-h-[56px] max-h-40 w-full resize-none rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex items-center justify-between gap-3 mt-3">
              <AssistantModeToggle
                mode={assistant.interactionMode}
                onChange={assistant.setInteractionMode}
                variant="minimal"
                density="compact"
              />
              {assistant.sending ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 rounded-lg px-4 text-xs font-semibold"
                  onClick={() => assistant.abortCurrentMessage()}
                  aria-label="Stop response"
                >
                  <Square className="h-3 w-3 fill-current" aria-hidden />
                  Stop
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="h-9 rounded-lg px-5 text-xs font-semibold"
                  onClick={() => void send()}
                  disabled={!draft.trim()}
                >
                  Send
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Floating trigger button — renders bottom-right on all dashboard views. */
export function FloatingAssistantTrigger({
  onClick,
  hasActivity,
}: {
  onClick: () => void;
  hasActivity?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 sm:h-14 sm:w-14"
      aria-label="Open assistant"
    >
      <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
      {hasActivity && (
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-score-amber border-2 border-background" />
      )}
    </button>
  );
}
