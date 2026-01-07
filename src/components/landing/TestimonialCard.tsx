import { Quote } from 'lucide-react';

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  index?: number;
}

export function TestimonialCard({ quote, author, role, company, index = 0 }: TestimonialCardProps) {
  return (
    <div 
      className="relative p-6 rounded-2xl glass-card animate-fade-in-up"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <Quote className="w-8 h-8 text-indigo-200 mb-4" />
      <blockquote className="text-foreground mb-6 leading-relaxed">
        "{quote}"
      </blockquote>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold">
          {author.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{author}</p>
          <p className="text-foreground-tertiary text-xs">{role}, {company}</p>
        </div>
      </div>
    </div>
  );
}

// Testimonials Section wrapper
interface TestimonialsSectionProps {
  children: React.ReactNode;
}

export function TestimonialsSection({ children }: TestimonialsSectionProps) {
  return (
    <section id="testimonials" className="py-24 bg-gradient-to-b from-slate-50/50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Loved by Fitness
            <span className="gradient-text"> Professionals</span>
          </h2>
          <p className="text-foreground-secondary max-w-2xl mx-auto">
            See what coaches and gym owners are saying about transforming their assessment process.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {children}
        </div>
      </div>
    </section>
  );
}

