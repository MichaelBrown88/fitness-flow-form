import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { IdentityData } from '@/types/onboarding';
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
    phone: data?.phone || '',
    password: data?.password || '',
    confirmPassword: data?.confirmPassword || '',
    acceptedTerms: data?.acceptedTerms || false,
  });

  const [error, setError] = useState<string | null>(null);
  
  // Use external error if provided, otherwise use internal error
  const displayError = externalError || error;
  
  // In development, show hint for test emails
  const showTestEmailHint = import.meta.env.DEV && isTestEmail(formData.email);
  const uniqueTestEmail = showTestEmailHint ? makeTestEmailUnique(formData.email) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
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
    <div className="space-y-8 animate-fade-in-up max-w-3xl mx-auto">
      <div>
        <h3 className="text-3xl font-bold text-slate-900 mb-2">First, the basics.</h3>
        <p className="text-slate-500">We'll use this to set up your admin profile.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">First Name</label>
            <input
              type="text"
              required
              className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              placeholder="Jane"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Last Name</label>
            <input
              type="text"
              required
              className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">Work Email</label>
            <input
              type="email"
              required
              className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              placeholder="jane@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            {showTestEmailHint && uniqueTestEmail && (
              <p className="mt-2 text-xs text-slate-500">
                🧪 Test email detected. Will use: <span className="font-mono text-indigo-600">{uniqueTestEmail}</span>
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Phone Number <span className="text-slate-400 font-normal">(For secure login & notifications)</span>
            </label>
            <input
              type="tel"
              required
              className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
            <input
              type="password"
              required
              className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>
        </div>

        {/* Terms and Privacy */}
        <div className="flex items-start space-x-3 pt-2">
          <input
            type="checkbox"
            id="terms"
            checked={formData.acceptedTerms}
            onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
            className="mt-1.5 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <label htmlFor="terms" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
            I agree to the{' '}
            <Link to="/terms" target="_blank" className="text-indigo-600 hover:underline font-medium">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" target="_blank" className="text-indigo-600 hover:underline font-medium">
              Privacy Policy
            </Link>
          </label>
        </div>

        {displayError && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 space-y-2">
            <p>{displayError}</p>
            {displayError.includes('already registered') && (
              <p className="text-xs text-red-600 mt-2">
                Already have an account? <Link to="/login" className="font-medium underline hover:text-red-800">Go to login page</Link>
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="px-8 py-4 rounded-2xl bg-slate-900 text-white font-bold text-lg flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95"
          >
            Continue
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
