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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-5xl bg-gradient-to-r from-slate-50/40 via-indigo-50/25 to-slate-50/40 blur-3xl -z-10" />

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
