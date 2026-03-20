/**
 * useOfflineSync
 *
 * Watches for the browser coming back online and drains the IndexedDB
 * `pendingAssessments` queue by replaying each saved assessment.
 *
 * Returns `pendingCount` so the UI can surface a persistent banner.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAllPending, removePending, getPendingCount } from '@/lib/offline/pendingAssessments';
import { saveCoachAssessment } from '@/services/coachAssessments';
import { getFirebaseAuth } from '@/services/firebase';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB unavailable (private browsing on some browsers)
    }
  }, []);

  const drainQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    const pending = await getAllPending();
    if (pending.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    for (const entry of pending) {
      try {
        const coachEmail = getFirebaseAuth().currentUser?.email ?? null;
        await saveCoachAssessment(
          entry.coachUid,
          coachEmail,
          entry.formData,
          entry.scores.overall,
          entry.organizationId,
          undefined,
        );
        await removePending(entry.id);
        synced++;
      } catch (err) {
        logger.error('[OfflineSync] Failed to sync assessment', err);
        failed++;
      }
    }

    await refreshCount();
    syncingRef.current = false;
    setIsSyncing(false);

    if (synced > 0) {
      toast({
        title: `${synced} offline assessment${synced > 1 ? 's' : ''} synced`,
        description: 'Your work has been saved to the dashboard.',
      });
    }
    if (failed > 0) {
      toast({
        title: `${failed} assessment${failed > 1 ? 's' : ''} failed to sync`,
        description: 'They will be retried on your next connection.',
        variant: 'destructive',
      });
    }
  }, [toast, refreshCount]);

  // Load initial count and set up online listener
  useEffect(() => {
    void refreshCount();
    const handleOnline = (): void => {
      void drainQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [drainQueue, refreshCount]);

  return { pendingCount, isSyncing };
}
