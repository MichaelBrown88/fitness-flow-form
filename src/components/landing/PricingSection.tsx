import React from 'react';
import SectionHeader from '@/components/landing/SectionHeader';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { LANDING_COPY, LANDING_H2_ACCENT_LIGHT_READABLE } from '@/constants/landingCopy';

interface PricingSectionProps {
  children: React.ReactNode;
}

export function PricingSection({ children }: PricingSectionProps) {
  const headerRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 0 });
  const gridRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 1 });

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-background px-6 py-20 sm:py-28"
    >
      <div className="absolute left-1/2 top-1/2 -z-10 h-full w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-muted/50 via-gradient-light/25 to-muted/50 blur-3xl dark:from-background-tertiary/40 dark:via-primary/8 dark:to-background-tertiary/40" />

      <div className="max-w-7xl mx-auto">
        <div ref={headerRef}>
          <SectionHeader
            title={
              <>
                Simple,{' '}
                <span className={LANDING_H2_ACCENT_LIGHT_READABLE}>Transparent</span> Pricing
              </>
            }
            subtitle={LANDING_COPY.heroPricingSubtitle}
            subtitleClassName="text-muted-foreground"
            spacing="mb-12 sm:mb-16"
          />
        </div>

        <div ref={gridRef} className="w-full">
          {children}
        </div>
      </div>
    </section>
  );
}
