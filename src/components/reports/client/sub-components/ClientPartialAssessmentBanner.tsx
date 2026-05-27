import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { SECTION_META, type SectionId } from '../clientReportSections';

interface ClientPartialAssessmentBannerProps {
  activeSectionIds: SectionId[];
}

const ALL_SECTIONS: SectionId[] = [
  'body-comp',
  'strength',
  'cardio',
  'movement-quality',
  'lifestyle',
];

export function ClientPartialAssessmentBanner({
  activeSectionIds,
}: ClientPartialAssessmentBannerProps) {
  const missing = ALL_SECTIONS.filter((id) => !activeSectionIds.includes(id));
  if (missing.length === 0 || missing.length === ALL_SECTIONS.length) return null;

  const assessed = activeSectionIds.map((id) => SECTION_META[id].shortTitle);
  const notAssessed = missing.map((id) => SECTION_META[id].shortTitle);

  return (
    <div
      className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm"
      role="status"
    >
      <p className="font-semibold text-foreground">{CLIENT_REPORT_COPY.partialAssessmentHeading}</p>
      <p className="mt-1 text-muted-foreground">
        <span className="text-foreground">{assessed.join(', ')}</span>
        {notAssessed.length > 0 ? (
          <>
            {' '}
            · Not in this session:{' '}
            <span className="text-foreground">{notAssessed.join(', ')}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
