/**
 * In-page navigation for Coach Report sections (anchor links).
 */

import {
  COACH_REPORT_SECTION_IDS,
  getCoachReportSectionId,
  COACH_REPORT_NAV_LABELS,
  type CoachReportSectionId,
} from '@/constants/coachReport';

interface CoachReportNavProps {
  /** Sections to show in nav (e.g. omit brief if not yet rendered). Defaults to all. */
  sections?: readonly CoachReportSectionId[];
}

export function CoachReportNav({ sections = COACH_REPORT_SECTION_IDS }: CoachReportNavProps) {
  return (
    <nav
      className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card px-2 py-2 shadow-sm transition-apple"
      aria-label="Report sections"
    >
      {sections.map((key) => (
        <a
          key={key}
          href={`#${getCoachReportSectionId(key)}`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground-secondary hover:bg-muted hover:text-foreground transition-apple"
        >
          {COACH_REPORT_NAV_LABELS[key]}
        </a>
      ))}
    </nav>
  );
}
