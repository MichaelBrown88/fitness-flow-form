import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SECTION_META, type SectionId } from './clientReportSections';

export interface ClientReportCollapsibleSectionProps {
  id: SectionId;
  open: boolean;
  onToggle: (id: SectionId) => void;
  sectionRef?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}

export function ClientReportCollapsibleSection({
  id,
  open,
  onToggle,
  sectionRef,
  children,
}: ClientReportCollapsibleSectionProps) {
  const meta = SECTION_META[id];
  return (
    <div ref={sectionRef} data-section-id={id}>
      <Collapsible open={open} onOpenChange={() => onToggle(id)}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between py-2 hover:opacity-80 transition-opacity group text-left"
            aria-expanded={open}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0">
              <div className="sm:p-1.5 md:p-2 sm:bg-muted text-muted-foreground sm:text-foreground sm:rounded-lg shrink-0">
                {meta.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs md:text-sm lg:text-base font-semibold text-foreground">{meta.title}</h3>
                {!open && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta.summary}</p>
                )}
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground shrink-0 ml-3 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>{children}</CollapsibleContent>
      </Collapsible>
    </div>
  );
}
