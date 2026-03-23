import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseAuth } from '@/services/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logger } from '@/lib/utils/logger';
import { mapFirebaseAuthError } from '@/lib/utils/mapFirebaseAuthError';
import { ROUTES } from '@/constants/routes';
import { Seo } from '@/components/seo/Seo';
import { SEO_NOINDEX_FUNNEL } from '@/constants/seo';

const Login = () => {
  const { signIn, signInWithGoogle, signInWithApple, loading, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || ROUTES.DASHBOARD;

  useEffect(() => {
    if (!loading && user && profile) {
      if (!profile.onboardingCompleted) {
        navigate(ROUTES.ONBOARDING, { replace: true });
        return;
      }
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
      setError(mapFirebaseAuthError(err, 'Unable to sign in. Please check your details and try again.'));
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

  const handleSocialSignIn = async (provider: 'google' | 'apple') => {
    setError(null);
    setSubmitting(true);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithApple();
      logger.info(`${provider} sign-in successful`);
    } catch (err: unknown) {
      setError(
        mapFirebaseAuthError(err, `${provider === 'google' ? 'Google' : 'Apple'} sign-in failed. Try again.`),
      );
      logger.error(`${provider} sign-in failed:`, err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex">
      <Seo
        pathname={ROUTES.LOGIN}
        title={SEO_NOINDEX_FUNNEL.title}
        description={SEO_NOINDEX_FUNNEL.description}
        noindex
      />
      {/* Left side */}
      <div className="hidden lg:flex flex-1 gradient-bg p-12 flex-col justify-center">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold">OA</span>
            </div>
            <span className="text-white text-xl font-semibold">One Assess</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Welcome back</h1>
          <p className="text-white/80 text-lg mb-8">
            Sign in to access your dashboard and manage your fitness assessments.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
          <p className="mb-4 text-center lg:text-left">
            <Link
              to={ROUTES.HOME}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline"
            >
              ← Back to website
            </Link>
          </p>
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

            {/* Social sign-in buttons */}
            <div className="space-y-2.5 mb-5">
              <button
                type="button"
                onClick={() => handleSocialSignIn('google')}
                disabled={submitting}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
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
                className="w-full h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-primary transition-colors hover:opacity-80"
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
                {submitting ? 'Signing in\u2026' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to={ROUTES.ONBOARDING} className="font-medium text-primary hover:underline">
                Start your free trial
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
