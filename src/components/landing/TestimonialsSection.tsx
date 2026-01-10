import React from 'react';

interface TestimonialsSectionProps {
  children: React.ReactNode;
}

export function TestimonialsSection({ children }: TestimonialsSectionProps) {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900">Coaches <span className="text-red-500">❤️</span> Us</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {children}
        </div>
      </div>
    </section>
  );
}
