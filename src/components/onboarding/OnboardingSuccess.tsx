/**
 * Onboarding Success / First Assessment Bridge (Step 5)
 *
 * Redesigned with a single dominant CTA ("Assess Your First Client")
 * and a subtle secondary link ("Skip to Dashboard").
 */

import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';

interface OnboardingSuccessProps {
  businessName: string;
}

export function OnboardingSuccess({ businessName }: OnboardingSuccessProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-8 py-4">
      {/* Success icon */}
      <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">You're all set.</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          <strong>{businessName}</strong> is configured and ready. The best way to see
          the platform in action is to run your first assessment.
        </p>
      </div>

      {/* Primary CTA */}
      <Link
        to="/assessment"
        className="w-full max-w-sm h-14 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
      >
        <ClipboardList size={18} />
        Assess Your First Client
        <ArrowRight size={16} />
      </Link>

      {/* Secondary link */}
      <Link
        to="/dashboard"
        className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
      >
        Skip to Dashboard
      </Link>
    </div>
  );
}
