import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, Timestamp, collection, query, where, getDocs, limit, writeBatch, addDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { validateOrganizationId } from '@/lib/utils/validateOrganizationId';
import type { UserProfile } from '@/types/auth';
import { ORGANIZATION } from '@/lib/database/paths';
import type { PillarCadence } from '@/types/client';
import { logger } from '@/lib/utils/logger';

/**
 * Retest schedule stored with client profile
 * Stored as Firestore-compatible structure (dates as Timestamps)
 */
export interface StoredRetestSchedule {
  /** Auto-generated recommendations from assessment */
  recommended: PillarCadence;
  /** Coach overrides (takes precedence) */
  custom?: Partial<PillarCadence>;
  /** When recommendations were generated */
  generatedAt: Timestamp;
  /** Assessment ID that generated these recommendations */
  sourceAssessmentId: string;
}

export type ClientProfile = {
  clientName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  notes?: string;
  tags?: string[];
  status?: 'active' | 'inactive' | 'on-hold';
  organizationId?: string;
  assignedCoachUid?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastAssessmentDate?: Timestamp;
  lastInBodyDate?: Timestamp;
  lastPostureDate?: Timestamp;
  lastFitnessDate?: Timestamp;
  lastStrengthDate?: Timestamp;
  lastLifestyleDate?: Timestamp;
  /** Smart retest cadence schedule */
  retestSchedule?: StoredRetestSchedule;
  /**
   * One-time due date overrides set by the coach via the Priority tab.
   * Maps pillar name → absolute Timestamp for next assessment.
   * Does NOT change the recurring cadence interval.
   * Automatically ignored once the pillar's next assessment is completed
   * (the override date falls behind the new lastAssessmentDate).
   */
  dueDateOverrides?: Record<string, Timestamp>;
};

// ============================================================================
// CLIENT IDENTITY UTILITIES (Single Source of Truth for Slug Generation)
// ============================================================================

/**
 * Normalize a client name: trim whitespace and collapse multiple spaces.
 */
export function normalizeClientName(name: string): string {
  return (name || '').trim().replace(/\s+/g, ' ');
}

/**
 * Generate a stable client slug from a name.
 * This is the SINGLE SOURCE OF TRUTH for slug generation.
 * Used by: clientProfileDoc, assessmentHistory paths, ORGANIZATION.clients.generateId, admin scripts.
 */
export function generateClientSlug(clientName: string): string {
  const safeName = normalizeClientName(clientName) || 'unnamed-client';
  return safeName.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Get a client document reference using organization path
 * Client ID is derived from client name via generateClientSlug
 */
const clientProfileDoc = (orgId: string, clientName: string) => {
  const clientId = generateClientSlug(clientName);
  return doc(getDb(), ORGANIZATION.clients.doc(orgId, clientId));
};

/**
 * Get a client profile
 * @param coachUid - The coach's user ID (kept for backwards compatibility)
 * @param clientName - The client's name
 * @param organizationId - Required: The organization ID for path construction
 */
export async function getClientProfile(
  coachUid: string,
  clientName: string,
  organizationId?: string,
): Promise<ClientProfile | null> {
  if (!organizationId) {
    return null;
  }

  const ref = clientProfileDoc(organizationId, clientName);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as ClientProfile;

  // Verify organization ownership
  if (data.organizationId && data.organizationId !== organizationId) {
    return null;
  }

  return data;
}

/** Shape returned by listClientSchedules for each client */
export interface ClientScheduleData {
  recommended?: PillarCadence;
  custom?: Partial<PillarCadence>;
  /** Absolute one-time due date overrides (pillar → Date) */
  dueDateOverrides?: Record<string, Date>;
}

/**
 * Batch-fetch schedule data for all clients in an organization.
 * Returns cadence intervals AND one-time due date overrides.
 * Used by the dashboard to enrich ClientGroups with schedule data.
 */
export async function listClientSchedules(
  organizationId: string,
): Promise<Map<string, ClientScheduleData>> {
  const result = new Map<string, ClientScheduleData>();
  if (!organizationId) return result;

  const colRef = collection(getDb(), ORGANIZATION.clients.collection(organizationId));
  const snap = await getDocs(query(colRef));

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as ClientProfile;
    if (!data.clientName) continue;

    const entry: ClientScheduleData = {};

    if (data.retestSchedule) {
      entry.recommended = data.retestSchedule.recommended;
      entry.custom = data.retestSchedule.custom;
    }

    if (data.dueDateOverrides) {
      const overrides: Record<string, Date> = {};
      for (const [pillar, ts] of Object.entries(data.dueDateOverrides)) {
        if (ts && typeof ts.toDate === 'function') {
          overrides[pillar] = ts.toDate();
        }
      }
      if (Object.keys(overrides).length > 0) {
        entry.dueDateOverrides = overrides;
      }
    }

    // Only add if there's meaningful schedule data
    if (entry.recommended || entry.custom || entry.dueDateOverrides) {
      result.set(data.clientName.toLowerCase(), entry);
    }
  }

  return result;
}

/**
 * Set a one-time due date override for a specific pillar.
 * This pins the next assessment to an absolute date without
 * changing the recurring cadence interval.
 *
 * Upsert-safe: creates a minimal profile if one doesn't exist.
 */
export async function setDueDateOverride(
  clientName: string,
  organizationId: string,
  pillar: string,
  dueDate: Date,
): Promise<void> {
  const ref = clientProfileDoc(organizationId, clientName);
  const snap = await getDoc(ref);

  const ts = Timestamp.fromDate(dueDate);

  if (!snap.exists()) {
    // Bootstrap a minimal profile
    await setDoc(ref, {
      clientName,
      organizationId,
      dueDateOverrides: { [pillar]: ts },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(ref, {
    [`dueDateOverrides.${pillar}`]: ts,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Create or update a client profile
 * @param coachUid - The coach's user ID (used for assignedCoachUid)
 * @param clientName - The client's name
 * @param data - Profile data to save
 * @param organizationId - Required: The organization ID for path construction
 * @param profile - User profile for validation
 */
export async function createOrUpdateClientProfile(
  coachUid: string,
  clientName: string,
  data: Partial<Omit<ClientProfile, 'clientName' | 'createdAt' | 'updatedAt'>>,
  organizationId?: string,
  profile?: UserProfile | null,
): Promise<void> {
  // Validate organizationId before proceeding
  const validOrgId = validateOrganizationId(organizationId, profile);

  const ref = clientProfileDoc(validOrgId, clientName);
  const snap = await getDoc(ref);

  const existingData = snap.exists() ? (snap.data() as ClientProfile) : null;

  if (snap.exists()) {
    // Verify ownership: if existing doc has orgId, it must match validated orgId
    if (existingData?.organizationId && existingData.organizationId !== validOrgId) {
      throw new Error('Cannot update client profile: Organization mismatch.');
    }

    await updateDoc(ref, {
      ...data,
      organizationId: validOrgId,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      clientName,
      organizationId: validOrgId,
      assignedCoachUid: coachUid,
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Subscribe to a client profile for real-time updates
 * @param coachUid - The coach's user ID (kept for backwards compatibility)
 * @param clientName - The client's name
 * @param callback - Callback function for profile updates
 * @param organizationId - Required: The organization ID for path construction
 */
export function subscribeToClientProfile(
  coachUid: string,
  clientName: string,
  callback: (profile: ClientProfile | null) => void,
  organizationId?: string,
): () => void {
  if (!organizationId) {
    callback(null);
    return () => {};
  }

  const ref = clientProfileDoc(organizationId, clientName);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as ClientProfile;
      // Verify organization ownership
      if (data.organizationId && data.organizationId !== organizationId) {
        callback(null);
      } else {
        callback(data);
      }
    } else {
      callback(null);
    }
  });
}

/**
 * Update the retest schedule for a client
 * Called when a full assessment is completed to store recommendations
 */
export async function updateRetestSchedule(
  clientName: string,
  organizationId: string,
  retestSchedule: StoredRetestSchedule,
): Promise<void> {
  const ref = clientProfileDoc(organizationId, clientName);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(`Client profile not found: ${clientName}`);
  }

  await updateDoc(ref, {
    retestSchedule,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update custom cadence overrides for a client.
 * Uses upsert pattern: if the client profile does not exist yet
 * (e.g. legacy client assessed before profile system), create it
 * with minimal data rather than throwing.
 */
export async function updateCustomCadence(
  clientName: string,
  organizationId: string,
  customSchedule: Partial<PillarCadence>,
): Promise<void> {
  const ref = clientProfileDoc(organizationId, clientName);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Bootstrap a minimal profile so cadence data has somewhere to live
    await setDoc(ref, {
      clientName,
      organizationId,
      retestSchedule: { custom: customSchedule },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const existing = snap.data() as ClientProfile;
  
  // Merge with existing custom schedule
  const updatedCustom = {
    ...existing.retestSchedule?.custom,
    ...customSchedule,
  };

  await updateDoc(ref, {
    'retestSchedule.custom': updatedCustom,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Reset custom cadence to use recommendations only
 */
export async function resetCustomCadence(
  clientName: string,
  organizationId: string,
): Promise<void> {
  const ref = clientProfileDoc(organizationId, clientName);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(`Client profile not found: ${clientName}`);
  }

  await updateDoc(ref, {
    'retestSchedule.custom': null,
    updatedAt: serverTimestamp(),
  });
}

// ============================================================================
// CLIENT RENAME (Phase C)
// ============================================================================

const MAX_BATCH_LIMIT = 500;

/**
 * Rename a client: updates profile, all summaries, and migrates assessment history.
 * 
 * CRITICAL: Firestore does NOT support moving docs with subcollections in one op.
 * This function recursively copies current/data, history/*, snapshots/* to the
 * new slug path, then deletes the old docs.
 */
export async function renameClient(
  oldName: string,
  newName: string,
  organizationId: string,
  profile?: UserProfile | null,
): Promise<{ success: boolean; message: string }> {
  const validOrgId = validateOrganizationId(organizationId, profile);
  const db = getDb();

  const normalizedOld = normalizeClientName(oldName);
  const normalizedNew = normalizeClientName(newName);

  if (!normalizedNew) {
    return { success: false, message: 'New client name cannot be empty.' };
  }

  const oldSlug = generateClientSlug(normalizedOld);
  const newSlug = generateClientSlug(normalizedNew);

  // Case 1: Slug unchanged (e.g., just capitalization fix)
  if (oldSlug === newSlug) {
    const ref = clientProfileDoc(validOrgId, normalizedOld);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { clientName: normalizedNew, updatedAt: serverTimestamp() });
    }

    // Update summaries clientName display
    const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(validOrgId));
    const q = query(assessmentsRef, where('clientNameLower', '==', oldSlug.replace(/-/g, ' ')), limit(MAX_BATCH_LIMIT));
    const summaries = await getDocs(q);
    if (summaries.size > 0) {
      const batch = writeBatch(db);
      summaries.docs.forEach((d) => batch.update(d.ref, { clientName: normalizedNew }));
      await batch.commit();
    }

    // Update live doc clientName
    const currentPath = ORGANIZATION.assessmentHistory.current(validOrgId, oldSlug);
    const currentSnap = await getDoc(doc(db, currentPath));
    if (currentSnap.exists()) {
      await updateDoc(doc(db, currentPath), { clientName: normalizedNew });
    }

    return { success: true, message: `Updated display name to "${normalizedNew}"` };
  }

  // Case 2: Slug changed -- full migration required
  logger.info(`[Rename] Migrating "${oldSlug}" -> "${newSlug}"`);

  // 2a. Create new client profile, copy data from old
  const oldRef = clientProfileDoc(validOrgId, normalizedOld);
  const oldSnap = await getDoc(oldRef);
  if (!oldSnap.exists()) {
    return { success: false, message: `Client profile not found: ${normalizedOld}` };
  }
  const oldData = oldSnap.data() as ClientProfile;

  // Verify ownership
  if (oldData.organizationId && oldData.organizationId !== validOrgId) {
    return { success: false, message: 'Organization mismatch.' };
  }

  const newRef = clientProfileDoc(validOrgId, normalizedNew);
  await setDoc(newRef, {
    ...oldData,
    clientName: normalizedNew,
    updatedAt: serverTimestamp(),
  });

  // 2b. Update all assessment summaries
  const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(validOrgId));
  const summaryQ = query(assessmentsRef, where('clientNameLower', '==', normalizedOld.toLowerCase()), limit(MAX_BATCH_LIMIT));
  const summaries = await getDocs(summaryQ);
  if (summaries.size > 0) {
    const batch = writeBatch(db);
    summaries.docs.forEach((d) => {
      batch.update(d.ref, {
        clientName: normalizedNew,
        clientNameLower: normalizedNew.toLowerCase(),
      });
    });
    await batch.commit();
  }

  // 2c. Migrate assessment history (recursive subcollection copy)
  // Copy current/data
  const oldCurrentPath = ORGANIZATION.assessmentHistory.current(validOrgId, oldSlug);
  const newCurrentPath = ORGANIZATION.assessmentHistory.current(validOrgId, newSlug);
  const oldCurrentSnap = await getDoc(doc(db, oldCurrentPath));
  if (oldCurrentSnap.exists()) {
    await setDoc(doc(db, newCurrentPath), {
      ...oldCurrentSnap.data(),
      clientName: normalizedNew,
    });
  }

  // Copy history subcollection
  const oldHistoryPath = ORGANIZATION.assessmentHistory.history(validOrgId, oldSlug);
  const newHistoryPath = ORGANIZATION.assessmentHistory.history(validOrgId, newSlug);
  const historyDocs = await getDocs(query(collection(db, oldHistoryPath), limit(MAX_BATCH_LIMIT)));
  for (const histDoc of historyDocs.docs) {
    await setDoc(doc(collection(db, newHistoryPath)), histDoc.data());
  }

  // Copy snapshots subcollection (preserve original formData.fullName for historical accuracy)
  const oldSnapshotsPath = ORGANIZATION.assessmentHistory.snapshots(validOrgId, oldSlug);
  const newSnapshotsPath = ORGANIZATION.assessmentHistory.snapshots(validOrgId, newSlug);
  const snapshotDocs = await getDocs(query(collection(db, oldSnapshotsPath), limit(MAX_BATCH_LIMIT)));
  for (const snapDoc of snapshotDocs.docs) {
    await setDoc(doc(collection(db, newSnapshotsPath)), snapDoc.data());
  }

  // 2d. Verify counts match before deleting
  const copiedHistory = await getDocs(query(collection(db, newHistoryPath), limit(MAX_BATCH_LIMIT)));
  const copiedSnapshots = await getDocs(query(collection(db, newSnapshotsPath), limit(MAX_BATCH_LIMIT)));

  if (copiedHistory.size < historyDocs.size || copiedSnapshots.size < snapshotDocs.size) {
    logger.error('[Rename] Copy verification failed, aborting deletion of old docs');
    return { success: false, message: 'Migration verification failed. Old data preserved.' };
  }

  // 2e. Delete old documents recursively
  for (const histDoc of historyDocs.docs) await deleteDoc(histDoc.ref);
  for (const snapDoc of snapshotDocs.docs) await deleteDoc(snapDoc.ref);
  if (oldCurrentSnap.exists()) await deleteDoc(doc(db, oldCurrentPath));
  await deleteDoc(oldRef);

  logger.info(`[Rename] Successfully migrated "${normalizedOld}" -> "${normalizedNew}"`);
  return { success: true, message: `Renamed to "${normalizedNew}" and migrated all data.` };
}

// ============================================================================
// CLIENT TRANSFER (Phase E)
// ============================================================================

/** Change history type constant for transfers */
const TRANSFER_CHANGE_TYPE = 'transfer' as const;

/**
 * Transfer a client from one coach to another.
 * Updates assignedCoachUid on profile, coachUid on all summaries,
 * and logs the transfer in change history.
 */
export async function transferClient(
  clientName: string,
  organizationId: string,
  fromCoachUid: string,
  toCoachUid: string,
  profile?: UserProfile | null,
): Promise<{ success: boolean; message: string }> {
  const validOrgId = validateOrganizationId(organizationId, profile);
  const db = getDb();

  if (!toCoachUid || toCoachUid === fromCoachUid) {
    return { success: false, message: 'Target coach must be different from current coach.' };
  }

  const normalized = normalizeClientName(clientName);
  const slug = generateClientSlug(normalized);

  // 1. Update client profile
  const profileRef = clientProfileDoc(validOrgId, normalized);
  const profileSnap = await getDoc(profileRef);
  if (!profileSnap.exists()) {
    return { success: false, message: `Client profile not found: ${normalized}` };
  }

  const profileData = profileSnap.data() as ClientProfile;
  if (profileData.organizationId && profileData.organizationId !== validOrgId) {
    return { success: false, message: 'Organization mismatch.' };
  }

  await updateDoc(profileRef, {
    assignedCoachUid: toCoachUid,
    updatedAt: serverTimestamp(),
  });

  // 2. Update coachUid on ALL assessment summaries (with performedByUid preservation)
  const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(validOrgId));
  const summaryQ = query(
    assessmentsRef,
    where('clientNameLower', '==', normalized.toLowerCase()),
    limit(MAX_BATCH_LIMIT),
  );
  const summaries = await getDocs(summaryQ);
  let updatedCount = 0;

  if (summaries.size > 0) {
    const batch = writeBatch(db);
    summaries.docs.forEach((d) => {
      const data = d.data();
      const updateFields: Record<string, unknown> = { coachUid: toCoachUid };
      // Preserve original creator as performedByUid if not already set
      if (!data.performedByUid && data.coachUid && data.coachUid !== toCoachUid) {
        updateFields.performedByUid = data.coachUid;
      }
      batch.update(d.ref, updateFields);
      updatedCount++;
    });
    await batch.commit();
  }

  // 3. Update coachUid on the live assessment doc
  const currentPath = ORGANIZATION.assessmentHistory.current(validOrgId, slug);
  const currentSnap = await getDoc(doc(db, currentPath));
  if (currentSnap.exists()) {
    await updateDoc(doc(db, currentPath), { coachUid: toCoachUid });
  }

  // 4. Log the transfer in change history
  const historyPath = ORGANIZATION.assessmentHistory.history(validOrgId, slug);
  await addDoc(collection(db, historyPath), {
    timestamp: serverTimestamp(),
    type: TRANSFER_CHANGE_TYPE,
    category: 'all',
    changes: {
      coachUid: { old: fromCoachUid, new: toCoachUid },
      assignedCoachUid: { old: fromCoachUid, new: toCoachUid },
    },
    updatedBy: fromCoachUid,
    organizationId: validOrgId,
  });

  logger.info(`[Transfer] Client "${normalized}" transferred from ${fromCoachUid} to ${toCoachUid} (${updatedCount} summaries updated)`);
  return { success: true, message: `Client transferred successfully. ${updatedCount} assessments reassigned.` };
}
