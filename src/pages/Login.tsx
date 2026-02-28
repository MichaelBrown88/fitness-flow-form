import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseAuth } from '@/services/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logger } from '@/lib/utils/logger';

const Login = () => {
  const { signIn, loading, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  // Redirect if already logged in - check onboarding status
  useEffect(() => {
    if (!loading && user && profile) {
      // If onboarding is incomplete, redirect to onboarding
      if (!profile.onboardingCompleted) {
        navigate('/onboarding', { replace: true });
        return;
      }
      // Otherwise go to intended destination or dashboard
      navigate(from, { replace: true });
    }
  }, [loading, user, profile, navigate, from]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(false);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      logger.info('Login successful');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to sign in. Please check your details and try again.';
      setError(message);
      logger.error('Login failed:', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err: unknown) {
      setError('Unable to send reset email. Please try again.');
      logger.error('Password reset failed:', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex">
      {/* Left side - Same as signup */}
      <div className="hidden lg:flex flex-1 gradient-bg p-12 flex-col justify-center">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold">OA</span>
            </div>
            <span className="text-white text-xl font-semibold">One Assess</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome back
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Sign in to access your dashboard and manage your fitness assessments.
          </p>
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

          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign in</h2>
            <p className="text-sm text-slate-600 mb-6">
              Sign in to your account to access your dashboard.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                disabled={submitting}
              >
                Forgot password?
              </button>
            </div>
            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {error}
              </div>
            )}
            {resetSent && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Password reset email sent. Check your inbox and follow the link to reset your password.
              </div>
            )}
              <Button
                type="submit"
                className="w-full h-12 bg-slate-900 text-white hover:bg-slate-800"
                disabled={submitting || loading}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
            
            <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/onboarding" className="text-indigo-600 font-medium hover:underline">
              Start your free trial
            </Link>
            </p>
            <p className="mt-2 text-center text-xs text-slate-500">
              <Link to="/" className="text-slate-400 hover:text-slate-600">
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


