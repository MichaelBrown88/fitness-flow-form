import React from 'react';
import SectionHeader from '@/components/landing/SectionHeader';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { LANDING_COPY, LANDING_H2_ACCENT_LIGHT } from '@/constants/landingCopy';

interface TestimonialsSectionProps {
  children: React.ReactNode;
}

export function TestimonialsSection({ children }: TestimonialsSectionProps) {
  const headerRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 0 });
  const gridRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 1 });

  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div ref={headerRef}>
          <SectionHeader
            title={
              <>
                {LANDING_COPY.testimonialsSectionTitleBefore}
                <span className={LANDING_H2_ACCENT_LIGHT}>
                  {LANDING_COPY.testimonialsSectionTitleAccent}
                </span>
              </>
            }
            subtitle="Real results from fitness professionals who switched to One Assess."
          />
        </div>
        
        <div ref={gridRef} className="grid md:grid-cols-3 gap-8">
          {children}
        </div>
      </div>
    </section>
  );
}
