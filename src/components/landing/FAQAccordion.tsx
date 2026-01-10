import React from 'react';
import { ChevronRight } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item, index) => (
        <AccordionItem 
          key={index} 
          value={`item-${index}`}
          className="border-b border-border/50 animate-fade-in-up"
          style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
        >
          <AccordionTrigger className="text-left font-semibold text-foreground hover:text-indigo-600 py-5">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-foreground-secondary pb-5 leading-relaxed">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// FAQ Section wrapper
interface FAQSectionProps {
  items: FAQItem[];
}

export function FAQSection({ items }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const GlassCard: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
    <div className={`backdrop-blur-2xl bg-white/60 border border-white/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white/80 transition-all duration-500 ${className}`}>
      {children}
    </div>
  );

  return (
    <section id="faq" className="py-32 px-6 max-w-3xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
      </div>
      <div className="space-y-4">
        {items.map((faq, i) => (
          <GlassCard key={i} className="overflow-hidden bg-white/60">
            <button 
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex justify-between items-center p-6 text-left"
            >
              <span className="font-bold text-lg text-slate-800">{faq.question}</span>
              <ChevronRight className={`transition-transform duration-300 ${openIndex === i ? 'rotate-90 text-indigo-600' : 'text-slate-400'}`} />
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${openIndex === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
              <p className="px-6 pb-6 text-slate-600 leading-relaxed font-medium">
                {faq.answer}
              </p>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}

