import React from 'react';
import type { ClientReportPillarModel } from '@/lib/reports/buildClientReportModel';
import { PillarScoreBadge } from '@/components/reports/PillarScoreBadge';
import type { PillarKey } from '@/lib/reports/radarData';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';
import { ClientProgressionTable } from './ClientProgressionTable';
import { LifestyleFactorsCard } from '@/components/reports/client/sub-components/LifestyleFactorsCard';
import { ClientMovementFindings } from './ClientMovementFindings';
import { ClientReportCallout } from './ClientReportCallout';
import type { FormData } from '@/contexts/FormContext';
import { cn } from '@/lib/utils';

const SCORING_TO_PILLAR: Record<ClientReportPillarModel['scoringId'], PillarKey> = {
  bodyComp: 'bodyComp',
  strength: 'strength',
  cardio: 'cardio',
  movementQuality: 'movementQuality',
  lifestyle: 'lifestyle',
};

interface ClientPillarBriefProps {
  pillar: ClientReportPillarModel;
  formData?: FormData;
}

export function ClientPillarBrief({ pillar, formData }: ClientPillarBriefProps) {
  const pillarKey = SCORING_TO_PILLAR[pillar.scoringId];
  const scoreDelta =
    pillar.previousScore != null ? pillar.score - pillar.previousScore : null;
  const isSupporting =
    pillar.pillarRole === 'supporting' || pillar.pillarRole === 'off-path';

  return (
    <article
      id={`pillar-${pillar.sectionId}`}
      data-section-id={pillar.sectionId}
      className={cn('scroll-mt-24 py-7 sm:py-8', isSupporting && 'opacity-[0.94]')}
    >
      <div className="flex items-start gap-4">
        <PillarScoreBadge pillar={pillarKey} score={pillar.score} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-base font-semibold tracking-[-0.02em] text-foreground">
              {pillar.title}
            </h3>
            <span className="text-[12px] font-medium tabular-nums text-muted-foreground">
              {pillar.score}
              <span className="text-muted-foreground/70"> / 100</span>
            </span>
            {scoreDelta !== null && scoreDelta !== 0 ? (
              <span
                className={cn(
                  'text-[11px] font-semibold tabular-nums',
                  scoreDelta > 0 ? 'text-score-green-fg' : 'text-score-red-fg',
                )}
              >
                {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} vs last
              </span>
            ) : null}
          </div>
          {pillar.goalTieIn ? (
            <ClientReportCallout variant="takeaway" className="mt-3">
              {sanitizeClientReportCopy(pillar.goalTieIn)}
            </ClientReportCallout>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
            {sanitizeClientReportCopy(pillar.summary)}
          </p>
        </div>
      </div>

      {pillar.contentMode === 'lifestyle-factors' ? (
        <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {CLIENT_REPORT_COPY.v2LifestyleFactorsHeading}
          </p>
          <div className="mt-3">
            <LifestyleFactorsCard formData={formData} />
          </div>
        </div>
      ) : null}
      {pillar.contentMode === 'movement-findings' && pillar.movementFindings ? (
        <ClientMovementFindings findings={pillar.movementFindings} />
      ) : null}
      {pillar.contentMode === 'progression' ? (
        <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {CLIENT_REPORT_COPY.v2ProgressionHeading}
          </p>
          <ClientProgressionTable rows={pillar.progressionRows} />
        </div>
      ) : null}

      {(pillar.goingWell.length > 0 || pillar.focusNext.length > 0) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {pillar.goingWell.length > 0 ? (
            <div className="rounded-sm border border-score-green/25 bg-score-green/8 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-score-green-fg">
                {CLIENT_REPORT_COPY.goingWell}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-foreground-secondary">
                {pillar.goingWell.map((line) => (
                  <li key={line}>{sanitizeClientReportCopy(line)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {pillar.focusNext.length > 0 ? (
            <div className="rounded-sm border border-score-amber/30 bg-score-amber/10 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/80">
                {CLIENT_REPORT_COPY.focusNext}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-foreground-secondary">
                {pillar.focusNext.map((line) => (
                  <li key={line}>{sanitizeClientReportCopy(line)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
