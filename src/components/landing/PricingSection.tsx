import React from 'react';
import SectionHeader from '@/components/landing/SectionHeader';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface PricingSectionProps {
  children: React.ReactNode;
}

export function PricingSection({ children }: PricingSectionProps) {
  const headerRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 0 });
  const gridRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 1 });

  return (
    <section id="pricing" className="py-24 sm:py-32 px-6 relative overflow-hidden bg-white">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-6xl bg-gradient-to-r from-blue-50/30 via-indigo-50/30 to-purple-50/30 blur-3xl -z-10"></div>
      
      <div className="max-w-7xl mx-auto">
        <div ref={headerRef}>
          <SectionHeader
            title={<>Simple, <span className="text-indigo-600">Transparent</span> Pricing</>}
            subtitle="14-day free trial on every plan. No credit card required."
            spacing="mb-16 sm:mb-20"
          />
        </div>

        <div ref={gridRef} className="grid md:grid-cols-3 gap-8 items-start">
          {children}
        </div>
      </div>
    </section>
  );
}
