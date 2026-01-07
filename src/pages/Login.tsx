import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppShell from '@/components/layout/AppShell';

const Login = () => {
  const { signIn, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || '/';

  if (!loading && user) {
    // Already logged in – send to main app
    navigate(from, { replace: true });
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to sign in. Please check your details and try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Coach login</h2>
          <p className="mt-1 text-sm text-slate-600">
            Sign in with your One Fitness coach account to access assessments and reports.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || loading}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-xs text-slate-500">
            Coach accounts are managed in the One Fitness admin. If you need access, please contact
            your admin.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            <Link to="/" className="text-slate-600 underline">
              Back to assessment
            </Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default Login;


