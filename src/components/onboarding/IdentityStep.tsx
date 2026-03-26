/**
 * Identity Step (Step 0)
 *
 * Collects: first name, last name, email only.
 * Password and terms are collected at the final Account Creation step.
 */

import { useState } from 'react';
import type { IdentityData } from '@/types/onboarding';
import { OnboardingInput } from './SharedOnboardingComponents';
import { isTestEmail, makeTestEmailUnique } from '@/lib/utils/testAccountHelper';

interface IdentityStepProps {
  data?: Partial<IdentityData>;
  onNext: (data: Pick<IdentityData, 'firstName' | 'lastName' | 'email'>) => void;
  error?: string | null;
}

export function IdentityStep({ data, onNext, error: externalError }: IdentityStepProps) {
  const [firstName, setFirstName] = useState(data?.firstName || '');
  const [lastName, setLastName] = useState(data?.lastName || '');
  const [email, setEmail] = useState(data?.email || '');
  const [error, setError] = useState<string | null>(null);

  const displayError = externalError || error;

  const showTestEmailHint = import.meta.env.DEV && isTestEmail(email);
  const uniqueTestEmail = showTestEmailHint ? makeTestEmailUnique(email) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    onNext({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Let's get started</h2>
        <p className="text-sm text-muted-foreground">Tell us a bit about yourself. Takes about 2 minutes.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground-secondary mb-1.5">First Name</label>
            <OnboardingInput
              type="text"
              required
              placeholder="Jane"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground-secondary mb-1.5">Last Name</label>
            <OnboardingInput
              type="text"
              required
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground-secondary mb-1.5">Work Email</label>
          <OnboardingInput
            type="email"
            required
            placeholder="jane@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {showTestEmailHint && uniqueTestEmail && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Test mode — will use: <span className="font-mono text-foreground-secondary">{uniqueTestEmail}</span>
            </p>
          )}
        </div>

        {displayError && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
            <p>{displayError}</p>
          </div>
        )}

        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-foreground text-white font-bold text-sm hover:bg-foreground/90 transition-colors"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
