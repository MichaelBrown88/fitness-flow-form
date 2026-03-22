import type { CSSProperties } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/landing/SectionHeader';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  items: FAQItem[];
}

export function FAQSection({ items }: FAQSectionProps) {
  const headerRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 0 });
  const listRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 1 });

  return (
    <section id="faq" className="py-24 sm:py-32 px-6 max-w-3xl mx-auto">
      <div ref={headerRef}>
        <SectionHeader
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about getting started."
        />
      </div>
      <div ref={listRef}>
        <Accordion type="single" collapsible className="w-full space-y-4">
          {items.map((item, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="border-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` } satisfies CSSProperties}
            >
              <GlassCard className="overflow-hidden bg-white/60">
                <AccordionTrigger className="px-6 py-5 text-left text-lg font-bold text-slate-800 hover:no-underline hover:text-indigo-600 data-[state=open]:text-indigo-600 [&[data-state=open]>svg]:rotate-90">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base text-slate-600 leading-relaxed font-medium px-6 pb-6 pt-0">
                  {item.answer}
                </AccordionContent>
              </GlassCard>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
