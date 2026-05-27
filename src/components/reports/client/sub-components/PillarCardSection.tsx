import React from 'react';
import { cn } from '@/lib/utils';

interface PillarCardSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Subtle in-card panel — slightly darker surface + clear section title.
 */
export function PillarCardSection({ title, children, className }: PillarCardSectionProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-muted/50 px-3.5 py-3 ring-1 ring-border/50 dark:bg-muted/30',
        className,
      )}
    >
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/80">
        {title}
      </p>
      {children}
    </div>
  );
}
