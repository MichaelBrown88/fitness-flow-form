import React from 'react';
import type {
  ClientMovementFindingGroup,
  ClientMovementFindingsModel,
  MovementFindingTone,
} from '@/lib/reports/clientMovementFindings';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';
import { cn } from '@/lib/utils';

interface ClientMovementFindingsProps {
  findings: ClientMovementFindingsModel;
  className?: string;
}

const TONE_DOT: Record<MovementFindingTone, string> = {
  good: 'bg-score-green',
  concern: 'bg-score-amber',
  critical: 'bg-score-red',
};

const TONE_GROUP_BORDER: Record<MovementFindingTone, string> = {
  good: 'border-score-green/35',
  concern: 'border-score-amber/40',
  critical: 'border-score-red/40',
};

function FindingGroupCard({ group }: { group: ClientMovementFindingGroup }) {
  return (
    <div
      className={cn(
        'rounded-sm border bg-card px-3 py-3 sm:px-4',
        TONE_GROUP_BORDER[group.tone],
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn('h-2 w-2 shrink-0 rounded-full', TONE_DOT[group.tone])}
          aria-hidden
        />
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
          {sanitizeClientReportCopy(group.title)}
        </h4>
      </div>
      <ul className="mt-2.5 space-y-2">
        {group.rows.map((row) => (
          <li
            key={`${row.label}-${row.value}`}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5"
          >
            <span
              className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[row.tone])}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {sanitizeClientReportCopy(row.label)}
              </p>
              <p className="text-[13px] font-medium leading-snug text-foreground">
                {sanitizeClientReportCopy(row.value)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ClientMovementFindings({ findings, className }: ClientMovementFindingsProps) {
  if (findings.groups.length === 0 && !findings.hasPostureScan) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        {CLIENT_REPORT_COPY.targetsUnavailable}
      </p>
    );
  }

  return (
    <div className={cn('mt-5', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {CLIENT_REPORT_COPY.v2MovementFindingsHeading}
      </p>
      {findings.groups.length > 0 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {findings.groups.map((group) => (
            <FindingGroupCard key={`${group.id}-${group.title}`} group={group} />
          ))}
        </div>
      ) : null}
      {findings.hasPostureScan ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {CLIENT_REPORT_COPY.v2MovementPostureHint}
        </p>
      ) : null}
    </div>
  );
}
