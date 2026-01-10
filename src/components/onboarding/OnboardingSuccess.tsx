import { Link } from 'react-router-dom';
import { Check, ArrowRight, FileText, Users, Settings } from 'lucide-react';

interface OnboardingSuccessProps {
  businessName: string;
}

export function OnboardingSuccess({ businessName }: OnboardingSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto text-center animate-fade-in-up py-10">
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200">
          <Check size={48} className="text-white" strokeWidth={4} />
        </div>
        <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
      </div>
      
      <h2 className="text-4xl font-bold text-slate-900 mb-4">Workspace Ready.</h2>
      <p className="text-slate-500 text-lg mb-8">
        We've configured <b>{businessName}</b> with the specific protocols for your facility.
      </p>

      {/* Summary Card */}
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 mb-8 text-left space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <span className="text-slate-500 font-medium">Status</span>
          <span className="font-bold text-emerald-600">✓ Configured</span>
        </div>
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <span className="text-slate-500 font-medium">Onboarding</span>
          <span className="font-bold text-slate-900">Complete</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 font-medium">Next Step</span>
          <span className="font-bold text-indigo-600">Start Assessing</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="w-full space-y-3 mb-8">
        {[
          {
            icon: FileText,
            title: 'Create your first assessment',
            description: 'Start assessing clients with our Clinical Logic Engine',
            link: '/assessment',
          },
          {
            icon: Users,
            title: 'View your dashboard',
            description: 'See all your clients and assessments in one place',
            link: '/dashboard',
          },
          {
            icon: Settings,
            title: 'Customize your settings',
            description: 'Fine-tune your preferences and team settings',
            link: '/settings',
          },
        ].map((item, index) => (
          <Link
            key={item.link}
            to={item.link}
            className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group bg-white/60 backdrop-blur-sm"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors shrink-0">
              <item.icon className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {item.title}
              </p>
              <p className="text-sm text-slate-500">
                {item.description}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors mt-2" />
          </Link>
        ))}
      </div>

      {/* CTA Button */}
      <Link
        to="/dashboard"
        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
      >
        Enter Dashboard
        <ArrowRight size={20} />
      </Link>
    </div>
  );
}
