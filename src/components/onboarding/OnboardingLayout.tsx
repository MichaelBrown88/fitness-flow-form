/**
 * Onboarding Layout
 *
 * Full-screen split layout for the onboarding flow.
 * Desktop: 40% left contextual panel + 60% right form panel
 * Mobile: single column with compact header
 *
 * Replaces the previous glassmorphism modal overlay.
 */

import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { OnboardingFlowStepMeta } from '@/types/onboarding';

interface OnboardingLayoutProps {
  /** Progress list (solo omits Team; gym includes all steps). */
  progressSteps: readonly OnboardingFlowStepMeta[];
  /** Index into `progressSteps` for sidebar + bar (0-based). */
  activeProgressIndex: number;
  children: React.ReactNode;
  onBack?: () => void;
  /** Optional contextual content for the left panel (desktop only) */
  leftContent?: React.ReactNode;
}

export function OnboardingLayout({
  progressSteps,
  activeProgressIndex,
  children,
  onBack,
  leftContent,
}: OnboardingLayoutProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    sessionStorage.clear();
    window.location.href = '/';
  };

  const isStepPhase = activeProgressIndex >= 0 && activeProgressIndex < progressSteps.length;
  const progress = isStepPhase ? ((activeProgressIndex + 1) / progressSteps.length) * 100 : 100;

  return (
    <div className="fixed inset-0 z-[100] flex bg-background">
      {/* Left Panel (desktop only) */}
      <div className="hidden lg:flex lg:w-[40%] bg-muted/50 border-r border-border flex-col justify-between p-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
            Set up your account
          </h1>
          {isStepPhase && (
            <p className="text-sm text-muted-foreground">
              Step {activeProgressIndex + 1} of {progressSteps.length} —{' '}
              {progressSteps[activeProgressIndex]?.description}
              <span className="block text-xs text-muted-foreground mt-1">~2 minutes total</span>
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
          {progressSteps.map((step, index) => {
            const isComplete = index < activeProgressIndex;
            const isCurrent = index === activeProgressIndex;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 text-sm ${
                  isCurrent ? 'text-foreground font-bold' :
                  isComplete ? 'text-muted-foreground' : 'text-muted-foreground/60'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isCurrent ? 'bg-foreground text-white' :
                  isComplete ? 'bg-muted-foreground/50 text-background' : 'bg-muted text-muted-foreground'
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
        <div className="shrink-0 px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
            ) : (
              <div className="w-9" />
            )}

            {/* Mobile: step label */}
            {isStepPhase && (
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground lg:hidden">
                Step {activeProgressIndex + 1} / {progressSteps.length}
              </span>
            )}
          </div>

          {user && (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-red-500 transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}
        </div>

        {/* Segmented progress bar */}
        {isStepPhase && (
          <div className="shrink-0 h-1 bg-muted">
            <div
              className="h-full bg-foreground transition-all duration-500 ease-out"
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
