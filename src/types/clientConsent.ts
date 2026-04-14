import type { Timestamp } from 'firebase/firestore';

/**
 * Stored at publicReports/{token}/clientConsent/prefs
 * Token IS the credential — anyone holding it can read/write their own consent.
 */
export interface ClientConsentPrefs {
  /** Client explicitly approved social sharing of their named results. null = not yet asked. */
  socialSharingConsented: boolean | null;
  /** Client approved receiving monthly progress emails. null = not yet asked. */
  monthlyEmailConsented: boolean | null;
  /** When consent was first given/declined. */
  consentGivenAt: Timestamp | null;
  /** When consent was last updated (toggle on/off after initial answer). */
  consentUpdatedAt: Timestamp | null;
}
