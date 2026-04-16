/**
 * Floating AI assistant panel — accessible from any dashboard view.
 * Renders a trigger button (bottom-right) and a slide-out Sheet with the chat interface.
 * Uses CoachAssistantContext (provided by DashboardLayout) for all state.
 */

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Square, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AssistantModeToggle } from '@/components/dashboard/assistant/AssistantModeToggle';
import { AssistantThreadPanel } from '@/components/dashboard/assistant/AssistantThreadPanel';
import { useCoachAssistantContext } from '@/contexts/CoachAssistantContext';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import { ROUTES } from '@/constants/routes';
import { writePrefillClientPayload } from '@/lib/assessment/assessmentSessionStorage';
import { cn } from '@/lib/utils';

interface FloatingAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  }, [send]);

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
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open]);

  const hasMessages = assistant.messages.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full max-h-[100dvh] w-full flex-col overflow-hidden p-0 sm:max-w-[480px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Assistant</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages area */}
        {hasMessages ? (
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
            onScroll={handleScroll}
          >
            <div ref={scrollContentRef} className="px-4 py-4">
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
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Thinking...</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
            <MessageSquare className="h-10 w-10 text-primary/30 mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">
              {COACH_ASSISTANT_COPY.EMPTY_TITLE}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Ask about your clients, scores, or schedule.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: 'Daily brief', prompt: '/today' },
                { label: "Who's due?", prompt: '/due' },
                { label: 'Roster health', prompt: '/health' },
              ].map(chip => (
                <button
                  key={chip.prompt}
                  type="button"
                  onClick={() => void send(chip.prompt)}
                  className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-muted hover:text-foreground transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="shrink-0 border-t border-border/60 bg-background px-4 py-3 pb-[env(safe-area-inset-bottom)]">
          {assistant.interactionMode === 'assist' && (
            <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-score-amber/30 bg-score-amber-muted/40 px-2.5 py-1.5">
              <span className="text-[11px] font-semibold text-score-amber-fg">
                {COACH_ASSISTANT_COPY.MODE_ASSIST_WARNING}
              </span>
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
            placeholder={COACH_ASSISTANT_COPY.PLACEHOLDER}
            onKeyDown={handleKeyDown}
            aria-label={COACH_ASSISTANT_COPY.PLACEHOLDER}
            className="min-h-[56px] max-h-32 w-full resize-none rounded-xl border border-border/70 bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="flex items-center justify-between gap-2 mt-2">
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
                className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
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
                className="h-8 rounded-lg px-4 text-xs font-semibold"
                onClick={() => void send()}
                disabled={!draft.trim()}
              >
                Send
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
      className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 sm:h-14 sm:w-14"
      aria-label="Open assistant"
    >
      <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
      {hasActivity && (
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-score-amber border-2 border-background" />
      )}
    </button>
  );
}
