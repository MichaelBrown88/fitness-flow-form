/**
 * Platform Admin Login
 * 
 * Separate login page for platform administrators.
 * Includes first-time password setup flow.
 */

import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirebaseAuth } from '@/services/firebase';
import { 
  isPlatformAdmin, 
  getPlatformAdminByEmail,
  createPlatformAdmin,
  markPasswordSet,
  updateLastLogin
} from '@/services/platformAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

type LoginStep = 'email' | 'password' | 'set-password' | 'reset-sent';

const PlatformLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminName, setAdminName] = useState('');

  // Step 1: Verify email is a platform admin
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Add timeout to prevent hanging on Firestore queries
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 8000)
      );
      
      const checkAdmin = async () => {
        const isAdmin = await isPlatformAdmin(email.trim().toLowerCase());
        
        if (!isAdmin) {
          return { isAdmin: false, admin: null };
        }

        const admin = await getPlatformAdminByEmail(email.trim().toLowerCase());
        return { isAdmin: true, admin };
      };
      
      const result = await Promise.race([checkAdmin(), timeoutPromise]);
      
      if (!result.isAdmin) {
        setError('This email is not authorized for platform administration.');
        setLoading(false);
        return;
      }

      if (result.admin && result.admin.isPasswordSet) {
        // Existing admin - go to password entry
        setAdminName(result.admin.displayName);
        setStep('password');
      } else {
        // First time - need to set password
        setAdminName(result.admin?.displayName || 'Admin');
        setStep('set-password');
      }
    } catch (err) {
      // If we got a permission error or timeout, proceed to password step
      // The actual auth will happen with Firebase Auth which has its own validation
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError?.code === 'permission-denied' || firebaseError?.message === 'timeout') {
        logger.info('Proceeding to password step (permission denied or timeout)');
        setAdminName('Admin');
        setStep('password');
      } else {
        logger.error('Email verification failed:', undefined, err);
        setError('Unable to verify email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2a: Login with existing password
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      // Update last login (non-blocking - don't fail login if this fails)
      // Note: This may fail due to Firestore rules that restrict client-side writes
      updateLastLogin(userCredential.user.uid).catch((updateErr) => {
        logger.warn('Failed to update last login (non-critical)', 'PLATFORM_LOGIN', updateErr);
      });
      
      logger.info('Platform admin logged in', 'PLATFORM_LOGIN', { email });
      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (message.includes('wrong-password') || message.includes('invalid-credential')) {
        setError('Incorrect password. Please try again.');
      } else if (message.includes('user-not-found')) {
        setError('Account not found. Please set your password first.');
        setStep('set-password');
      } else {
        setError('Login failed. Please try again.');
      }
      logger.error('Platform admin login failed:', undefined, err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2b: Set password for first time
  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      
      try {
        // Try to create the Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        
        // Update the platform admin record (non-blocking - may fail due to Firestore rules)
        // The admin record should already exist from initial platform setup
        Promise.all([
          createPlatformAdmin(userCredential.user.uid, email.trim(), adminName),
          markPasswordSet(userCredential.user.uid)
        ]).catch((updateErr) => {
          logger.warn('Failed to update admin record (non-critical)', 'PLATFORM_LOGIN', updateErr);
        });
        
        logger.info('Platform admin account created', 'PLATFORM_LOGIN', { email });
        navigate('/admin', { replace: true });
      } catch (signUpErr) {
        // If account exists, try to sign in with the provided password
        const firebaseSignUpError = signUpErr as { code?: string };
        if (firebaseSignUpError?.code === 'auth/email-already-in-use') {
          logger.info('Account exists, attempting auto-fix via sign-in', 'PLATFORM_LOGIN');
          try {
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            
            // If sign-in works, it means the password provided is correct!
            // Update records (non-blocking - may fail due to Firestore rules)
            Promise.all([
              createPlatformAdmin(userCredential.user.uid, email.trim(), adminName),
              markPasswordSet(userCredential.user.uid),
              updateLastLogin(userCredential.user.uid)
            ]).catch((updateErr) => {
              logger.warn('Failed to update admin record (non-critical)', 'PLATFORM_LOGIN', updateErr);
            });
            
            logger.info('Platform admin auto-fixed via sign-in', 'PLATFORM_LOGIN', { email });
            navigate('/admin', { replace: true });
          } catch (signInErr) {
            // Sign-in failed (wrong password for existing account)
            setError('Account already exists. Please enter your correct password.');
            setStep('password');
          }
        } else {
          throw signUpErr;
        }
      }
    } catch (err) {
      setError('Unable to create account. Please try again.');
      logger.error('Platform admin account creation failed:', undefined, err);
    } finally {
      setLoading(false);
    }
  };

  // Forgot password
  const handleForgotPassword = async () => {
    setError(null);
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email.trim());
      setStep('reset-sent');
    } catch (err) {
      setError('Unable to send reset email. Please try again.');
      logger.error('Password reset failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 mb-4">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Platform Administration</h1>
          <p className="text-sm text-slate-400 mt-1">FitnessFlow Internal Access</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          
          {/* Step: Email Entry */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@fitnessflow.app"
                    className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {loading ? 'Verifying...' : 'Continue'}
              </Button>
            </form>
          )}

          {/* Step: Password Entry (existing admin) */}
          {step === 'password' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-slate-300">Welcome back, {adminName}</p>
                <p className="text-xs text-slate-500">{email}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-white"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ← Different email
                </button>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          )}

          {/* Step: Set Password (first time) */}
          {step === 'set-password' && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600/20 mb-3">
                  <KeyRound className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="text-slate-300">Welcome, {adminName}!</p>
                <p className="text-xs text-slate-500">Set your password to continue</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-slate-300">Create Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-slate-300">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {loading ? 'Creating account...' : 'Set Password & Continue'}
              </Button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-xs text-slate-400 hover:text-white transition-colors"
              >
                ← Back to email
              </button>
            </form>
          )}

          {/* Step: Reset Email Sent */}
          {step === 'reset-sent' && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600/20 mb-3">
                <Mail className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-300">Reset email sent!</p>
                <p className="text-xs text-slate-500 mt-1">Check {email} for instructions</p>
              </div>
              <Button
                onClick={() => setStep('password')}
                variant="outline"
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Back to login
              </Button>
            </div>
          )}
        </div>

        {/* Back to site */}
        <div className="mt-6 text-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to FitnessFlow
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PlatformLogin;

