/**
 * Merge Duplicate Clients & Deduplicate Assessments
 *
 * This script fixes:
 * 1. "Michael Brown" / "Michael James Brown" split (name change created new identity)
 * 2. Duplicate Hisham assessment rows (same-day double saves)
 * 3. Duplicate Michael assessment rows (multiple saves per day)
 * 4. Recalculates org stats after cleanup
 *
 * Run from browser console:
 *   await window.mergeClients({ dryRun: true })   // Preview changes
 *   await window.mergeClients({ dryRun: false })   // Execute cleanup
 *
 * IMPORTANT: Step A4 (stats recalc) runs last because deleting assessment
 * summaries triggers aggregateAssessmentChanges Cloud Functions that
 * auto-decrement stats. The final recount overrides any drift.
 */

import {
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  collection,
  doc,
  writeBatch,
} from 'firebase/firestore';
import type { DocumentReference, Timestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger as appLogger } from '@/lib/utils/logger';
import { ORGANIZATION } from '@/lib/database/paths';
import {
  getOrganizationDoc,
  getOrgAssessmentsCollection,
  getOrgClientsCollection,
} from '@/lib/database/collections';

// ============================================================================
// TYPES
// ============================================================================

interface MergeClientsOptions {
  /** If true (default), only report what would change */
  dryRun?: boolean;
  /** Organization ID to operate on (required) */
  organizationId: string;
}

interface MergeClientsResult {
  success: boolean;
  dryRun: boolean;
  summariesRenamed: number;
  historyDocsCopied: number;
  duplicatesDeleted: number;
  orphanedDocsDeleted: number;
  statsRecalculated: boolean;
  errors: string[];
}

const logger = {
  info: (...args: unknown[]) => appLogger.info('[MergeClients]', ...args),
  warn: (...args: unknown[]) => appLogger.warn('[MergeClients]', ...args),
  error: (...args: unknown[]) => appLogger.error('[MergeClients]', ...args),
  section: (title: string) => appLogger.info(`\n[MergeClients] === ${title} ===`),
};

const MAX_QUERY_LIMIT = 500;

// ============================================================================
// HELPERS
// ============================================================================

function getClientSlug(clientName: string): string {
  const safeName = (clientName || 'unnamed-client').trim() || 'unnamed-client';
  return safeName.toLowerCase().replace(/\s+/g, '-');
}

function toDateKey(ts: Timestamp): string {
  return ts.toDate().toISOString().split('T')[0];
}

// ============================================================================
// A1: MERGE CLIENT NAMES
// ============================================================================

async function mergeClientName(
  orgId: string,
  oldName: string,
  canonicalName: string,
  dryRun: boolean,
  result: MergeClientsResult,
): Promise<void> {
  logger.section(`A1: Merge "${oldName}" -> "${canonicalName}"`);
  const db = getDb();
  const oldSlug = getClientSlug(oldName);
  const newSlug = getClientSlug(canonicalName);

  // 1. Rename summaries
  const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(orgId));
  const q = query(
    assessmentsRef,
    where('clientNameLower', '==', oldName.toLowerCase()),
    limit(MAX_QUERY_LIMIT),
  );
  const snap = await getDocs(q);
  logger.info(`Found ${snap.size} summaries with name "${oldName}"`);

  if (!dryRun) {
    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        clientName: canonicalName,
        clientNameLower: canonicalName.toLowerCase(),
      });
    });
    await batch.commit();
  }
  result.summariesRenamed += snap.size;

  // 2. Copy assessment history (current, history, snapshots) from old slug to new slug
  if (oldSlug !== newSlug) {
    // Copy current/data
    const oldCurrentPath = ORGANIZATION.assessmentHistory.current(orgId, oldSlug);
    const newCurrentPath = ORGANIZATION.assessmentHistory.current(orgId, newSlug);
    const oldCurrentSnap = await getDoc(doc(db, oldCurrentPath));

    if (oldCurrentSnap.exists()) {
      const newCurrentSnap = await getDoc(doc(db, newCurrentPath));
      const oldData = oldCurrentSnap.data();
      const newData = newCurrentSnap.exists() ? newCurrentSnap.data() : null;

      // Only copy if the target doesn't have newer data
      const oldUpdated = (oldData?.lastUpdated as Timestamp | undefined)?.toMillis() ?? 0;
      const newUpdated = (newData?.lastUpdated as Timestamp | undefined)?.toMillis() ?? 0;

      if (!newData || oldUpdated > newUpdated) {
        logger.info(`Copying current assessment from "${oldSlug}" to "${newSlug}" (newer data)`);
        if (!dryRun) {
          await setDoc(doc(db, newCurrentPath), {
            ...oldData,
            clientName: canonicalName,
          });
        }
        result.historyDocsCopied++;
      } else {
        logger.info(`Target "${newSlug}" has newer data, skipping current copy`);
      }
    }

    // Copy history subcollection
    const oldHistoryPath = ORGANIZATION.assessmentHistory.history(orgId, oldSlug);
    const oldHistorySnap = await getDocs(query(collection(db, oldHistoryPath), limit(MAX_QUERY_LIMIT)));
    logger.info(`Found ${oldHistorySnap.size} history docs to copy`);

    if (!dryRun && oldHistorySnap.size > 0) {
      const newHistoryPath = ORGANIZATION.assessmentHistory.history(orgId, newSlug);
      for (const histDoc of oldHistorySnap.docs) {
        await setDoc(doc(collection(db, newHistoryPath)), histDoc.data());
        result.historyDocsCopied++;
      }
    } else {
      result.historyDocsCopied += oldHistorySnap.size;
    }

    // Copy snapshots subcollection
    const oldSnapshotsPath = ORGANIZATION.assessmentHistory.snapshots(orgId, oldSlug);
    const oldSnapshotsSnap = await getDocs(query(collection(db, oldSnapshotsPath), limit(MAX_QUERY_LIMIT)));
    logger.info(`Found ${oldSnapshotsSnap.size} snapshot docs to copy`);

    if (!dryRun && oldSnapshotsSnap.size > 0) {
      const newSnapshotsPath = ORGANIZATION.assessmentHistory.snapshots(orgId, newSlug);
      for (const snapDoc of oldSnapshotsSnap.docs) {
        await setDoc(doc(collection(db, newSnapshotsPath)), snapDoc.data());
        result.historyDocsCopied++;
      }
    } else {
      result.historyDocsCopied += oldSnapshotsSnap.size;
    }

    // Delete orphaned old documents
    logger.info(`Deleting orphaned docs for slug "${oldSlug}"`);
    if (!dryRun) {
      // Delete old history docs
      for (const histDoc of oldHistorySnap.docs) {
        await deleteDoc(histDoc.ref);
        result.orphanedDocsDeleted++;
      }
      // Delete old snapshot docs
      for (const snapDoc of oldSnapshotsSnap.docs) {
        await deleteDoc(snapDoc.ref);
        result.orphanedDocsDeleted++;
      }
      // Delete old current doc
      if (oldCurrentSnap.exists()) {
        await deleteDoc(doc(db, oldCurrentPath));
        result.orphanedDocsDeleted++;
      }
      // Delete old client profile
      const oldClientRef = doc(db, ORGANIZATION.clients.doc(orgId, oldSlug));
      const oldClientSnap = await getDoc(oldClientRef);
      if (oldClientSnap.exists()) {
        await deleteDoc(oldClientRef);
        result.orphanedDocsDeleted++;
        logger.info(`Deleted orphaned client profile: ${oldSlug}`);
      }
    } else {
      // Count what would be deleted
      result.orphanedDocsDeleted += oldHistorySnap.size + oldSnapshotsSnap.size;
      if (oldCurrentSnap.exists()) result.orphanedDocsDeleted++;
      const oldClientRef = doc(db, ORGANIZATION.clients.doc(orgId, oldSlug));
      const oldClientSnap = await getDoc(oldClientRef);
      if (oldClientSnap.exists()) result.orphanedDocsDeleted++;
    }
  }
}

// ============================================================================
// A2 & A3: DEDUPLICATE ASSESSMENTS
// ============================================================================

async function deduplicateClient(
  orgId: string,
  clientNameLower: string,
  dryRun: boolean,
  result: MergeClientsResult,
): Promise<void> {
  logger.section(`Deduplicate: "${clientNameLower}"`);
  const db = getDb();

  const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(orgId));
  const q = query(
    assessmentsRef,
    where('clientNameLower', '==', clientNameLower),
    orderBy('createdAt', 'desc'),
    limit(MAX_QUERY_LIMIT),
  );
  const snap = await getDocs(q);
  logger.info(`Found ${snap.size} total summaries`);

  if (snap.size <= 1) {
    // Even with one doc, backfill assessmentCount from snapshot count
    if (snap.size === 1 && !dryRun) {
      await backfillAssessmentCount(orgId, clientNameLower, snap.docs[0]);
    }
    logger.info('No duplicates found');
    return;
  }

  // One row per client: keep the latest (first doc, sorted desc), delete all others
  const [keeper, ...duplicates] = snap.docs;
  const toDelete = duplicates.map(d => d.ref);

  logger.info(`Keeping 1 summary (${keeper.id}), deleting ${toDelete.length} duplicates`);

  if (!dryRun && toDelete.length > 0) {
    const batch = writeBatch(db);
    for (const ref of toDelete) {
      batch.delete(ref);
    }
    await batch.commit();

    // Backfill assessmentCount on the surviving doc
    await backfillAssessmentCount(orgId, clientNameLower, keeper);
  }
  result.duplicatesDeleted += toDelete.length;
}

/**
 * Backfill the assessmentCount field on a summary doc by counting snapshots.
 */
async function backfillAssessmentCount(
  orgId: string,
  clientNameLower: string,
  summaryDoc: { ref: DocumentReference; data: () => Record<string, unknown> },
): Promise<void> {
  const db = getDb();
  const slug = clientNameLower.replace(/\s+/g, '-');
  const snapshotsPath = ORGANIZATION.assessmentHistory.snapshots(orgId, slug);
  const snapshotsSnap = await getDocs(query(collection(db, snapshotsPath), limit(MAX_QUERY_LIMIT)));
  const count = Math.max(snapshotsSnap.size, 1);

  await updateDoc(summaryDoc.ref, { assessmentCount: count });
  logger.info(`Backfilled assessmentCount=${count} for "${clientNameLower}"`);
}

// ============================================================================
// A4: RECALCULATE ORG STATS
// ============================================================================

async function recalculateOrgStats(
  orgId: string,
  dryRun: boolean,
  result: MergeClientsResult,
): Promise<void> {
  logger.section('A4: Recalculate org stats');
  const db = getDb();

  // Count unique clients
  const clientsSnap = await getDocs(query(getOrgClientsCollection(orgId), limit(MAX_QUERY_LIMIT)));
  const clientCount = clientsSnap.size;

  // Count assessments
  const assessmentsSnap = await getDocs(query(getOrgAssessmentsCollection(orgId), limit(MAX_QUERY_LIMIT)));
  const assessmentCount = assessmentsSnap.size;

  // Find latest assessment date
  let lastAssessmentDate: Date | null = null;
  assessmentsSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const created = (data.createdAt as Timestamp | undefined)?.toDate();
    if (created && (!lastAssessmentDate || created > lastAssessmentDate)) {
      lastAssessmentDate = created;
    }
  });

  logger.info(`Recounted: ${clientCount} clients, ${assessmentCount} assessments`);

  if (!dryRun) {
    await updateDoc(getOrganizationDoc(orgId), {
      'stats.clientCount': clientCount,
      'stats.assessmentCount': assessmentCount,
      'stats.lastAssessmentDate': lastAssessmentDate,
      'stats.lastUpdated': new Date(),
    });
    result.statsRecalculated = true;
    logger.info('Stats updated successfully');
  } else {
    logger.info('(dry run) Would update stats');
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export async function mergeClients(
  options: MergeClientsOptions,
): Promise<MergeClientsResult> {
  const { dryRun = true, organizationId } = options;

  if (!organizationId) {
    throw new Error('organizationId is required');
  }

  const result: MergeClientsResult = {
    success: false,
    dryRun,
    summariesRenamed: 0,
    historyDocsCopied: 0,
    duplicatesDeleted: 0,
    orphanedDocsDeleted: 0,
    statsRecalculated: false,
    errors: [],
  };

  try {
    logger.section(dryRun ? 'MERGE CLIENTS (DRY RUN)' : 'MERGE CLIENTS (EXECUTE)');

    // A1: Merge "Michael Brown" -> "Michael James Brown"
    try {
      await mergeClientName(
        organizationId,
        'Michael Brown',
        'Michael James Brown',
        dryRun,
        result,
      );
    } catch (err) {
      const msg = `A1 failed: ${err instanceof Error ? err.message : String(err)}`;
      result.errors.push(msg);
      logger.error(msg);
    }

    // A2: Deduplicate Hisham assessments
    try {
      await deduplicateClient(organizationId, 'hisham mm abdoh', dryRun, result);
    } catch (err) {
      const msg = `A2 failed: ${err instanceof Error ? err.message : String(err)}`;
      result.errors.push(msg);
      logger.error(msg);
    }

    // A3: Deduplicate Michael James Brown assessments
    try {
      await deduplicateClient(organizationId, 'michael james brown', dryRun, result);
    } catch (err) {
      const msg = `A3 failed: ${err instanceof Error ? err.message : String(err)}`;
      result.errors.push(msg);
      logger.error(msg);
    }

    // A4: Recalculate org stats (MANDATORY -- runs last)
    try {
      await recalculateOrgStats(organizationId, dryRun, result);
    } catch (err) {
      const msg = `A4 failed: ${err instanceof Error ? err.message : String(err)}`;
      result.errors.push(msg);
      logger.error(msg);
    }

    // Summary
    logger.section('RESULTS');
    logger.info(`Summaries renamed: ${result.summariesRenamed}`);
    logger.info(`History docs copied: ${result.historyDocsCopied}`);
    logger.info(`Duplicates deleted: ${result.duplicatesDeleted}`);
    logger.info(`Orphaned docs deleted: ${result.orphanedDocsDeleted}`);
    logger.info(`Stats recalculated: ${result.statsRecalculated}`);
    if (result.errors.length > 0) {
      logger.warn(`Errors: ${result.errors.length}`);
      result.errors.forEach((e) => logger.error(e));
    }

    if (dryRun) {
      logger.info('\nThis was a DRY RUN. No data was changed.');
      logger.info('To execute: await window.mergeClients({ dryRun: false, organizationId: "..." })');
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    logger.error('Fatal error:', error);
    result.errors.push(`Fatal: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as {
    mergeClients: typeof mergeClients;
  }).mergeClients = mergeClients;
}
