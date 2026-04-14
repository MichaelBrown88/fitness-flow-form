/**
 * Client sharing + email consent — stored at publicReports/{token}/clientConsent/prefs.
 * The token IS the credential; Firestore rules allow unauthenticated read/write on this
 * subcollection so clients (who have no Firebase Auth) can manage their own preferences.
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import { logger } from '@/lib/utils/logger';
import type { ClientConsentPrefs } from '@/types/clientConsent';

const CONSENT_DOC_ID = 'prefs' as const;

function consentRef(token: string) {
  return doc(
    getDb(),
    COLLECTIONS.PUBLIC_REPORTS,
    token,
    'clientConsent',
    CONSENT_DOC_ID,
  );
}

export async function getClientConsent(
  token: string,
): Promise<ClientConsentPrefs | null> {
  try {
    const snap = await getDoc(consentRef(token));
    if (!snap.exists()) return null;
    return snap.data() as ClientConsentPrefs;
  } catch (e) {
    logger.warn('[clientConsent] getClientConsent failed', e);
    return null;
  }
}

export async function writeClientConsent(
  token: string,
  prefs: Pick<ClientConsentPrefs, 'socialSharingConsented' | 'monthlyEmailConsented'>,
): Promise<void> {
  const ref = consentRef(token);
  try {
    const existing = await getDoc(ref);
    const now = serverTimestamp();
    await setDoc(
      ref,
      {
        socialSharingConsented: prefs.socialSharingConsented,
        monthlyEmailConsented: prefs.monthlyEmailConsented,
        consentUpdatedAt: now,
        ...(existing.exists() ? {} : { consentGivenAt: now }),
      },
      { merge: true },
    );
  } catch (e) {
    logger.warn('[clientConsent] writeClientConsent failed', e);
    throw e;
  }
}
