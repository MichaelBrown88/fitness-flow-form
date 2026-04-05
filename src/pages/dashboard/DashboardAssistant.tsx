import { useCallback, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Plus,
  Sun,
  Search,
  ClipboardPlus,
  CalendarRange,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AssistantAiCreditsBanner } from '@/components/dashboard/assistant/AssistantAiCreditsBanner';
import { AssistantModeToggle } from '@/components/dashboard/assistant/AssistantModeToggle';
import { AssistantThreadPanel } from '@/components/dashboard/assistant/AssistantThreadPanel';
import { useCoachAssistantContext } from '@/contexts/CoachAssistantContext';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import { UI_EVENTS } from '@/constants/uiEvents';
import { ROUTES, dashboardWorkPath } from '@/constants/routes';
import { staffPreferredFirstName } from '@/lib/utils/staffDisplayName';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { WorkspaceGreetingMark } from '@/components/dashboard/WorkspaceGreetingMark';

function greetingHour(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type ChipDef = { label: string; onClick: () => void; Icon: LucideIcon };

const QUICK_PILL_CLASS =
  'inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-card/80';

/** Claude-style elevated composer: + menu, text, compact mode + send. */
const COMPOSER_SHELL =
  'w-full rounded-[1.75rem] border border-border/70 bg-card px-2 py-2 shadow-md shadow-black/[0.06] dark:border-border dark:bg-card dark:shadow-black/25 sm:px-3 sm:py-2.5';

export default function DashboardAssistant() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const assistant = useCoachAssistantContext();
  const [draft, setDraft] = useState('');

  const coachFirst = user ? staffPreferredFirstName(profile, user) : 'Coach';

  const send = useCallback(async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
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

  const hasMessages = assistant.messages.length > 0;

  const textareaProps = {
    value: draft,
    onChange: (e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value),
    placeholder: COACH_ASSISTANT_COPY.PLACEHOLDER,
    onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    disabled: assistant.sending,
    'aria-label': COACH_ASSISTANT_COPY.PLACEHOLDER,
    className: cn(
      'min-h-[52px] max-h-36 w-full resize-none border-0 bg-transparent py-2 text-sm text-foreground',
      'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0',
    ),
  };

  const modeDescription = (
    <p className="text-[11px] leading-snug text-muted-foreground">
      {assistant.interactionMode === 'data'
        ? COACH_ASSISTANT_COPY.MODE_DATA_DESC
        : COACH_ASSISTANT_COPY.MODE_ASSIST_DESC}
    </p>
  );

  const quickActionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={COACH_ASSISTANT_COPY.QUICK_ACTIONS_MENU_ARIA}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold text-foreground">
          {COACH_ASSISTANT_COPY.QUICK_ACTIONS_MENU_ARIA}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {chips.map(({ label, onClick, Icon }) => (
          <DropdownMenuItem
            key={label}
            className="flex cursor-pointer items-center gap-2 text-sm text-foreground focus:text-foreground"
            onClick={onClick}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const composerInner = (
    <>
      <div className={COMPOSER_SHELL}>
        <div className="flex min-w-0 items-end gap-1 sm:gap-2">
          {quickActionsMenu}
          <div className="min-w-0 flex-1">
            <Textarea {...textareaProps} className={cn(textareaProps.className, 'min-h-[52px] px-1')} />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5 pb-0.5">
            <AssistantModeToggle
              mode={assistant.interactionMode}
              onChange={assistant.setInteractionMode}
              variant="minimal"
              density="compact"
            />
            <Button
              type="button"
              size="sm"
              className="h-9 min-w-[4.5rem] rounded-lg px-4 font-semibold"
              onClick={() => void send()}
              disabled={assistant.sending || !draft.trim()}
            >
              {assistant.sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Send'}
            </Button>
          </div>
        </div>
        <p className="hidden px-2 pt-1 text-[10px] text-muted-foreground sm:block">{COACH_ASSISTANT_COPY.SLASH_HINT}</p>
      </div>
      <AssistantAiCreditsBanner variant="inline" className="w-full" />
    </>
  );

  const composerBarEmpty = (
    <div className="mx-auto w-full max-w-2xl space-y-2">{composerInner}</div>
  );

  const composerBarThread = <div className="w-full space-y-2">{composerInner}</div>;

  return (
    <div
      className={cn(
        'flex min-h-0 w-full flex-1 flex-col',
        !hasMessages && 'bg-background dark:bg-background',
      )}
    >
      {!hasMessages ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-8 sm:py-12">
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 sm:gap-10">
            <div className="space-y-3 text-center">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <WorkspaceGreetingMark className="h-11 w-11 sm:h-14 sm:w-14" />
                <p className="font-serif text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
                  {`${greetingHour()}, ${coachFirst}.`}
                </p>
              </div>
              <p className="text-base font-medium text-muted-foreground">{COACH_ASSISTANT_COPY.EMPTY_TITLE}</p>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground/90">
                {COACH_ASSISTANT_COPY.EMPTY_SUB}
              </p>
            </div>

            {composerBarEmpty}

            <div className="flex w-full max-w-2xl flex-wrap justify-center gap-2 px-1">
              {chips.map(({ label, onClick, Icon }) => (
                <button key={label} type="button" className={QUICK_PILL_CLASS} onClick={onClick}>
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            <div className="max-w-md px-2 text-center">{modeDescription}</div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col bg-background">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:max-w-4xl sm:px-6 sm:py-6 lg:max-w-5xl lg:px-8">
              <AssistantThreadPanel messages={assistant.messages} />
            </div>
          </div>

          <div className="shrink-0 border-t border-border/70 bg-background/95 supports-[backdrop-filter]:backdrop-blur-sm dark:bg-background/90">
            <div className="mx-auto w-full max-w-3xl space-y-2 px-4 py-3 sm:max-w-4xl sm:px-6 lg:max-w-5xl lg:px-8">
              <div className="hidden items-start justify-between gap-3 sm:flex">
                <div className="max-w-sm pt-0.5">{modeDescription}</div>
              </div>
              {composerBarThread}
              <p className="text-[10px] text-muted-foreground sm:hidden">{COACH_ASSISTANT_COPY.SLASH_HINT}</p>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                {chips.map(({ label, onClick, Icon }) => (
                  <button key={label} type="button" className={QUICK_PILL_CLASS} onClick={onClick}>
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              <div className="sm:hidden">{modeDescription}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
