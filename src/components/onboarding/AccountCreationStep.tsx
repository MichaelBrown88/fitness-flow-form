/**
 * Account Creation Step (Final Step)
 *
 * Collects password and terms acceptance. Offers Google/Apple sign-in as alternatives.
 * Account is created here — after the user has seen the full product configuration.
 */

import { useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOnboardingAccountSocial } from '@/hooks/useOnboardingAccountSocial';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { OnboardingInput } from './SharedOnboardingComponents';

interface AccountCreationStepProps {
  email: string;
  onCreateWithPassword: (password: string) => void;
  onCreateWithGoogle: () => void;
  onCreateWithApple: () => void;
  onBack: () => void;
  error?: string | null;
  submitting?: boolean;
}

const PASSWORD_MIN_LENGTH = 6;

function getPasswordStrength(password: string): { label: string; percent: number; color: string } {
  if (password.length === 0) return { label: '', percent: 0, color: 'bg-muted' };
  if (password.length < PASSWORD_MIN_LENGTH) return { label: 'Too short', percent: 20, color: 'bg-red-400' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Weak', percent: 33, color: 'bg-amber-400' };
  if (score <= 3) return { label: 'Good', percent: 66, color: 'bg-emerald-400' };
  return { label: 'Strong', percent: 100, color: 'bg-emerald-600' };
}

export function AccountCreationStep({
  email,
  onCreateWithPassword,
  onCreateWithGoogle,
  onCreateWithApple,
  onBack,
  error,
  submitting,
}: AccountCreationStepProps) {
  const [password, setPassword] = useState('');
  const debouncedPassword = useDebouncedValue(password, 160);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const strength = getPasswordStrength(debouncedPassword);

  const handleSocialSignIn = useOnboardingAccountSocial({
    acceptedTerms,
    setLocalError,
    onCreateWithGoogle,
    onCreateWithApple,
  });
  const displayError = error || localError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password.length < PASSWORD_MIN_LENGTH) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (!acceptedTerms) {
      setLocalError('You must accept the Terms of Service and Privacy Policy.');
      return;
    }

    onCreateWithPassword(password);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Create your account</h2>
        <p className="text-sm text-muted-foreground">
          Almost done! Secure your account for <span className="font-medium text-foreground-secondary">{email}</span>
        </p>
      </div>

      {/* Social sign-in buttons */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => handleSocialSignIn('google')}
          disabled={submitting}
          className="w-full h-12 rounded-xl border border-border bg-background text-sm font-semibold text-foreground-secondary hover:bg-muted/50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => handleSocialSignIn('apple')}
          disabled={submitting}
          className="w-full h-12 rounded-xl border border-border bg-background text-sm font-semibold text-foreground-secondary hover:bg-muted/50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Continue with Apple
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-muted" />
        <span className="text-xs font-medium text-muted-foreground">or use a password</span>
        <div className="flex-1 h-px bg-muted" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-foreground-secondary mb-1.5">Password</label>
          <div className="relative">
            <OnboardingInput
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground-secondary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Minimum 6 characters</p>

          {/* Strength indicator */}
          {debouncedPassword.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${strength.percent}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground w-16 text-right">{strength.label}</span>
            </div>
          )}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            type="checkbox"
            id="terms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-border-medium text-foreground focus:ring-foreground cursor-pointer"
          />
          <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
            I agree to the{' '}
            <Link to="/terms" target="_blank" className="text-foreground underline hover:text-foreground-secondary">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" target="_blank" className="text-foreground underline hover:text-foreground-secondary">
              Privacy Policy
            </Link>
          </label>
        </div>

        {displayError && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
            <p>{displayError}</p>
            {displayError.includes('already registered') && (
              <p className="text-xs mt-1.5">
                Already have an account?{' '}
                <Link to="/login" className="font-medium underline">Go to login</Link>
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-foreground text-white font-bold text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
