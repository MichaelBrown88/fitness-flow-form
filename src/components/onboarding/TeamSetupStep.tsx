import { useState } from 'react';
import { ArrowRight, ArrowLeft, Users, Plus, X, Mail, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // All plans can add coaches now - at least one coach is required
  const canInviteTeam = true;

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

  const handleSubmit = () => {
    if (emails.length === 0) {
      setEmailError('You must add at least one coach to continue. If you are also a coach, add your own email.');
      return;
    }
    onNext({ coachEmails: emails, skipped: false });
  };

  // Note: canInviteTeam is now always true, but keeping this for future plan restrictions if needed
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
            onClick={handleSubmit}
            disabled={emails.length === 0}
            className="flex-1 h-12 gradient-bg text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up max-w-4xl mx-auto">
      <div>
        <h3 className="text-3xl font-bold text-slate-900 mb-2">Add your coaches</h3>
        <p className="text-slate-500 mb-1">You must add at least one coach to continue.</p>
        <p className="text-sm text-slate-400">If you are also a coach, add your own email address. Coaches will receive an invitation link to join your organization.</p>
      </div>

      <div className="space-y-6">
        {/* Email input */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700 mb-2">Coach email addresses</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={currentEmail}
              onChange={(e) => setCurrentEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="coach@yourgym.com"
              className={`flex-1 px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium ${emailError ? 'border-red-500' : ''}`}
            />
            <button
              type="button"
              onClick={handleAddEmail}
              className="px-6 py-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-all font-medium"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {emailError && (
            <p className="text-xs text-red-500 mt-1">{emailError}</p>
          )}
        </div>

        {/* Email list */}
        {emails.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              {emails.length} coach{emails.length !== 1 ? 'es' : ''} to invite
            </label>
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-900">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {emails.length === 0 && (
          <div className="p-8 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 text-center">
            <Users className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-amber-700 text-sm font-bold mb-1">
              At least one coach is required
            </p>
            <p className="text-amber-600 text-xs font-medium">
              Add email addresses above. If you are also a coach, add your own email.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-white/50 mt-8">
          <button
            type="button"
            onClick={onBack}
            className="px-8 py-4 rounded-2xl bg-white border border-slate-200 font-bold text-lg flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={emails.length === 0}
            className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-2 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 ${
              emails.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            Continue
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
