import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
  return (
    <section id="faq" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Frequently Asked
            <span className="gradient-text"> Questions</span>
          </h2>
          <p className="text-foreground-secondary max-w-2xl mx-auto">
            Everything you need to know about FitnessFlow. Can't find what you're looking for?
            Contact our support team.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <FAQAccordion items={items} />
        </div>
      </div>
    </section>
  );
}

