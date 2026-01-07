import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index?: number;
}

export function FeatureCard({ icon: Icon, title, description, index = 0 }: FeatureCardProps) {
  return (
    <div 
      className="group relative p-6 rounded-2xl bg-white border border-border/50 hover:border-indigo-200 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Gradient hover effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-50/0 to-purple-50/0 group-hover:from-indigo-50/50 group-hover:to-purple-50/30 transition-all duration-300" />
      
      <div className="relative">
        {/* Icon */}
        <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-indigo-600" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-foreground-secondary text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

// Features Section wrapper component
interface FeaturesSectionProps {
  children: React.ReactNode;
}

export function FeaturesSection({ children }: FeaturesSectionProps) {
  return (
    <section id="features" className="py-24 bg-gradient-to-b from-white to-slate-50/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything You Need to
            <span className="gradient-text"> Assess Smarter</span>
          </h2>
          <p className="text-foreground-secondary max-w-2xl mx-auto">
            Powerful tools designed specifically for fitness professionals who want to deliver
            exceptional assessments without spending hours on paperwork.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {children}
        </div>
      </div>
    </section>
  );
}

