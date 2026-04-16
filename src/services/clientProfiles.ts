import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
  writeBatch,
  addDoc,
  increment,
  type UpdateData,
  type DocumentData,
} from 'firebase/firestore';
import {
  ORG_CLIENT_PROFILES_QUERY_LIMIT,
  PUBLIC_REPORTS_BY_CLIENT_DELETE_LIMIT,
} from '@/constants/firestoreQueryLimits';
import { getDb } from '@/services/firebase';
import { validateOrganizationId } from '@/lib/utils/validateOrganizationId';
import {
  CLIENT_PROFILE_LAST_BODY_COMP_AT,
  clientProfileBodyCompDateFieldKeys,
  readLastBodyCompTimestamp,
} from '@/lib/utils/clientProfileBodyCompDate';
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
  /**
   * Stable UUID for this client — used as the Firestore document ID for new clients.
   * Legacy clients (created before the UUID migration) will have this populated
   * by the backfillClientIds Cloud Function; until then it may be absent.
   */
  clientId?: string;
  /**
   * Legacy name-based slug (populated by backfillClientIds for migrated clients).
   * Used to maintain lookup continuity after UUID migration.
   */
  legacySlug?: string;
  clientName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  notes?: string;
  tags?: string[];
  status?: 'active' | 'inactive' | 'paused' | 'archived';
  organizationId?: string;
  /** Which assessment pillars are actively tracked for scheduling */
  activePillars?: import('@/types/client').PartialAssessmentCategory[];
  /** When the account was paused (set on pause) */
  pausedAt?: Timestamp;
  /** Who initiated the pause: coach UID or 'client-request' */
  pausedBy?: string;
  /** Optional reason for the pause */
  pauseReason?: string;
  /** Whether a client-requested pause has been approved by the coach */
  pauseApproved?: boolean;
  /** When the account was archived */
  archivedAt?: Timestamp;
  /** Who archived the account: coach UID */
  archivedBy?: string;
  /** Optional reason for archiving */
  archiveReason?: string;
  /** When the client actually started training — YYYY-MM-DD string (scheduling clock starts here) */
  trainingStartDate?: string;
  assignedCoachUid?: string;
  /** Firebase Auth UID of the client (set on first magic-link login) */
  firebaseUid?: string;
  /** Public report share token (UUID) for token-scoped achievements/notifications */
  shareToken?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastAssessmentDate?: Timestamp;
  lastBodyCompDate?: Timestamp;
  /** @deprecated Legacy Firestore field; prefer lastBodyCompDate. */
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
  /** Remote intake submitted by client; awaiting studio physical assessment. */
  remoteIntakeAwaitingStudio?: boolean;
  /** Raw key-value form data from remote intake submission (pre-assessment prefill). */
  formData?: Record<string, unknown>;
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
 * Resolve canonical `clientName` from the org client summary doc when the UI has a slug-like
 * value (e.g. ?client= from the dashboard). Returns null if the doc does not exist.
 */
export async function resolveClientDisplayNameFromOrgClientDoc(
  organizationId: string,
  rawFromUrlOrSession: string,
): Promise<string | null> {
  const validOrgId = validateOrganizationId(organizationId, null);
  const trimmed = normalizeClientName(rawFromUrlOrSession);
  if (!trimmed) return null;
  const slug = generateClientSlug(trimmed);
  const ref = doc(getDb(), ORGANIZATION.clients.doc(validOrgId, slug));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as { clientName?: string };
  const cn = typeof data.clientName === 'string' ? normalizeClientName(data.clientName) : '';
  return cn || null;
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
 * Resolve the stable UUID for a client from a name or slug.
 *
 * Resolution order:
 * 1. Check `clientLookup/{slug}` — populated for new clients and migrated legacy clients.
 * 2. Fallback: query `clients` where `clientName == ...` and read `clientId` from the doc.
 *
 * Returns `null` if the client cannot be found.
 */
export async function resolveClientId(
  orgId: string,
  clientNameOrSlug: string,
): Promise<string | null> {
  const db = getDb();
  const slug = generateClientSlug(clientNameOrSlug);

  // 1. Check lookup collection
  const lookupSnap = await getDoc(doc(db, ORGANIZATION.clientLookup.doc(orgId, slug)));
  if (lookupSnap.exists()) {
    return (lookupSnap.data() as { clientId: string }).clientId ?? null;
  }

  // 2. Fallback: query by clientName (legacy slug-keyed docs won't be in lookup yet)
  const q = query(
    collection(db, ORGANIZATION.clients.collection(orgId)),
    where('clientName', '==', clientNameOrSlug),
    limit(1),
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const data = snap.docs[0].data() as ClientProfile;
    return data.clientId ?? snap.docs[0].id;
  }

  return null;
}

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
  /** Per-pillar last-completed dates for overdue calculation */
  pillarDates?: Record<string, Date>;
  /** Fallback: last assessment of any type (used when pillar dates are missing) */
  lastAssessmentDate?: Date;
  /** Client account status */
  clientStatus?: 'active' | 'inactive' | 'paused' | 'archived';
  /** Which pillars are actively tracked for scheduling */
  activePillars?: import('@/types/client').PartialAssessmentCategory[];
  /** Training start date — scheduling clock starts here instead of assessment date */
  trainingStartDate?: Date;
  /** Internal coaching note from the client profile */
  notes?: string;
  /** Public report share token when the client report has been published */
  shareToken?: string;
}

/**
 * Batch-fetch schedule data for clients in an organization.
 * Returns cadence intervals AND one-time due date overrides.
 * Used by the dashboard to enrich ClientGroups with schedule data.
 *
 * @param coachUid - When provided, only fetches that coach's assigned clients.
 *   Pass `null` to fetch all org clients (org admin non-coach view).
 *   Omitting / passing `undefined` also fetches only the authenticated coach's clients
 *   and is equivalent to passing their uid.
 */
export async function listClientSchedules(
  organizationId: string,
  coachUid?: string | null,
): Promise<Map<string, ClientScheduleData>> {
  const result = new Map<string, ClientScheduleData>();
  if (!organizationId) return result;

  const colRef = collection(getDb(), ORGANIZATION.clients.collection(organizationId));
  const constraints =
    coachUid != null
      ? [where('coachUid', '==', coachUid), limit(ORG_CLIENT_PROFILES_QUERY_LIMIT)]
      : [limit(ORG_CLIENT_PROFILES_QUERY_LIMIT)];
  const snap = await getDocs(query(colRef, ...constraints));

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as ClientProfile;

    const entry: ClientScheduleData = {
      clientStatus: data.status || 'active',
      activePillars: data.activePillars,
      trainingStartDate: data.trainingStartDate ? new Date(data.trainingStartDate) : undefined,
      lastAssessmentDate: data.lastAssessmentDate?.toDate(),
      notes: data.notes,
      shareToken: typeof data.shareToken === 'string' && data.shareToken.trim() !== '' ? data.shareToken.trim() : undefined,
    };

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

    const pillarDateFields: Record<string, keyof ClientProfile> = {
      posture: 'lastPostureDate',
      fitness: 'lastFitnessDate',
      strength: 'lastStrengthDate',
      lifestyle: 'lastLifestyleDate',
    };
    const pillarDates: Record<string, Date> = {};
    const bodyCompTs = readLastBodyCompTimestamp(data);
    if (bodyCompTs && typeof bodyCompTs.toDate === 'function') {
      pillarDates.bodycomp = bodyCompTs.toDate();
    }
    for (const [pillar, field] of Object.entries(pillarDateFields)) {
      const ts = data[field];
      if (ts && typeof (ts as Timestamp).toDate === 'function') {
        pillarDates[pillar] = (ts as Timestamp).toDate();
      }
    }
    if (Object.keys(pillarDates).length > 0) {
      entry.pillarDates = pillarDates;
    }

    // Store under both the name-based key and slug-based key (doc ID)
    // so lookups work even if clientName is missing from the profile
    if (data.clientName) {
      result.set(data.clientName.toLowerCase(), entry);
    }
    result.set(docSnap.id, entry);
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
  const validOrgId = validateOrganizationId(organizationId, profile);

  // First, check if a client doc already exists at the legacy slug path
  const legacyRef = clientProfileDoc(validOrgId, clientName);
  const legacySnap = await getDoc(legacyRef);

  if (legacySnap.exists()) {
    const existingData = legacySnap.data() as ClientProfile;
    if (existingData?.organizationId && existingData.organizationId !== validOrgId) {
      throw new Error('Cannot update client profile: Organization mismatch.');
    }

    // Also patch contact fields inside the embedded formData snapshot so assessment
    // pre-fill doesn't serve stale values after a profile update.
    const existingFormData = (existingData as Record<string, unknown>).formData as Record<string, unknown> | undefined;
    const contactPatch: Record<string, unknown> = {};
    if (existingFormData) {
      if ('email' in data && data.email !== undefined) contactPatch['formData.email'] = data.email;
      if ('phone' in data && data.phone !== undefined) contactPatch['formData.phone'] = data.phone;
      if ('dateOfBirth' in data && data.dateOfBirth !== undefined) contactPatch['formData.dateOfBirth'] = data.dateOfBirth;
    }

    await updateDoc(legacyRef, {
      ...data,
      ...contactPatch,
      organizationId: validOrgId,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  // New client: check clientLookup to see if they were already created with a UUID
  const slug = generateClientSlug(clientName);
  const lookupRef = doc(getDb(), ORGANIZATION.clientLookup.doc(validOrgId, slug));
  const lookupSnap = await getDoc(lookupRef);

  if (lookupSnap.exists()) {
    // Client exists at a UUID doc ID — update that doc
    const { clientId: existingUuid } = lookupSnap.data() as { clientId: string; clientName: string };
    const uuidRef = doc(getDb(), ORGANIZATION.clients.doc(validOrgId, existingUuid));
    await updateDoc(uuidRef, {
      ...data,
      organizationId: validOrgId,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  // Truly new client: generate a stable UUID and write both the profile and lookup docs
  const newClientId = crypto.randomUUID();
  const uuidRef = doc(getDb(), ORGANIZATION.clients.doc(validOrgId, newClientId));
  await setDoc(uuidRef, {
    clientName,
    clientId: newClientId,
    legacySlug: slug,
    organizationId: validOrgId,
    assignedCoachUid: coachUid,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Write lookup so slug → UUID resolution works in all callers
  await setDoc(lookupRef, { clientId: newClientId, clientName });

  // Notify the coach that a new client has been added (non-blocking)
  try {
    const { writeNotification } = await import('@/services/notificationWriter');
    await writeNotification({
      recipientUid: coachUid,
      type: 'new_client',
      title: `${clientName} added`,
      body: 'New client profile created. Schedule their first assessment when ready.',
      priority: 'low',
      actionUrl: `/client/${encodeURIComponent(clientName)}`,
    });
  } catch {
    logger.warn('[ClientProfiles] Failed to send new_client notification (non-fatal)');
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
 * Update which pillars are actively tracked for a specific client.
 */
export async function updateClientActivePillars(
  clientName: string,
  organizationId: string,
  activePillars: import('@/types/client').PartialAssessmentCategory[],
): Promise<void> {
  const ref = clientProfileDoc(organizationId, clientName);
  await updateDoc(ref, {
    activePillars,
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

    // Update current/state clientName display
    const currentPath = ORGANIZATION.clients.current(validOrgId, oldSlug);
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
  // Patch embedded formData.fullName so stale old-name references don't recreate the old slug doc
  const oldFormData = (oldData as Record<string, unknown>).formData as Record<string, unknown> | undefined;
  await setDoc(newRef, {
    ...oldData,
    clientName: normalizedNew,
    clientNameLower: normalizedNew.toLowerCase(),
    ...(oldFormData ? { formData: { ...oldFormData, fullName: normalizedNew } } : {}),
    updatedAt: serverTimestamp(),
  });

  // 2b. Migrate current/state (also patch embedded formData.fullName)
  const oldCurrentPath = ORGANIZATION.clients.current(validOrgId, oldSlug);
  const newCurrentPath = ORGANIZATION.clients.current(validOrgId, newSlug);
  const oldCurrentSnap = await getDoc(doc(db, oldCurrentPath));
  if (oldCurrentSnap.exists()) {
    const oldCurrentData = oldCurrentSnap.data() as Record<string, unknown>;
    const currentFormData = oldCurrentData.formData as Record<string, unknown> | undefined;
    await setDoc(doc(db, newCurrentPath), {
      ...oldCurrentData,
      clientName: normalizedNew,
      clientNameLower: normalizedNew.toLowerCase(),
      ...(currentFormData ? { formData: { ...currentFormData, fullName: normalizedNew } } : {}),
    });
  }

  // 2c. Migrate sessions (preserve document IDs for chronological sort)
  const oldSessionsPath = ORGANIZATION.clients.sessions.collection(validOrgId, oldSlug);
  const newSessionsPath = ORGANIZATION.clients.sessions.collection(validOrgId, newSlug);
  const sessionDocs = await getDocs(query(collection(db, oldSessionsPath), limit(MAX_BATCH_LIMIT)));
  for (const sessionDoc of sessionDocs.docs) {
    await setDoc(doc(collection(db, newSessionsPath), sessionDoc.id), sessionDoc.data());
  }

  // 2d. Verify session copies match before deleting
  const copiedSessions = await getDocs(query(collection(db, newSessionsPath), limit(MAX_BATCH_LIMIT)));
  if (copiedSessions.size < sessionDocs.size) {
    logger.error('[Rename] Copy verification failed, aborting deletion of old docs');
    return { success: false, message: 'Migration verification failed. Old data preserved.' };
  }

  // 2e. Migrate roadmap (not a subcollection of current/sessions — must be copied explicitly)
  const oldRoadmapPath = ORGANIZATION.clients.roadmap(validOrgId, oldSlug);
  const newRoadmapPath = ORGANIZATION.clients.roadmap(validOrgId, newSlug);
  const oldRoadmapSnap = await getDoc(doc(db, oldRoadmapPath));
  if (oldRoadmapSnap.exists()) {
    await setDoc(doc(db, newRoadmapPath), {
      ...oldRoadmapSnap.data(),
      clientName: normalizedNew,
    });
  }

  // 2f. Delete old documents
  for (const sessionDoc of sessionDocs.docs) await deleteDoc(sessionDoc.ref);
  if (oldCurrentSnap.exists()) await deleteDoc(doc(db, oldCurrentPath));
  if (oldRoadmapSnap.exists()) await deleteDoc(doc(db, oldRoadmapPath));
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

  // 2. Update coachUid on the client profile doc
  await updateDoc(profileRef, {
    coachUid: toCoachUid,
    updatedAt: serverTimestamp(),
  });

  // 3. Update coachUid on the live current/state doc
  const currentPath = ORGANIZATION.clients.current(validOrgId, slug);
  const currentSnap = await getDoc(doc(db, currentPath));
  if (currentSnap.exists()) {
    await updateDoc(doc(db, currentPath), { coachUid: toCoachUid });
  }

  logger.info(`[Transfer] Client "${normalized}" transferred from ${fromCoachUid} to ${toCoachUid}`);
  return { success: true, message: 'Client transferred successfully.' };
}

// ============================================================================
// CLIENT PAUSE / UNPAUSE
// ============================================================================

/**
 * Pause a client's account, freezing all reassessment countdowns.
 * Can be initiated by a coach directly or set as a client request.
 */
export async function pauseClient(params: {
  organizationId: string;
  clientSlug: string;
  pausedBy: string; // coach UID or 'client-request'
  reason?: string;
  profile?: UserProfile | null;
}): Promise<void> {
  const { organizationId, clientSlug, pausedBy, reason, profile } = params;
  const validOrgId = validateOrganizationId(organizationId, profile);
  const db = getDb();
  const clientRef = doc(db, ORGANIZATION.clients.doc(validOrgId, clientSlug));

  await updateDoc(clientRef, {
    status: 'paused',
    pausedAt: serverTimestamp(),
    pausedBy,
    pauseReason: reason || null,
    pauseApproved: pausedBy !== 'client-request', // Auto-approved if coach initiates
    updatedAt: serverTimestamp(),
  });
}

const CLIENT_BATCH_WRITE_MAX = 400;

/**
 * Pause many clients in chunked Firestore batches (same fields as {@link pauseClient}).
 */
export async function batchPauseClients(params: {
  organizationId: string;
  clientSlugs: string[];
  pausedBy: string;
  profile?: UserProfile | null;
}): Promise<void> {
  const { clientSlugs, pausedBy, profile } = params;
  const validOrgId = validateOrganizationId(params.organizationId, profile);
  const db = getDb();
  const pauseApproved = pausedBy !== 'client-request';
  const payload: UpdateData<DocumentData> = {
    status: 'paused',
    pausedAt: serverTimestamp(),
    pausedBy,
    pauseReason: null,
    pauseApproved,
    updatedAt: serverTimestamp(),
  };

  for (let i = 0; i < clientSlugs.length; i += CLIENT_BATCH_WRITE_MAX) {
    const chunk = clientSlugs.slice(i, i + CLIENT_BATCH_WRITE_MAX);
    const batch = writeBatch(db);
    for (const slug of chunk) {
      const ref = doc(db, ORGANIZATION.clients.doc(validOrgId, slug));
      batch.update(ref, payload);
    }
    await batch.commit();
  }
}

/**
 * Unpause a client's account.
 * The coach can choose to resume remaining time or reset countdowns.
 */
export async function unpauseClient(params: {
  organizationId: string;
  clientSlug: string;
  mode: 'resume' | 'reset';
  profile?: UserProfile | null;
}): Promise<void> {
  const { organizationId, clientSlug, mode, profile } = params;
  const validOrgId = validateOrganizationId(organizationId, profile);
  const db = getDb();
  const clientRef = doc(db, ORGANIZATION.clients.doc(validOrgId, clientSlug));

  const snap = await getDoc(clientRef);
  if (!snap.exists()) throw new Error('Client not found');

  const data = snap.data() as ClientProfile;
  const pausedAt = data.pausedAt?.toDate();
  const now = new Date();

  // Build the update payload
  const updates: Record<string, unknown> = {
    status: 'active',
    pausedAt: null,
    pausedBy: null,
    pauseReason: null,
    pauseApproved: null,
    updatedAt: serverTimestamp(),
  };

  if (mode === 'resume' && pausedAt) {
    // Shift all pillar dates forward by the paused duration
    const pausedMs = now.getTime() - pausedAt.getTime();
    const dateFields = [
      'lastAssessmentDate',
      'lastPostureDate',
      'lastFitnessDate',
      'lastStrengthDate',
      'lastLifestyleDate',
    ] as const;

    for (const field of dateFields) {
      const ts = data[field];
      if (ts) {
        const shifted = new Date(ts.toDate().getTime() + pausedMs);
        updates[field] = Timestamp.fromDate(shifted);
      }
    }

    const profileRow = data as Record<string, unknown>;
    for (const field of clientProfileBodyCompDateFieldKeys()) {
      const ts = profileRow[field];
      if (ts && typeof (ts as Timestamp).toDate === 'function') {
        const shifted = new Date((ts as Timestamp).toDate().getTime() + pausedMs);
        updates[field] = Timestamp.fromDate(shifted);
      }
    }

    // Also shift due date overrides
    if (data.dueDateOverrides) {
      const shiftedOverrides: Record<string, Timestamp> = {};
      for (const [key, ts] of Object.entries(data.dueDateOverrides)) {
        shiftedOverrides[key] = Timestamp.fromDate(new Date(ts.toDate().getTime() + pausedMs));
      }
      updates.dueDateOverrides = shiftedOverrides;
    }
  } else if (mode === 'reset') {
    // Reset all pillar dates to now (fresh countdown cycle)
    const nowTs = Timestamp.fromDate(now);
    updates.lastAssessmentDate = nowTs;
    updates[CLIENT_PROFILE_LAST_BODY_COMP_AT] = nowTs;
    updates.lastPostureDate = nowTs;
    updates.lastFitnessDate = nowTs;
    updates.lastStrengthDate = nowTs;
    updates.lastLifestyleDate = nowTs;
    updates.dueDateOverrides = null;
  }

  await updateDoc(clientRef, updates);
}

/**
 * Approve or deny a client-requested pause.
 */
export async function handlePauseRequest(params: {
  organizationId: string;
  clientSlug: string;
  approved: boolean;
  profile?: UserProfile | null;
}): Promise<void> {
  const { organizationId, clientSlug, approved, profile } = params;
  const validOrgId = validateOrganizationId(organizationId, profile);
  const db = getDb();
  const clientRef = doc(db, ORGANIZATION.clients.doc(validOrgId, clientSlug));

  if (approved) {
    await updateDoc(clientRef, {
      pauseApproved: true,
      updatedAt: serverTimestamp(),
    });
  } else {
    // Denied: revert to active
    await updateDoc(clientRef, {
      status: 'active',
      pausedAt: null,
      pausedBy: null,
      pauseReason: null,
      pauseApproved: null,
      updatedAt: serverTimestamp(),
    });
  }
}

// ============================================================================
// CLIENT ARCHIVE / REACTIVATE
// ============================================================================

/**
 * Archive a client who has left. Removes them from active dashboards
 * but preserves all data for potential reactivation.
 */
export async function archiveClient(params: {
  organizationId: string;
  clientSlug: string;
  archivedBy: string;
  reason?: string;
  profile?: UserProfile | null;
  /** Original client name for fallback lookup when slug doesn't match */
  clientName?: string;
}): Promise<void> {
  const { organizationId, clientSlug: inputSlug, archivedBy, reason, profile, clientName } = params;
  const validOrgId = validateOrganizationId(organizationId, profile);
  const db = getDb();

  // Resolve actual doc path (handles UUID-migrated clients)
  let resolvedSlug = inputSlug;
  const expectedRef = doc(db, ORGANIZATION.clients.doc(validOrgId, resolvedSlug));
  const expectedSnap = await getDoc(expectedRef);
  if (!expectedSnap.exists() && clientName) {
    const clientsCol = collection(db, ORGANIZATION.clients.collection(validOrgId));
    const nameQuery = query(clientsCol, where('clientName', '==', clientName), limit(1));
    const found = await getDocs(nameQuery);
    if (!found.empty) {
      resolvedSlug = found.docs[0].id;
    }
  }
  const clientRef = doc(db, ORGANIZATION.clients.doc(validOrgId, resolvedSlug));

  await updateDoc(clientRef, {
    status: 'archived',
    archivedAt: serverTimestamp(),
    archivedBy,
    archiveReason: reason || null,
    pausedAt: null,
    pausedBy: null,
    pauseReason: null,
    pauseApproved: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Archive many clients in chunked Firestore batches (same fields as {@link archiveClient}).
 */
export async function batchArchiveClients(params: {
  organizationId: string;
  clientSlugs: string[];
  archivedBy: string;
  profile?: UserProfile | null;
  /** Original client names for fallback lookup when slugs don't match */
  clientNames?: string[];
}): Promise<void> {
  const { clientSlugs, archivedBy, profile, clientNames } = params;
  const validOrgId = validateOrganizationId(params.organizationId, profile);
  const db = getDb();
  const payload: UpdateData<DocumentData> = {
    status: 'archived',
    archivedAt: serverTimestamp(),
    archivedBy,
    archiveReason: null,
    pausedAt: null,
    pausedBy: null,
    pauseReason: null,
    pauseApproved: null,
    updatedAt: serverTimestamp(),
  };

  // Resolve actual doc paths (handles UUID-migrated clients)
  const resolvedSlugs: string[] = [];
  for (let idx = 0; idx < clientSlugs.length; idx++) {
    const slug = clientSlugs[idx];
    const expectedRef = doc(db, ORGANIZATION.clients.doc(validOrgId, slug));
    const snap = await getDoc(expectedRef);
    if (snap.exists()) {
      resolvedSlugs.push(slug);
    } else if (clientNames?.[idx]) {
      // Slug doesn't match a real doc — search by name
      const clientsCol = collection(db, ORGANIZATION.clients.collection(validOrgId));
      const nameQuery = query(clientsCol, where('clientName', '==', clientNames[idx]), limit(1));
      const found = await getDocs(nameQuery);
      resolvedSlugs.push(found.empty ? slug : found.docs[0].id);
    } else {
      resolvedSlugs.push(slug);
    }
  }

  for (let i = 0; i < resolvedSlugs.length; i += CLIENT_BATCH_WRITE_MAX) {
    const chunk = resolvedSlugs.slice(i, i + CLIENT_BATCH_WRITE_MAX);
    const batch = writeBatch(db);
    for (const slug of chunk) {
      const ref = doc(db, ORGANIZATION.clients.doc(validOrgId, slug));
      batch.update(ref, payload);
    }
    await batch.commit();
  }
}

/**
 * Reactivate an archived client. Same options as unpause:
 * - resume: shift all pillar dates forward by the archived duration
 * - reset: start fresh from today
 */
export async function reactivateClient(params: {
  organizationId: string;
  clientSlug: string;
  mode: 'resume' | 'reset';
  profile?: UserProfile | null;
}): Promise<void> {
  const { organizationId, clientSlug, mode, profile } = params;
  const validOrgId = validateOrganizationId(organizationId, profile);
  const db = getDb();
  const clientRef = doc(db, ORGANIZATION.clients.doc(validOrgId, clientSlug));

  const snap = await getDoc(clientRef);
  if (!snap.exists()) throw new Error('Client not found');

  const data = snap.data() as ClientProfile;
  const archivedAt = data.archivedAt?.toDate();
  const now = new Date();

  const updates: Record<string, unknown> = {
    status: 'active',
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    updatedAt: serverTimestamp(),
  };

  if (mode === 'resume' && archivedAt) {
    const archivedMs = now.getTime() - archivedAt.getTime();
    const dateFields = [
      'lastAssessmentDate',
      'lastPostureDate',
      'lastFitnessDate',
      'lastStrengthDate',
      'lastLifestyleDate',
    ] as const;

    for (const field of dateFields) {
      const ts = data[field];
      if (ts) {
        const shifted = new Date(ts.toDate().getTime() + archivedMs);
        updates[field] = Timestamp.fromDate(shifted);
      }
    }

    const profileRow = data as Record<string, unknown>;
    for (const field of clientProfileBodyCompDateFieldKeys()) {
      const ts = profileRow[field];
      if (ts && typeof (ts as Timestamp).toDate === 'function') {
        const shifted = new Date((ts as Timestamp).toDate().getTime() + archivedMs);
        updates[field] = Timestamp.fromDate(shifted);
      }
    }

    if (data.dueDateOverrides) {
      const shiftedOverrides: Record<string, Timestamp> = {};
      for (const [key, ts] of Object.entries(data.dueDateOverrides)) {
        shiftedOverrides[key] = Timestamp.fromDate(new Date(ts.toDate().getTime() + archivedMs));
      }
      updates.dueDateOverrides = shiftedOverrides;
    }
  } else if (mode === 'reset') {
    const nowTs = Timestamp.fromDate(now);
    updates.lastAssessmentDate = nowTs;
    updates[CLIENT_PROFILE_LAST_BODY_COMP_AT] = nowTs;
    updates.lastPostureDate = nowTs;
    updates.lastFitnessDate = nowTs;
    updates.lastStrengthDate = nowTs;
    updates.lastLifestyleDate = nowTs;
    updates.dueDateOverrides = null;
  }

  await updateDoc(clientRef, updates);
}

/**
 * Permanently delete a client and ALL associated data from Firestore.
 * This action is irreversible.
 */
export async function deleteClientPermanently(params: {
  organizationId: string;
  clientSlug: string;
  clientName: string;
  /** Known assessment summary doc ID — used for a direct delete so the client disappears from the dashboard immediately even if clientNameLower is missing/mismatched. */
  knownAssessmentId?: string;
}): Promise<void> {
  const { organizationId, clientSlug: inputSlug, clientName, knownAssessmentId } = params;
  const db = getDb();
  const clientNameLower = clientName.toLowerCase();

  // Verify the client doc exists at the expected slug path. If not, search by name
  // to find the actual doc ID (handles UUID-migrated or mismatched slug clients).
  let clientSlug = inputSlug;
  const expectedRef = doc(db, ORGANIZATION.clients.doc(organizationId, clientSlug));
  const expectedSnap = await getDoc(expectedRef);
  if (!expectedSnap.exists()) {
    // Search for the client by name in the collection
    const clientsCol = collection(db, ORGANIZATION.clients.collection(organizationId));
    const nameQuery = query(clientsCol, where('clientName', '==', clientName), limit(1));
    const found = await getDocs(nameQuery);
    if (!found.empty) {
      clientSlug = found.docs[0].id;
    }
    // If still not found, the slug will be used as-is and the delete will fail with a clear error
  }

  async function deleteSubcollection(colPath: string): Promise<void> {
    const colRef = collection(db, colPath);
    const PAGE = 400;
    while (true) {
      const snap = await getDocs(query(colRef, limit(PAGE)));
      if (snap.empty) return;
      let batch = writeBatch(db);
      let count = 0;
      for (const docSnap of snap.docs) {
        batch.delete(docSnap.ref);
        count++;
        if (count >= PAGE) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      if (snap.size < PAGE) return;
    }
  }

  if (!organizationId?.trim()) {
    throw new Error('Cannot delete client: organization ID is missing.');
  }

  // 1. Delete sessions sub-collection (non-critical cleanup)
  await deleteSubcollection(ORGANIZATION.clients.sessions.collection(organizationId, clientSlug)).catch((): void => undefined);

  // 2. Delete current/state doc (non-critical cleanup)
  await deleteDoc(doc(db, ORGANIZATION.clients.current(organizationId, clientSlug))).catch((): void => undefined);

  // 3. Delete draft (non-critical cleanup)
  await deleteDoc(doc(db, ORGANIZATION.clients.draft(organizationId, clientSlug))).catch((): void => undefined);

  // 4. Delete roadmap and achievements (non-critical cleanup)
  await deleteDoc(doc(db, ORGANIZATION.clients.roadmap(organizationId, clientSlug))).catch((): void => undefined);
  await deleteSubcollection(ORGANIZATION.clientAchievements.collection(organizationId, clientSlug)).catch(
    (): void => undefined,
  );

  // 5. Delete public report share tokens (non-critical cleanup)
  try {
    const publicReportsSnap = await getDocs(
      query(
        collection(db, 'publicReports'),
        where('clientName', '==', clientName),
        where('organizationId', '==', organizationId),
        limit(PUBLIC_REPORTS_BY_CLIENT_DELETE_LIMIT),
      ),
    );
    if (!publicReportsSnap.empty) {
      const batch = writeBatch(db);
      publicReportsSnap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch { /* non-fatal */ }

  // 6. Delete client profile — CRITICAL: if this fails, the client still appears in the roster.
  // Do NOT catch this error; let it propagate so the caller knows deletion failed.
  await deleteDoc(doc(db, ORGANIZATION.clients.doc(organizationId, clientSlug)));

  // 7. Decrement org stats (non-critical cleanup, best-effort after profile is gone)
  await updateDoc(doc(db, ORGANIZATION.doc(organizationId)), {
    'stats.clientCount': increment(-1),
    'stats.lastUpdated': serverTimestamp(),
  }).catch((): void => undefined);
}
