/**
 * Onboarding Success / First Assessment Bridge (Step 5)
 *
 * Primary CTA runs the coach through their own assessment (PAR-Q required),
 * matching the client experience.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { writePrefillClientPayload } from '@/lib/assessment/assessmentSessionStorage';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';

interface OnboardingSuccessProps {
  businessName: string;
}

export function OnboardingSuccess({ businessName }: OnboardingSuccessProps) {
  const { user, profile } = useAuth();
  const selfName = (profile?.displayName || user?.displayName || 'Me').trim() || 'Me';

  const handleSelfFirstAssessment = () => {
    writePrefillClientPayload({ fullName: selfName });
    window.location.assign(ROUTES.ASSESSMENT);
  };

  return (
    <div className="flex flex-col items-center text-center space-y-8 py-4">
      <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">You&apos;re all set.</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          <strong>{businessName}</strong> is configured and ready. {ASSESSMENT_COPY.FIRST_CLIENT_SELF_DESC}
        </p>
      </div>

      <button
        type="button"
        onClick={handleSelfFirstAssessment}
        className="w-full max-w-sm h-14 bg-foreground text-background rounded-xl font-bold text-sm hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 shadow-lg"
      >
        <ClipboardList size={18} />
        {ASSESSMENT_COPY.FIRST_CLIENT_SELF_TITLE}
        <ArrowRight size={16} />
      </button>

      <Link
        to="/dashboard"
        className="text-xs font-medium text-muted-foreground hover:text-foreground-secondary transition-colors"
      >
        Skip to Dashboard
      </Link>
    </div>
  );
}
