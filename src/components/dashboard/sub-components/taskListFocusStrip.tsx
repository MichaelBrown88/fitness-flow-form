import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DASHBOARD_TASKS } from '@/constants/dashboardTasksCopy';
import type { FocusStripEntry } from './taskListModel';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

interface TaskListFocusStripProps {
  entries: FocusStripEntry[];
  navigate: NavigateFunction;
  density?: 'default' | 'compact';
}

export function TaskListFocusStrip({ entries, navigate, density = 'default' }: TaskListFocusStripProps) {
  if (entries.length === 0) return null;

  const compact = density === 'compact';

  return (
    <div
      className={`rounded-xl border border-border bg-muted/30 ${compact ? 'space-y-1 p-2' : 'space-y-2 p-3 sm:p-4'}`}
    >
      <p
        className={`font-black uppercase tracking-[0.15em] text-muted-foreground ${compact ? 'text-[9px]' : 'text-[10px]'}`}
      >
        {DASHBOARD_TASKS.FOCUS_STRIP_TITLE}
      </p>
      <ul className={compact ? 'space-y-1' : 'space-y-2'}>
        {entries.map((e) => (
          <li
            key={e.clientName}
            className={`flex flex-col rounded-lg border border-border/60 bg-card sm:flex-row sm:items-center sm:justify-between ${
              compact ? 'gap-1.5 px-2 py-1.5' : 'gap-2 px-3 py-2.5 min-h-[44px]'
            }`}
          >
            <div className="min-w-0 flex-1">
              <a
                href={e.clientPath}
                onClick={(ev) => {
                  ev.preventDefault();
                  navigate(e.clientPath);
                }}
                className={`font-semibold text-foreground hover:underline truncate block ${compact ? 'text-xs' : 'text-sm'}`}
                aria-label={`${DASHBOARD_TASKS.FOCUS_STRIP_CLIENT_LINK_ARIA}: ${formatClientDisplayName(e.clientName)}`}
              >
                {formatClientDisplayName(e.clientName)}
              </a>
              <p className={`text-muted-foreground truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>{e.subtitle}</p>
            </div>
            <Button
              type="button"
              size="sm"
              className={`shrink-0 ${compact ? 'h-7 min-h-0 px-2 text-xs' : 'h-9 min-h-[44px] sm:min-h-0'}`}
              onClick={() => navigate(e.firstActionRoute)}
            >
              {e.firstActionLabel}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
