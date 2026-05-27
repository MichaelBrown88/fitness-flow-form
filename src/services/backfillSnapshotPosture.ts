/**
 * Backfill posture structuredFindings onto a historical snapshot.
 *
 * Runs the current analyzer (`processPostureImage`) client-side on each of
 * the snapshot's stored view images, then calls the `backfillSnapshotPosture`
 * Cloud Function to persist the result. The CF bypasses the session-immutability
 * Firestore rule with admin auth after verifying the caller is a coach in the
 * owning org.
 *
 * Use when a snapshot was captured before the analyzer emitted structured
 * findings (or with an older analyzer version) and you want the report's
 * Posture Analysis card to render a real score + findings for that date
 * instead of "Pending re-analysis."
 */

import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseFunctions, getDb } from './firebase';
import { processPostureImage } from './postureProcessing';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { logger } from '@/lib/utils/logger';

const VIEWS = ['front', 'side-left', 'back', 'side-right'] as const;
type PostureView = (typeof VIEWS)[number];

interface BackfillResult {
  success: boolean;
  viewsAttempted: string[];
  viewsAnalysed: string[];
  viewsFailed: Array<{ view: string; reason: string }>;
  sessionId: string;
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  // The browser can DISPLAY a Firebase Storage image (CORS-exempt for `<img>`)
  // but reading bytes via the Storage SDK is blocked by CORS until the bucket
  // is explicitly configured. We proxy through a Cloud Function instead — the
  // CF downloads bytes server-side with admin auth and returns base64.
  const urlMatch = url.match(/\/o\/(.+?)\?/);
  if (!urlMatch) {
    throw new Error(`URL does not look like a Firebase Storage download URL: ${url.slice(0, 80)}`);
  }
  const storagePath = decodeURIComponent(urlMatch[1]);

  const fn = httpsCallable<
    { storagePath: string },
    { base64: string; contentType: string }
  >(getFirebaseFunctions(), 'fetchSnapshotImageBytes');
  const res = await fn({ storagePath });
  return `data:${res.data.contentType};base64,${res.data.base64}`;
}

export async function backfillSnapshotPosture(
  orgId: string,
  clientSlug: string,
  sessionId: string,
): Promise<BackfillResult> {
  const db = getDb();
  const sessionRef = doc(db, `organizations/${orgId}/clients/${clientSlug}/sessions/${sessionId}`);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) {
    throw new Error(`Session ${sessionId} not found at organizations/${orgId}/clients/${clientSlug}/sessions/`);
  }

  const data = snap.data() as {
    formData?: {
      postureImagesStorage?: Record<string, string>;
      postureImages?: Record<string, string>;
    };
  };
  const images = data.formData?.postureImagesStorage ?? data.formData?.postureImages ?? {};
  if (Object.keys(images).length === 0) {
    throw new Error('No posture images found on this session — nothing to re-analyse.');
  }

  const postureAiResults: Record<string, PostureAnalysisResult> = {};
  const viewsAttempted: string[] = [];
  const viewsAnalysed: string[] = [];
  const viewsFailed: Array<{ view: string; reason: string }> = [];

  for (const view of VIEWS) {
    const url = images[view];
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      viewsFailed.push({ view, reason: 'no usable image URL' });
      continue;
    }
    viewsAttempted.push(view);

    try {
      logger.info(`[backfill] Analysing ${view} for session ${sessionId}…`);
      const dataUrl = await fetchImageAsDataUrl(url);
      const result = await processPostureImage(dataUrl, view as PostureView);
      postureAiResults[view] = result.analysis;
      viewsAnalysed.push(view);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.error(`[backfill] Failed ${view}:`, reason);
      viewsFailed.push({ view, reason });
    }
  }

  if (viewsAnalysed.length === 0) {
    throw new Error(
      `No views could be analysed. Failures: ${viewsFailed.map((f) => `${f.view}: ${f.reason}`).join(' | ')}`,
    );
  }

  // Persist via Cloud Function (bypasses session-immutability rule)
  const fn = httpsCallable<
    { clientSlug: string; sessionId: string; postureAiResults: Record<string, PostureAnalysisResult> },
    { success: true; sessionId: string; viewsUpdated: string[] }
  >(getFirebaseFunctions(), 'backfillSnapshotPosture');

  const res = await fn({ clientSlug, sessionId, postureAiResults });

  logger.info(`[backfill] Persisted: ${res.data.viewsUpdated.join(',')}`);

  return {
    success: true,
    sessionId,
    viewsAttempted,
    viewsAnalysed,
    viewsFailed,
  };
}

// Dev-only: expose to console so the user can backfill ad-hoc without UI
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { backfillSnapshotPosture?: typeof backfillSnapshotPosture }).backfillSnapshotPosture =
    backfillSnapshotPosture;
  logger.info(
    '[backfillSnapshotPosture] Ready. Usage: await backfillSnapshotPosture(orgId, clientSlug, sessionId)',
  );
}
