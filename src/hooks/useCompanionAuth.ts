/**
 * Hook for Companion authentication and token validation
 * Extracted from Companion.tsx to improve maintainability
 */

import { useState, useEffect, useCallback } from 'react';
import { validateCompanionToken, joinLiveSession } from '@/services/liveSessions';

interface UseCompanionAuthResult {
  isValidating: boolean;
  isAuthorized: boolean;
  errorMsg: string | null;
  runValidation: () => Promise<void>;
}

export function useCompanionAuth(
  sessionId: string | undefined,
  token: string | null,
  mode: 'posture' | 'inbody'
): UseCompanionAuthResult {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runValidation = useCallback(async () => {
    console.log('[COMPANION] Starting validation...', { sessionId, token: token ? '***' : null });
    setIsValidating(true);

    if (!sessionId || !token) {
      console.error('[COMPANION] Missing session info');
      setErrorMsg('Missing Session Info');
      setIsValidating(false);
      return;
    }

    try {
      const [valid] = await Promise.all([
        validateCompanionToken(sessionId, token),
        joinLiveSession(sessionId).catch((err) => console.warn('[COMPANION] Join failed (non-critical):', err)),
      ]);

      setIsAuthorized(valid);
      if (!valid) {
        setErrorMsg('Invalid token. Please scan QR code again.');
      }
    } catch (e) {
      console.error('[COMPANION] Handshake Error:', e);
      setErrorMsg(`Connection Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsValidating(false);
    }
  }, [sessionId, token]);

  useEffect(() => {
    runValidation();
  }, [runValidation]);

  return {
    isValidating,
    isAuthorized,
    errorMsg,
    runValidation,
  };
}

