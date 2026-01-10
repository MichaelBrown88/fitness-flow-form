import React from 'react';

interface PricingSectionProps {
  children: React.ReactNode;
}

export function PricingSection({ children }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-32 px-6 relative overflow-hidden bg-white">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-6xl bg-gradient-to-r from-blue-50/30 via-indigo-50/30 to-purple-50/30 blur-3xl -z-10"></div>
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-slate-900">Simple, Transparent Pricing</h2>
          <p className="text-slate-500 text-lg">Choose the plan that fits your needs. 14-day free trial on all plans.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {children}
        </div>
      </div>
    </section>
  );
}
