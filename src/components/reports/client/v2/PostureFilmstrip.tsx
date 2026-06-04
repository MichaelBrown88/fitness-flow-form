import React from 'react';
import type { ClientReportPostureModel } from '@/lib/reports/buildClientReportModel';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { PostureClientPostureSection } from '@/components/reports/posture/PostureClientPostureSection';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';
import { sortFindingsForDisplay } from '@/lib/posture/aggregatePostureInsights';
import { ClientReportCallout } from './ClientReportCallout';
import { cn } from '@/lib/utils';

interface PostureFilmstripProps {
  posture: ClientReportPostureModel;
  embedded?: boolean;
}

export function PostureFilmstrip({ posture, embedded = false }: PostureFilmstripProps) {
  const notable = sortFindingsForDisplay(
    posture.findings.filter((f) => f.severity !== 'aligned'),
  ).slice(0, 5);

  return (
    <section className={cn(embedded ? '' : 'rounded-sm border border-border bg-card px-6 py-7 sm:px-10')}>
      <div className="mb-4 border-b border-border pb-3">
        <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
          {CLIENT_REPORT_COPY.v2PostureHeading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
          {sanitizeClientReportCopy(posture.headline)}
        </p>
      </div>

      {notable.length > 0 ? (
        <div className="mb-5 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {CLIENT_REPORT_COPY.postureFindingsHeading}
          </p>
          {notable.map((f) => {
            const meaning = sanitizeClientReportCopy(f.whatItMeans?.trim() ?? '');
            const plan = sanitizeClientReportCopy(f.whatWellDo?.trim() ?? '');
            return (
              <article
                key={f.id}
                className="rounded-sm border border-border/70 bg-muted/25 px-3 py-3 sm:px-4"
              >
                <p className="text-sm font-semibold text-foreground">{f.name}</p>
                {meaning ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground-secondary">
                    <span className="font-medium text-foreground/85">
                      {CLIENT_REPORT_COPY.v2PostureWhatItMeans}:{' '}
                    </span>
                    {meaning}
                  </p>
                ) : null}
                {plan ? (
                  <ClientReportCallout variant="takeaway" label={CLIENT_REPORT_COPY.v2PostureWhatWeDo} className="mt-3">
                    {plan}
                  </ClientReportCallout>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {posture.focusBullets.length > 0 ? (
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {CLIENT_REPORT_COPY.focusNext}
          </p>
          <ul className="mt-2 space-y-2">
            {posture.focusBullets.map((line) => (
              <li key={line}>
                <ClientReportCallout variant="focus">{sanitizeClientReportCopy(line)}</ClientReportCallout>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mb-3 text-[11px] text-muted-foreground">
        {CLIENT_REPORT_COPY.v2PostureSubheading}
      </p>
      <PostureClientPostureSection
        postureResults={posture.postureResults}
        postureImages={posture.images}
      />
    </section>
  );
}
