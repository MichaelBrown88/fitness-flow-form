import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DASHBOARD_TASKS } from '@/constants/dashboardTasksCopy';
import type { FocusStripEntry } from './taskListModel';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

interface TaskListFocusStripProps {
  entries: FocusStripEntry[];
  navigate: NavigateFunction;
}

export function TaskListFocusStrip({ entries, navigate }: TaskListFocusStripProps) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4 space-y-2">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        {DASHBOARD_TASKS.FOCUS_STRIP_TITLE}
      </p>
      <ul className="space-y-2">
        {entries.map((e) => (
          <li
            key={e.clientName}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/60 bg-card px-3 py-2.5 min-h-[44px]"
          >
            <div className="min-w-0 flex-1">
              <a
                href={e.clientPath}
                onClick={(ev) => {
                  ev.preventDefault();
                  navigate(e.clientPath);
                }}
                className="text-sm font-semibold text-foreground hover:underline truncate block"
                aria-label={`${DASHBOARD_TASKS.FOCUS_STRIP_CLIENT_LINK_ARIA}: ${formatClientDisplayName(e.clientName)}`}
              >
                {formatClientDisplayName(e.clientName)}
              </a>
              <p className="text-xs text-muted-foreground truncate">{e.subtitle}</p>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-9 min-h-[44px] sm:min-h-0 shrink-0"
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
