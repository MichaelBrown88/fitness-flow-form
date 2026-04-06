import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Loader2,
  Sun,
  Search,
  ClipboardPlus,
  CalendarRange,
  Share2,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AssistantModeToggle } from '@/components/dashboard/assistant/AssistantModeToggle';
import { AssistantThreadPanel } from '@/components/dashboard/assistant/AssistantThreadPanel';
import { useCoachAssistantContext } from '@/contexts/CoachAssistantContext';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import { UI_EVENTS } from '@/constants/uiEvents';
import { ROUTES, dashboardWorkPath } from '@/constants/routes';
import { staffPreferredFirstName } from '@/lib/utils/staffDisplayName';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { DashboardOutletContext } from './DashboardLayout';
import { getPillarLabel } from '@/constants/pillars';
import type { ReassessmentItem } from '@/hooks/useReassessmentQueue';

function greetingHour(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type ChipDef = { label: string; onClick: () => void; Icon: LucideIcon };

const QUICK_PILL_CLASS =
  'inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-card/80';

const COMPOSER_SHELL =
  'w-full rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm dark:border-border dark:bg-card focus-within:outline-none';

const SLASH_COMMANDS = [
  { cmd: '/today', desc: 'Daily brief — who needs attention right now' },
  { cmd: '/clients', desc: 'Go to your client directory' },
  { cmd: '/work', desc: 'Open reassessment queue and calendar' },
  { cmd: '/share', desc: 'Browse reports, roadmaps and achievements' },
  { cmd: '/help', desc: 'Show available commands' },
] as const;

function briefLabel(item: ReassessmentItem): string {
  const pillar = item.mostUrgentPillar && item.mostUrgentPillar !== 'full'
    ? item.mostUrgentPillar
    : (item.pillarSchedules.find(s => s.status === 'overdue')?.pillar ?? null);
  if (!pillar || pillar === 'full') return `${item.clientName} — no recent assessment`;
  const ps = item.pillarSchedules.find(s => s.pillar === pillar);
  const label = getPillarLabel(pillar);
  if (!ps) return `${item.clientName} — ${label}`;
  if (ps.daysFromDue > 0) return `${item.clientName} — ${label} (${ps.daysFromDue}d overdue)`;
  const daysLeft = Math.abs(ps.daysFromDue);
  return `${item.clientName} — ${label} (due in ${daysLeft}d)`;
}

/** Detect @query at end of string */
const MENTION_RE = /(^|\s)@(\S*)$/;

export default function DashboardAssistant() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const assistant = useCoachAssistantContext();
  const ctx = useOutletContext<DashboardOutletContext>();
  const [draft, setDraft] = useState('');
  const [actionsOpen, setActionsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Slash command menu state: query typed after '/', highlighted index
  const [slashMenu, setSlashMenu] = useState<{ query: string; index: number } | null>(null);
  // @ mention menu state: query typed after '@', highlighted index
  const [mentionMenu, setMentionMenu] = useState<{ query: string; index: number } | null>(null);

  const coachFirst = user ? staffPreferredFirstName(profile, user) : 'Coach';

  // ── Scroll management ──────────────────────────────────────────────────────
  // The scroll container lives here; AssistantThreadPanel just renders content.
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  // True when the view is stuck to the bottom — reset on each new message.
  const shouldAutoScrollRef = useRef(true);

  // When a new message arrives or the thinking state changes, force-scroll to bottom.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    shouldAutoScrollRef.current = true;
  }, [assistant.messages.length, assistant.sending]);

  // ResizeObserver keeps the view glued to the bottom while the typewriter
  // adds content — fires on every character so we never fall behind.
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
  // Re-attach observer when switching between empty/thread view
  }, [assistant.messages.length]);

  // If the user manually scrolls up, stop auto-scrolling until the next message.
  const handleScrollContainer = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    shouldAutoScrollRef.current = nearBottom;
  }, []);

  const send = useCallback(async (text?: string) => {
    const t = (text ?? draft).trim();
    if (!t) return;
    setDraft('');
    setSlashMenu(null);
    setMentionMenu(null);
    await assistant.sendMessage(t);
  }, [draft, assistant]);

  const chips = useMemo(
    () =>
      [
        {
          label: COACH_ASSISTANT_COPY.CHIP_TODAY,
          Icon: Sun,
          onClick: () => void assistant.sendMessage('/today'),
        },
        {
          label: COACH_ASSISTANT_COPY.CHIP_FIND_CLIENT,
          Icon: Search,
          onClick: () => window.dispatchEvent(new Event(UI_EVENTS.OPEN_COMMAND_MENU)),
        },
        {
          label: COACH_ASSISTANT_COPY.CHIP_NEW_ASSESSMENT,
          Icon: ClipboardPlus,
          onClick: () => navigate(ROUTES.ASSESSMENT),
        },
        {
          label: COACH_ASSISTANT_COPY.CHIP_CALENDAR,
          Icon: CalendarRange,
          onClick: () => navigate(dashboardWorkPath('calendar')),
        },
        {
          label: COACH_ASSISTANT_COPY.CHIP_SHARE,
          Icon: Share2,
          onClick: () => void assistant.sendMessage('/share'),
        },
      ] satisfies ChipDef[],
    [assistant, navigate],
  );

  const briefItems = useMemo(() => {
    const queue = ctx.reassessmentQueue?.queue ?? [];
    return queue
      .filter(item => item.status === 'overdue' || item.status === 'due-soon')
      .slice(0, 5);
  }, [ctx.reassessmentQueue?.queue]);

  // Filtered slash commands based on current query
  const filteredSlashCommands = useMemo(() => {
    if (!slashMenu) return [];
    const q = slashMenu.query.toLowerCase();
    return SLASH_COMMANDS.filter(c => c.cmd.slice(1).startsWith(q));
  }, [slashMenu]);

  // Filtered clients for @ mention
  const filteredMentionClients = useMemo(() => {
    if (!mentionMenu) return [];
    const q = mentionMenu.query.toLowerCase();
    return (ctx.filteredClients ?? [])
      .filter(c => {
        const display = formatClientDisplayName(c.name).toLowerCase();
        return display.includes(q) || c.name.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [mentionMenu, ctx.filteredClients]);

  const applySlashCommand = useCallback((cmd: string | undefined) => {
    if (!cmd) return;
    setSlashMenu(null);
    setDraft('');
    void assistant.sendMessage(cmd);
  }, [assistant]);

  const applyMention = useCallback((clientName: string | undefined) => {
    if (!clientName) return;
    const displayName = formatClientDisplayName(clientName);
    setDraft(prev => prev.replace(MENTION_RE, (_, space: string) => `${space}@${displayName} `));
    setMentionMenu(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const hasMessages = assistant.messages.length > 0;

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDraft(value);

    // Slash command: only if the whole draft is a single /word (no spaces yet)
    if (value.startsWith('/') && !value.includes(' ')) {
      const query = value.slice(1).toLowerCase();
      const matches = SLASH_COMMANDS.filter(c => c.cmd.slice(1).startsWith(query));
      setSlashMenu(matches.length > 0 ? { query, index: 0 } : null);
    } else {
      setSlashMenu(null);
    }

    // @ mention: detect @word at end of text
    const match = MENTION_RE.exec(value);
    if (match) {
      const q = match[2].toLowerCase();
      setMentionMenu({ query: q, index: 0 });
    } else {
      setMentionMenu(null);
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    const menuOpen = slashMenu !== null || mentionMenu !== null;

    if (menuOpen) {
      const isSlash = slashMenu !== null;
      const items = isSlash ? filteredSlashCommands : filteredMentionClients;
      const current = isSlash ? slashMenu! : mentionMenu!;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (current.index + 1) % Math.max(items.length, 1);
        isSlash ? setSlashMenu({ ...current, index: next }) : setMentionMenu({ ...current, index: next });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (current.index - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1);
        isSlash ? setSlashMenu({ ...current, index: prev }) : setMentionMenu({ ...current, index: prev });
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isSlash) {
          applySlashCommand(filteredSlashCommands[current.index]?.cmd);
        } else {
          applyMention(filteredMentionClients[current.index]?.name);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashMenu(null);
        setMentionMenu(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }, [slashMenu, mentionMenu, filteredSlashCommands, filteredMentionClients, applySlashCommand, applyMention, send]);

  const textareaProps = {
    ref: textareaRef,
    value: draft,
    onChange: handleChange,
    placeholder: COACH_ASSISTANT_COPY.PLACEHOLDER,
    onKeyDown: handleKeyDown,
    disabled: assistant.sending,
    'aria-label': COACH_ASSISTANT_COPY.PLACEHOLDER,
    className: cn(
      'min-h-[72px] max-h-48 w-full resize-none border-0 bg-transparent py-2 text-base text-foreground',
      'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
    ),
  };

  // Autocomplete popup rendered above the composer
  const autocompletePopup = (
    <>
      {slashMenu !== null && filteredSlashCommands.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {filteredSlashCommands.map((c, i) => (
            <button
              key={c.cmd}
              type="button"
              className={cn(
                'flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-muted',
                Math.min(slashMenu.index, filteredSlashCommands.length - 1) === i && 'bg-muted',
              )}
              onMouseDown={(e) => { e.preventDefault(); applySlashCommand(c.cmd); }}
            >
              <span className="text-xs font-mono font-semibold text-foreground">{c.cmd}</span>
              <span className="text-[11px] text-muted-foreground">{c.desc}</span>
            </button>
          ))}
        </div>
      )}
      {mentionMenu !== null && filteredMentionClients.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {filteredMentionClients.map((c, i) => (
            <button
              key={c.name}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted',
                Math.min(mentionMenu.index, filteredMentionClients.length - 1) === i && 'bg-muted',
              )}
              onMouseDown={(e) => { e.preventDefault(); applyMention(c.name); }}
            >
              <span className="text-xs font-medium text-foreground">{formatClientDisplayName(c.name)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );

  const composerInner = (inThread: boolean) => (
    <div className="relative">
      {autocompletePopup}
      <div className={COMPOSER_SHELL}>
        {inThread && actionsOpen && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-1 border-b border-border/40">
            {chips.map(({ label, onClick, Icon }) => (
              <button
                key={label}
                type="button"
                className={cn(QUICK_PILL_CLASS, 'shrink-0')}
                onClick={() => { onClick(); setActionsOpen(false); }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        )}
        <Textarea {...textareaProps} className={cn(textareaProps.className, 'min-h-[68px] px-0')} />
        <div className="flex items-center justify-between pt-1.5">
          <div className="flex items-center gap-1.5">
            {inThread && (
              <button
                type="button"
                onClick={() => setActionsOpen((v) => !v)}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  actionsOpen && 'bg-muted text-foreground',
                )}
                aria-label="Quick actions"
                title="Quick actions"
              >
                <Plus className={cn('h-4 w-4 transition-transform', actionsOpen && 'rotate-45')} />
              </button>
            )}
            <AssistantModeToggle
              mode={assistant.interactionMode}
              onChange={assistant.setInteractionMode}
              variant="minimal"
              density="compact"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 min-w-[4rem] rounded-lg px-4 text-xs font-semibold"
            onClick={() => void send()}
            disabled={assistant.sending || !draft.trim()}
          >
            {assistant.sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );

  const composerBarEmpty = (
    <div className="w-full">{composerInner(false)}</div>
  );

  const composerBarThread = <div className="w-full">{composerInner(true)}</div>;

  return (
    <div
      className={cn(
        'flex min-h-0 w-full flex-1 flex-col',
        !hasMessages && 'bg-background dark:bg-background',
      )}
    >
      {!hasMessages ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center px-6 py-10 sm:py-14">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-7">
            <div className="space-y-2 text-center">
              <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {`${greetingHour()}, ${coachFirst}.`}
              </p>
              <p className="text-base text-muted-foreground">{COACH_ASSISTANT_COPY.EMPTY_TITLE}</p>
            </div>

            {composerBarEmpty}

            <div className="flex w-full flex-wrap gap-2">
              {chips.map(({ label, onClick, Icon }) => (
                <button key={label} type="button" className={cn(QUICK_PILL_CLASS, 'shrink-0')} onClick={onClick}>
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            {briefItems.length > 0 && (
              <div className="w-full space-y-1.5">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground px-1">
                  Needs attention
                </p>
                <ul className="space-y-1">
                  {briefItems.map(item => {
                    const pillar = (item.mostUrgentPillar && item.mostUrgentPillar !== 'full')
                      ? item.mostUrgentPillar
                      : (item.pillarSchedules.find(s => s.status === 'overdue')?.pillar ?? 'bodycomp');
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
                      >
                        <span className="text-xs text-foreground truncate min-w-0">{briefLabel(item)}</span>
                        <button
                          type="button"
                          onClick={() => void ctx.handleNewAssessmentForClient(item.clientName, pillar !== 'full' ? pillar : undefined)}
                          className="shrink-0 text-[11px] font-bold text-primary hover:underline"
                        >
                          Start
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background">
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
            onScroll={handleScrollContainer}
          >
            <div
              ref={scrollContentRef}
              className="mx-auto w-full max-w-3xl px-4 py-5 sm:max-w-4xl sm:px-6 sm:py-6 lg:max-w-5xl lg:px-8"
            >
              <AssistantThreadPanel messages={assistant.messages} thinking={assistant.sending} />
            </div>
          </div>

          <div className="shrink-0 border-t border-border/60 bg-background/95 supports-[backdrop-filter]:backdrop-blur-sm dark:bg-background/90">
            <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:max-w-4xl sm:px-6 lg:max-w-5xl lg:px-8">
              {composerBarThread}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
