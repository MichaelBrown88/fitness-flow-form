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
  const [monthlyEmail, setMonthlyEmail] = useState(true);
  const [socialSharing, setSocialSharing] = useState(true);

  // If they've already answered on this device, skip immediately.
  useEffect(() => {
    if (hasAnsweredConsent(token)) {
      onDismissed();
    }
  }, [token, onDismissed]);

  const persistAndDismiss = useCallback(
    async (prefs: { monthlyEmailConsented: boolean; socialSharingConsented: boolean }) => {
      setSaving(true);
      try {
        await writeClientConsent(token, prefs);
      } catch (e) {
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
      aria-modal="false"
      aria-labelledby="consent-title"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-[60] flex justify-center px-3 pb-2"
    >
      <div className="pointer-events-auto w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl">
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

        <div className="space-y-1 text-left">
          <h2 id="consent-title" className="text-base font-bold text-foreground">
            Stay in the loop?
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {coachName ? (
              <>
                Optional updates from{' '}
                <span className="font-medium text-foreground">{coachName}</span>. Your report
                stays visible while you choose.
              </>
            ) : (
              'Optional updates from your coach. Your report stays visible while you choose.'
            )}
          </p>
        </div>

        <div className="space-y-3 text-left">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border"
              checked={monthlyEmail}
              onChange={(e) => setMonthlyEmail(e.target.checked)}
            />
            <span>
              <span className="font-medium">Monthly progress email</span>
              <span className="block text-xs text-muted-foreground">
                A short summary celebrating wins
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border"
              checked={socialSharing}
              onChange={(e) => setSocialSharing(e.target.checked)}
            />
            <span>
              <span className="font-medium">Share-friendly cards</span>
              <span className="block text-xs text-muted-foreground">
                Your name and scores may appear when you share
              </span>
            </span>
          </label>
        </div>

        <p className="text-xs text-muted-foreground text-left">
          Change anytime from your profile → Privacy &amp; sharing.
        </p>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() =>
              void persistAndDismiss({
                monthlyEmailConsented: monthlyEmail,
                socialSharingConsented: socialSharing,
              })
            }
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Save preferences
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() =>
              void persistAndDismiss({
                monthlyEmailConsented: false,
                socialSharingConsented: false,
              })
            }
            disabled={saving}
          >
            Just show my report
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/60 text-center">
          Powered by {PRODUCT_DISPLAY_NAME}
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
