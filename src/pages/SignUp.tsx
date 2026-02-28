import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { logger } from '@/lib/utils/logger';
import { ArrowRight, Check } from 'lucide-react';

export default function SignUp() {
  const { signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setSubmitting(false);
      return;
    }

    if (!acceptedTerms) {
      setError('You must accept the Terms of Service.');
      setSubmitting(false);
      return;
    }

    try {
      await signUp(email.trim(), password, fullName.trim());
      logger.info('User signed up successfully, redirecting to onboarding.');
      navigate('/onboarding', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to sign up. Please check your details and try again.';
      setError(message);
      logger.error('Signup failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const benefits = [
    'AI-powered posture analysis',
    'Automated client reports',
    'Progress tracking & analytics',
    '14-day free trial, no credit card',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex">
      {/* Left side - Benefits */}
      <div className="hidden lg:flex flex-1 gradient-bg p-12 flex-col justify-center">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold">OA</span>
            </div>
            <span className="text-white text-xl font-semibold">One Assess</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Transform your fitness assessments
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Join hundreds of coaches and gyms using AI-powered assessments to deliver professional results in minutes.
          </p>

          <div className="space-y-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-white">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white font-bold">OA</span>
            </div>
            <span className="text-xl font-semibold">One Assess</span>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Create your account
            </h2>
            <p className="text-foreground-secondary">
              Start your free 14-day trial. No credit card required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@yourgym.com"
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12"
              />
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-foreground-secondary leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" className="text-indigo-600 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-indigo-600 hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-slate-900 text-white hover:bg-slate-800"
              disabled={submitting || loading}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-foreground-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
