/**
 * Client Portal Login
 * 
 * Magic link authentication for clients.
 * Air-gapped from coach/admin login — dedicated component.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ClientLogin() {
  const { sendClientMagicLink, user, profile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in as client, redirect to portal
  if (user && profile?.role === 'client') {
    navigate('/portal', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await sendClientMagicLink(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send login link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              FF
            </div>
            <span className="text-xl font-bold text-slate-900">FitnessFlow</span>
          </div>
          <p className="text-sm text-slate-500">Client Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-6">
          {sent ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Check your email</h2>
              <p className="text-sm text-slate-500 mb-1">
                We sent a login link to
              </p>
              <p className="text-sm font-medium text-slate-700 mb-6">{email}</p>
              <p className="text-xs text-slate-400">
                Click the link in your email to access your portal. The link expires in 1 hour.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-4 text-xs text-slate-500"
              >
                Use a different email
              </Button>
            </div>
          ) : (
            /* Login form */
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-5 h-5 text-violet-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Sign in to your portal</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter your email and we&apos;ll send you a login link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="h-11 rounded-xl"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500"
                >
                  {loading ? 'Sending...' : 'Send login link'}
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to FitnessFlow
          </button>
        </div>
      </div>
    </div>
  );
}
