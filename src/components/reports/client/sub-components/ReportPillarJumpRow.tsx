import React from 'react';
import { SECTION_IDS, SECTION_META, type SectionId } from '../clientReportSections';
import { cn } from '@/lib/utils';

interface ReportPillarJumpRowProps {
  /** Section ids that have content (omit missing pillars). */
  activeSectionIds: SectionId[];
  className?: string;
}

function scrollToSection(id: SectionId) {
  const el = document.querySelector(`[data-section-id="${id}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Sticky horizontal pillar jump chips — scrolls to in-page section anchors.
 */
export function ReportPillarJumpRow({ activeSectionIds, className }: ReportPillarJumpRowProps) {
  const ids = SECTION_IDS.filter((id) => activeSectionIds.includes(id));
  if (ids.length === 0) return null;

  return (
    <nav
      aria-label="Jump to pillar"
      className={cn(
        'sticky top-0 z-20 -mx-1 border-b border-border/60 bg-background/95 px-1 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80',
        className,
      )}
    >
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {ids.map((id) => {
          const meta = SECTION_META[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <span className="text-muted-foreground">{meta.icon}</span>
              {meta.shortTitle}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
