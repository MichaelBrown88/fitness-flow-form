import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Users, Plus, X, Mail, Crown } from 'lucide-react';
import type { TeamSetupData, SubscriptionPlan } from '@/types/onboarding';

interface TeamSetupStepProps {
  data?: Partial<TeamSetupData>;
  subscriptionPlan: SubscriptionPlan;
  onNext: (data: TeamSetupData) => void;
  onBack: () => void;
}

export function TeamSetupStep({ data, subscriptionPlan, onNext, onBack }: TeamSetupStepProps) {
  const [emails, setEmails] = useState<string[]>(data?.coachEmails || []);
  const [currentEmail, setCurrentEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const canInviteTeam = subscriptionPlan !== 'starter';

  const handleAddEmail = () => {
    setEmailError(null);
    
    // Validate email
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!currentEmail.trim()) {
      setEmailError('Please enter an email address');
      return;
    }
    if (!emailRegex.test(currentEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (emails.includes(currentEmail.toLowerCase())) {
      setEmailError('This email has already been added');
      return;
    }

    setEmails([...emails, currentEmail.toLowerCase()]);
    setCurrentEmail('');
  };

  const handleRemoveEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleSkip = () => {
    onNext({ coachEmails: [], skipped: true });
  };

  const handleSubmit = () => {
    onNext({ coachEmails: emails, skipped: false });
  };

  // Show upgrade prompt for Starter plan
  if (!canInviteTeam) {
    return (
      <div className="animate-fade-in-up">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Invite your team
          </h1>
          <p className="text-foreground-secondary">
            Team features are available on Professional and Enterprise plans.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-amber-200 bg-amber-50/50 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">
                Upgrade to invite coaches
              </h3>
              <p className="text-sm text-amber-700 mb-4">
                The Professional plan includes unlimited team members, advanced analytics, and more.
              </p>
              <Button
                type="button"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => {
                  // TODO: Open upgrade modal or navigate to pricing
                }}
              >
                View upgrade options
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-border mb-8">
          <p className="text-sm text-foreground-secondary text-center">
            You can always upgrade and invite team members later from your settings.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12 rounded-xl"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleSkip}
            className="flex-1 h-12 gradient-bg text-white rounded-xl font-semibold"
          >
            Continue
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Invite your team
        </h1>
        <p className="text-foreground-secondary">
          Add coaches to your team. They'll receive an email invitation to join.
        </p>
      </div>

      <div className="space-y-6">
        {/* Email input */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Coach email addresses
          </Label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={currentEmail}
              onChange={(e) => setCurrentEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="coach@yourgym.com"
              className={emailError ? 'border-red-500 flex-1' : 'flex-1'}
            />
            <Button
              type="button"
              onClick={handleAddEmail}
              variant="outline"
              className="px-4"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {emailError && (
            <p className="text-xs text-red-500">{emailError}</p>
          )}
        </div>

        {/* Email list */}
        {emails.length > 0 && (
          <div className="space-y-2">
            <Label className="text-foreground-secondary text-sm">
              {emails.length} coach{emails.length !== 1 ? 'es' : ''} to invite
            </Label>
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-foreground-tertiary" />
                    <span className="text-sm">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="text-foreground-tertiary hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {emails.length === 0 && (
          <div className="p-8 rounded-xl border-2 border-dashed border-border text-center">
            <Users className="w-8 h-8 text-foreground-tertiary mx-auto mb-2" />
            <p className="text-foreground-secondary text-sm">
              No coaches added yet. Add email addresses above or skip for now.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12 rounded-xl"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>
          {emails.length === 0 ? (
            <Button
              type="button"
              onClick={handleSkip}
              className="flex-1 h-12 gradient-bg text-white rounded-xl font-semibold"
            >
              Skip for now
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 h-12 gradient-bg text-white rounded-xl font-semibold"
            >
              Send invites & continue
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
