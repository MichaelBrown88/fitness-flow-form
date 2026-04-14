/**
 * Full-screen consent gate shown once per device per token on first PWA open.
 * Replaces the previous session-only PrivacyNoticeBanner (Phase 4 in CLAUDE.md).
 *
 * Stores a 'answered' flag in localStorage so the gate only appears once.
 * Persists the actual consent values to Firestore (publicReports/{token}/clientConsent/prefs)
 * so the monthly email function can check them.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { PRODUCT_DISPLAY_NAME } from '@/constants/productBranding';
import { writeClientConsent, getClientConsent } from '@/services/clientConsent';
import { logger } from '@/lib/utils/logger';

interface ClientConsentGateProps {
  token: string;
  coachName?: string | null;
  coachLogoUrl?: string | null;
  /** Called once the gate is dismissed (accepted or declined). */
  onDismissed: () => void;
}

function localKey(token: string) {
  return `${STORAGE_KEYS.CLIENT_CONSENT_STATE_PREFIX}${token}`;
}

function markAnswered(token: string) {
  try {
    localStorage.setItem(localKey(token), 'answered');
  } catch {
    // storage quota — non-critical
  }
}

export function hasAnsweredConsent(token: string): boolean {
  try {
    return localStorage.getItem(localKey(token)) === 'answered';
  } catch {
    return false;
  }
}

export function ClientConsentGate({
  token,
  coachName,
  coachLogoUrl,
  onDismissed,
}: ClientConsentGateProps) {
  const [saving, setSaving] = useState(false);

  // If they've already answered on this device, skip immediately.
  useEffect(() => {
    if (hasAnsweredConsent(token)) {
      onDismissed();
    }
  }, [token, onDismissed]);

  const handleResponse = useCallback(
    async (accept: boolean) => {
      setSaving(true);
      try {
        await writeClientConsent(token, {
          socialSharingConsented: accept,
          monthlyEmailConsented: accept,
        });
      } catch (e) {
        // Non-fatal — dismiss anyway, consent can be retried later
        logger.warn('[ClientConsentGate] Failed to write consent', e);
      } finally {
        markAnswered(token);
        setSaving(false);
        onDismissed();
      }
    },
    [token, onDismissed],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm px-6"
    >
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Coach logo or fallback */}
        {coachLogoUrl ? (
          <img
            src={coachLogoUrl}
            alt={coachName ?? 'Your coach'}
            className="mx-auto h-12 max-w-[180px] object-contain"
          />
        ) : (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <span className="text-lg font-bold text-primary">
              {(coachName ?? 'C')[0].toUpperCase()}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <h1 id="consent-title" className="text-xl font-bold text-foreground">
            Before we show your report
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {coachName ? (
              <>
                <span className="font-medium text-foreground">{coachName}</span> would
                like to:
              </>
            ) : (
              'Your coach would like to:'
            )}
          </p>
        </div>

        <ul className="space-y-3 text-left">
          <li className="flex items-start gap-3 text-sm text-foreground">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              1
            </span>
            <span>
              Send you a <span className="font-medium">monthly progress summary</span> by
              email celebrating your wins
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm text-foreground">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              2
            </span>
            <span>
              Help you{' '}
              <span className="font-medium">share your results on social media</span> —
              your name and scores may appear in shared content
            </span>
          </li>
        </ul>

        <p className="text-xs text-muted-foreground">
          You can change this at any time from your report settings.
        </p>

        <div className="flex flex-col gap-2.5">
          <Button
            className="w-full"
            onClick={() => void handleResponse(true)}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Accept
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => void handleResponse(false)}
            disabled={saving}
          >
            Not now
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/60">
          Powered by {PRODUCT_DISPLAY_NAME}. Your data is private and shared only with
          your coach.
        </p>
      </div>
    </div>
  );
}

/**
 * Hook for managing consent state in the report viewer.
 * Returns whether the consent gate should be shown and a callback to dismiss it.
 */
export function useClientConsent(token: string | undefined) {
  const [showGate, setShowGate] = useState(false);
  const [consentLoaded, setConsentLoaded] = useState(false);

  useEffect(() => {
    if (!token) {
      setConsentLoaded(true);
      return;
    }

    // Fast path: already answered on this device
    if (hasAnsweredConsent(token)) {
      setConsentLoaded(true);
      return;
    }

    // Check Firestore in case they answered on another device
    getClientConsent(token)
      .then((prefs) => {
        if (prefs !== null && prefs.socialSharingConsented !== null) {
          // Already answered elsewhere — mark locally and skip gate
          markAnswered(token);
          setConsentLoaded(true);
        } else {
          setShowGate(true);
          setConsentLoaded(true);
        }
      })
      .catch(() => {
        // Network failure — show gate anyway (will write on answer)
        setShowGate(true);
        setConsentLoaded(true);
      });
  }, [token]);

  const dismiss = useCallback(() => {
    setShowGate(false);
  }, []);

  return { showGate, consentLoaded, dismiss };
}
