/**
 * Shared Onboarding Components
 *
 * Reusable UI primitives for the onboarding flow.
 * Kept minimal — no glassmorphism, no hover-scale animations.
 */

import { Check } from 'lucide-react';

/** Standard text input for the onboarding flow */
export const OnboardingInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-sm font-medium placeholder:text-slate-400 ${className}`}
    {...props}
  />
);

/** @deprecated Use OnboardingInput instead. Kept for backward compatibility during migration. */
export const GlassInput = OnboardingInput;

/** Selection card for choosing between options (e.g., business type) */
export const OptionCard = ({
  selected,
  onClick,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) => (
  <div
    onClick={onClick}
    className={`w-full p-4 rounded-xl border-2 cursor-pointer transition-colors relative ${
      selected
        ? 'bg-white border-slate-900 shadow-sm'
        : 'bg-white border-slate-200 hover:border-slate-400'
    }`}
  >
    <div className="flex items-start gap-3">
      {Icon && (
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            selected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Icon size={20} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className={`font-bold text-sm ${selected ? 'text-slate-900' : 'text-slate-700'}`}>
          {title}
        </h4>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{subtitle}</p>}
        {children}
      </div>
      {selected && (
        <div className="w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center text-white shrink-0">
          <Check size={12} strokeWidth={3} />
        </div>
      )}
    </div>
  </div>
);
