import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Sparkles, FileText, Users, Settings } from 'lucide-react';

interface OnboardingSuccessProps {
  businessName: string;
}

export function OnboardingSuccess({ businessName }: OnboardingSuccessProps) {
  return (
    <div className="animate-fade-in-up text-center">
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold text-foreground mb-3">
        You're all set! 🎉
      </h1>
      <p className="text-foreground-secondary text-lg mb-8">
        Welcome to FitnessFlow, <span className="font-semibold">{businessName}</span>!
      </p>

      {/* Next steps */}
      <div className="text-left space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-foreground text-center">
          Here's what you can do next:
        </h2>
        <div className="space-y-3">
          {[
            {
              icon: FileText,
              title: 'Create your first assessment',
              description: 'Start assessing clients with our AI-powered tools',
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
              className="flex items-start gap-4 p-4 rounded-xl border border-border hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                <item.icon className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </p>
                <p className="text-sm text-foreground-secondary">
                  {item.description}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-foreground-tertiary group-hover:text-indigo-600 transition-colors mt-2" />
            </Link>
          ))}
        </div>
      </div>

      {/* Pro tip */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-indigo-600">Pro tip</span>
        </div>
        <p className="text-sm text-foreground-secondary">
          Check out our{' '}
          <a href="/help" className="text-indigo-600 hover:underline">
            quick start guide
          </a>{' '}
          to make the most of your first assessment.
        </p>
      </div>

      {/* Primary CTA */}
      <Button
        asChild
        className="w-full h-14 gradient-bg text-white rounded-xl text-lg font-semibold"
      >
        <Link to="/dashboard">
          Go to Dashboard
          <ArrowRight className="ml-2 w-5 h-5" />
        </Link>
      </Button>
    </div>
  );
}
