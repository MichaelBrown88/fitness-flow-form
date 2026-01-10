import { Quote } from 'lucide-react';

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  index?: number;
}

import { Star } from 'lucide-react';

export function TestimonialCard({ quote, author, role, company, index = 0 }: TestimonialCardProps) {
  // Generate a simple avatar URL or use initials
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&background=6366f1&color=fff&size=128`;
  
  return (
    <div className="backdrop-blur-2xl bg-white/60 border border-white/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white/80 transition-all duration-500 p-8">
      <div className="flex items-center gap-4 mb-6">
        <img src={avatarUrl} alt={author} className="w-12 h-12 rounded-full object-cover" />
        <div>
          <h4 className="font-bold text-slate-900">{author}</h4>
          <p className="text-xs font-bold text-slate-400 uppercase">{role}</p>
        </div>
      </div>
      <div className="flex gap-1 text-amber-400 mb-4">
        {[1,2,3,4,5].map(s => <Star key={s} size={16} fill="currentColor" />)}
      </div>
      <p className="text-slate-600 leading-relaxed font-medium">"{quote}"</p>
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

