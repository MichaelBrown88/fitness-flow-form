import React from 'react';
import SectionHeader from '@/components/landing/SectionHeader';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { LANDING_COPY, LANDING_H2_ACCENT_LIGHT } from '@/constants/landingCopy';

interface PricingSectionProps {
  children: React.ReactNode;
}

export function PricingSection({ children }: PricingSectionProps) {
  const headerRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 0 });
  const gridRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 1 });

  return (
    <section id="pricing" className="py-20 sm:py-28 px-6 relative overflow-hidden bg-white">
      <div className="absolute left-1/2 top-1/2 -z-10 h-full w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-slate-100/50 via-gradient-light/25 to-slate-100/50 blur-3xl" />

      <div className="max-w-7xl mx-auto">
        <div ref={headerRef}>
          <SectionHeader
            title={
              <>
                Simple,{' '}
                <span className={LANDING_H2_ACCENT_LIGHT}>Transparent</span> Pricing
              </>
            }
            subtitle={LANDING_COPY.heroPricingSubtitle}
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
