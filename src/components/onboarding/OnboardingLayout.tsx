import { ONBOARDING_STEPS } from '@/types/onboarding';
import { X, ArrowLeft, ChevronRight, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingLayoutProps {
  currentStep: number;
  children: React.ReactNode;
  onBack?: () => void;
}

const GlassPanel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] ${className}`}>
    {children}
  </div>
);

export function OnboardingLayout({ currentStep, children, onBack }: OnboardingLayoutProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const handleClose = async () => {
    if (confirm('Are you sure you want to leave? Your progress will be saved.')) {
      // If user is stuck (has account but incomplete onboarding), offer sign out
      if (user) {
        const wantsSignOut = confirm('You are currently logged in. Would you like to sign out instead?');
        if (wantsSignOut) {
          await signOut();
          // Clear all storage
          localStorage.clear();
          sessionStorage.clear();
          navigate('/', { replace: true });
          return;
        }
      }
      navigate('/dashboard');
    }
  };

  const handleSignOut = async () => {
    if (confirm('Sign out and clear all data? You can start fresh with a new account.')) {
      await signOut();
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      {/* Landing page visible in background with blur overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-700" />

      {/* Main Modal - 25% smaller */}
      <GlassPanel className={`w-full max-w-4xl h-full md:h-[67.5vh] rounded-[2.5rem] relative overflow-hidden flex flex-col transition-all duration-500 ${isAnimating ? 'opacity-50 scale-[0.99]' : 'opacity-100 scale-100'}`}>
        
        {/* Background Decor */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl -z-10" />

        {/* Header */}
        <div className="px-8 py-6 md:py-8 flex justify-between items-center z-20 border-b border-white/50">
          {currentStep >= 0 && onBack ? (
            <button 
              onClick={onBack} 
              className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 text-slate-500 transition-colors shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
          ) : <div className="w-10"></div>}
          
          {/* Progress Dots */}
          {currentStep >= 0 && currentStep < ONBOARDING_STEPS.length && (
            <div className="flex gap-2">
              {ONBOARDING_STEPS.map((_, index) => (
                <div 
                  key={index} 
                  className={`h-1.5 rounded-full transition-all duration-700 ease-out ${
                    index === currentStep ? 'w-8 bg-indigo-600' : 
                    index < currentStep ? 'w-2 bg-indigo-200' : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>
          )}
          {currentStep < 0 && <div className="flex gap-2"><div className="w-0"></div></div>}
          {currentStep >= ONBOARDING_STEPS.length && <div className="flex gap-2"><div className="w-0"></div></div>}

          <div className="flex items-center gap-2">
            {/* Sign Out button (only show if user is logged in) */}
            {user && (
              <button
                onClick={handleSignOut}
                className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 transition-colors shadow-sm"
                title="Sign out and start fresh"
              >
                <LogOut size={18} />
              </button>
            )}
            <button 
              onClick={handleClose} 
              className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 text-slate-500 transition-colors shadow-sm"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto px-6 md:px-12 py-6 md:py-8 relative z-10">
          {children}
        </div>
      </GlassPanel>
    </div>
  );
}
