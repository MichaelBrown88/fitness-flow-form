import React from 'react';
import { GraduationCap, User, Activity } from 'lucide-react';

const GlassCard = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-2xl bg-white/60 border border-white/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white/80 transition-all duration-500 ${className}`}>
    {children}
  </div>
);

export function BuiltByExperts() {
  const experts = [
    {
      icon: GraduationCap,
      title: 'Biomechanist',
      description: 'Expert in human movement science, ensuring every measurement and analysis is grounded in validated biomechanical principles.',
      color: 'blue',
    },
    {
      icon: User,
      title: 'Doctor of Physiology',
      description: 'Medical expertise ensures our assessments respect physiological limits and provide safe, evidence-based recommendations.',
      color: 'indigo',
    },
    {
      icon: Activity,
      title: 'Elite Strength & Conditioning Coach',
      description: 'Real-world coaching experience ensures the platform delivers practical, actionable insights that actually work in the gym.',
      color: 'emerald',
    },
  ];

  return (
    <section className="py-24 px-6 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[30%] left-[-10%] w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] right-[-10%] w-96 h-96 bg-blue-100/30 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-4 shadow-sm">
            Credibility
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">
            Built by <span className="text-indigo-600">Industry Professionals</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            FitnessFlow isn't built by software engineers alone. Our Clinical Logic Engine is validated and refined by leading experts in biomechanics, exercise physiology, and high-performance coaching.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {experts.map((expert, index) => {
            const Icon = expert.icon;
            const colorClasses = {
              blue: 'bg-blue-50 text-blue-600 border-blue-100',
              indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
              emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            };
            
            return (
              <GlassCard key={index} className="p-8 h-full flex flex-col">
                <div className={`w-16 h-16 rounded-2xl ${colorClasses[expert.color as keyof typeof colorClasses]} border-2 flex items-center justify-center mb-6 shadow-sm`}>
                  <Icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{expert.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed flex-grow">
                  {expert.description}
                </p>
              </GlassCard>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-500 text-sm max-w-2xl mx-auto">
            This combination of scientific rigor and practical coaching experience ensures FitnessFlow delivers assessments you can trust, recommendations that work, and reports that give your clients confidence in your expertise.
          </p>
        </div>
      </div>
    </section>
  );
}
