/**
 * Identity Step (Step 1)
 *
 * Collects: first name, last name, email, password, terms acceptance.
 * Removed: phone, confirmPassword (replaced with visibility toggle).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import type { IdentityData } from '@/types/onboarding';
import { OnboardingInput } from './SharedOnboardingComponents';
import { isTestEmail, makeTestEmailUnique } from '@/lib/utils/testAccountHelper';

interface IdentityStepProps {
  data?: Partial<IdentityData>;
  onNext: (data: IdentityData) => void;
  error?: string | null;
}

export function IdentityStep({ data, onNext, error: externalError }: IdentityStepProps) {
  const [formData, setFormData] = useState<IdentityData>({
    firstName: data?.firstName || '',
    lastName: data?.lastName || '',
    email: data?.email || '',
    password: data?.password || '',
    acceptedTerms: data?.acceptedTerms || false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayError = externalError || error;

  // Dev helper for test emails
  const showTestEmailHint = import.meta.env.DEV && isTestEmail(formData.email);
  const uniqueTestEmail = showTestEmailHint ? makeTestEmailUnique(formData.email) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!formData.acceptedTerms) {
      setError('You must accept the Terms of Service and Privacy Policy.');
      return;
    }

    onNext(formData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h2>
        <p className="text-sm text-slate-500">Get started in under 2 minutes.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">First Name</label>
            <OnboardingInput
              type="text"
              required
              placeholder="Jane"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Last Name</label>
            <OnboardingInput
              type="text"
              required
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Work Email</label>
          <OnboardingInput
            type="email"
            required
            placeholder="jane@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          {showTestEmailHint && uniqueTestEmail && (
            <p className="mt-1.5 text-xs text-slate-400">
              Test mode — will use: <span className="font-mono text-slate-600">{uniqueTestEmail}</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Password</label>
          <div className="relative">
            <OnboardingInput
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="6+ characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            type="checkbox"
            id="terms"
            checked={formData.acceptedTerms}
            onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
            className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
          />
          <label htmlFor="terms" className="text-xs text-slate-500 leading-relaxed cursor-pointer">
            I agree to the{' '}
            <Link to="/terms" target="_blank" className="text-slate-900 underline hover:text-slate-700">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" target="_blank" className="text-slate-900 underline hover:text-slate-700">
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
          className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
        >
          Create Account
        </button>
      </form>
    </div>
  );
}
