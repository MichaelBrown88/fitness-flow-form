/**
 * Onboarding Layout
 *
 * Full-screen split layout for the onboarding flow.
 * Desktop: 40% left contextual panel + 60% right form panel
 * Mobile: single column with compact header
 *
 * Replaces the previous glassmorphism modal overlay.
 */

import { ONBOARDING_STEPS } from '@/types/onboarding';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingLayoutProps {
  currentStep: number;
  children: React.ReactNode;
  onBack?: () => void;
  /** Optional contextual content for the left panel (desktop only) */
  leftContent?: React.ReactNode;
}

export function OnboardingLayout({ currentStep, children, onBack, leftContent }: OnboardingLayoutProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    sessionStorage.clear();
    window.location.href = '/';
  };

  const isStepPhase = currentStep >= 0 && currentStep < ONBOARDING_STEPS.length;
  const progress = isStepPhase ? ((currentStep + 1) / ONBOARDING_STEPS.length) * 100 : 100;

  return (
    <div className="fixed inset-0 z-[100] flex bg-white">
      {/* Left Panel (desktop only) */}
      <div className="hidden lg:flex lg:w-[40%] bg-slate-50 border-r border-slate-200 flex-col justify-between p-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
            Set up your account
          </h1>
          {isStepPhase && (
            <p className="text-sm text-slate-500">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length} — {ONBOARDING_STEPS[currentStep].description}
              <span className="block text-xs text-slate-400 mt-1">~2 minutes total</span>
            </p>
          )}
        </div>

        {/* Contextual content from parent */}
        {leftContent && (
          <div className="flex-1 flex items-center justify-center py-8">
            {leftContent}
          </div>
        )}

        {/* Step list */}
        <div className="space-y-3">
          {ONBOARDING_STEPS.map((step, index) => {
            const isComplete = index < currentStep;
            const isCurrent = index === currentStep;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 text-sm ${
                  isCurrent ? 'text-slate-900 font-bold' :
                  isComplete ? 'text-slate-400' : 'text-slate-300'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isCurrent ? 'bg-slate-900 text-white' :
                  isComplete ? 'bg-slate-300 text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  {isComplete ? '✓' : index + 1}
                </div>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel (form area) */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top bar */}
        <div className="shrink-0 px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
            ) : (
              <div className="w-9" />
            )}

            {/* Mobile: step label */}
            {isStepPhase && (
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 lg:hidden">
                Step {currentStep + 1} / {ONBOARDING_STEPS.length}
              </span>
            )}
          </div>

          {user && (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}
        </div>

        {/* Segmented progress bar */}
        {isStepPhase && (
          <div className="shrink-0 h-1 bg-slate-100">
            <div
              className="h-full bg-slate-900 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
