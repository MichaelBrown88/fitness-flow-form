/**
 * Offline Assessment Queue
 *
 * Serialises unsaved assessments to IndexedDB when the device is offline.
 * The `useOfflineSync` hook drains this store automatically when connectivity
 * is restored.
 *
 * Uses the native IndexedDB API directly (no external dependency).
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';

const DB_NAME = 'oa_offline';
const DB_VERSION = 1;
const STORE_NAME = 'pendingAssessments';

export interface PendingAssessment {
  id: string; // Generated at queue time — used as idempotency key on sync
  queuedAt: number; // Unix ms
  coachUid: string;
  organizationId: string;
  formData: FormData;
  scores: ScoreSummary;
  isDemoAssessment: boolean;
  retryCount?: number; // Incremented on each failed drain attempt
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueAssessment(entry: PendingAssessment): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllPending(): Promise<PendingAssessment[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingAssessment[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removePending(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
