/**
 * Platform Setup (One-time use)
 * 
 * This page seeds the initial platform administrator.
 * It will only work if no platform admin exists yet.
 * After setup, this page becomes inaccessible.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { seedPlatformAdminOnce, isPlatformAdminSeeded } from '@/lib/setup/seedPlatformAdmin';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const PlatformSetup = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'ready' | 'seeded' | 'error'>('checking');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const seeded = await isPlatformAdminSeeded();
      if (seeded) {
        setStatus('seeded');
        setMessage('Platform admin already exists. Redirecting to login...');
        setTimeout(() => navigate('/admin/login'), 2000);
      } else {
        setStatus('ready');
      }
    };
    checkStatus();
  }, [navigate]);

  const handleSeed = async () => {
    setLoading(true);
    const result = await seedPlatformAdminOnce();
    setLoading(false);
    
    if (result.success) {
      setStatus('seeded');
      setMessage(result.message);
      setTimeout(() => navigate('/admin/login'), 2000);
    } else {
      setStatus('error');
      setMessage(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-foreground/90 border border-border mb-4">
            <Shield className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Platform Setup</h1>
          <p className="text-sm text-muted-foreground mt-2">One-time initialization</p>
        </div>

        {/* Card */}
        <div className="bg-foreground border border-border rounded-2xl p-8">
          {status === 'checking' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-muted-foreground">Checking setup status...</p>
            </div>
          )}

          {status === 'ready' && (
            <div className="space-y-6">
              <div className="text-left space-y-4">
                <h2 className="text-lg font-semibold text-white">Initialize Platform</h2>
                <p className="text-sm text-muted-foreground">
                  This will create the platform administrator account for:
                </p>
                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                  <p className="text-white font-medium">michael@one-assess.com</p>
                  <p className="text-xs text-muted-foreground mt-1">Michael Brown - Platform Owner</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  After setup, you'll be prompted to set your password on first login.
                </p>
              </div>

              <Button
                onClick={handleSeed}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Initialize Platform Admin'
                )}
              </Button>
            </div>
          )}

          {status === 'seeded' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-600/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-medium">Setup Complete!</p>
                <p className="text-sm text-muted-foreground mt-1">{message}</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <p className="text-white font-medium">Setup Failed</p>
                <p className="text-sm text-red-400 mt-1">{message}</p>
              </div>
              <Button
                onClick={() => setStatus('ready')}
                variant="outline"
                className="mt-2 border-border text-muted-foreground/60"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformSetup;

