import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "@/services/firebase";
import type { FormData } from "@/contexts/FormContext";
import { sanitizeForFirestore } from "@/lib/utils/firebaseUtils";
import { PostureAnalysisResult } from "@/lib/ai/postureAnalysis";
import { logger } from "@/lib/utils/logger";
import { ORGANIZATION } from "@/lib/database/paths";
import { getPillarLabel } from "@/constants/pillars";

const MAX_HISTORY_LIMIT = 100;
const MAX_SNAPSHOT_LIMIT = 100;

export type FormValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | Record<string, string>
  | Record<string, PostureAnalysisResult>;

export type AssessmentChange = {
  id?: string;
  timestamp: Timestamp;
  type:
    | "full"
    | "partial-bodycomp"
    | "partial-posture"
    | "partial-fitness"
    | "partial-strength"
    | "partial-lifestyle";
  category: "bodycomp" | "posture" | "fitness" | "strength" | "lifestyle" | "all";
  changes: Record<string, { old: FormValue; new: FormValue }>;
  updatedBy: string;
};

export type AssessmentSnapshot = {
  id?: string;
  timestamp: Timestamp;
  /** full-assessment | partial-bodycomp | partial-posture | partial-fitness | partial-strength | partial-lifestyle | monthly (legacy: manual) */
  type: "full-assessment" | "full" | "partial-bodycomp" | "partial-posture" | "partial-fitness" | "partial-strength" | "partial-lifestyle" | "monthly" | "manual";
  formData: FormData;
  overallScore: number;
  notes?: string;
};

/** Delegate to the single source of truth for slug generation */
const getClientSlug = (clientName: string) => {
  const safeName = (clientName || "unnamed-client").trim().replace(/\s+/g, " ") || "unnamed-client";
  return safeName.toLowerCase().replace(/\s+/g, "-");
};

/**
 * Get the current assessment document reference
 * Uses organization path when orgId is provided
 */
const getCurrentAssessmentDoc = (orgId: string, clientName: string) =>
  doc(getDb(), ORGANIZATION.assessmentHistory.current(orgId, getClientSlug(clientName)));

/**
 * Get the history collection reference
 * Uses organization path when orgId is provided
 */
const getHistoryCollection = (orgId: string, clientName: string) =>
  collection(getDb(), ORGANIZATION.assessmentHistory.history(orgId, getClientSlug(clientName)));

/**
 * Get the snapshots collection reference
 * Uses organization path when orgId is provided
 */
const getSnapshotsCollection = (orgId: string, clientName: string) =>
  collection(getDb(), ORGANIZATION.assessmentHistory.snapshots(orgId, getClientSlug(clientName)));

/**
 * Get the current assessment for a client
 * @param coachUid - The coach's user ID (kept for backwards compatibility, used as updatedBy)
 * @param clientName - The client's name
 * @param organizationId - Required: The organization ID for path construction
 */
export async function getCurrentAssessment(
  coachUid: string,
  clientName: string,
  organizationId?: string
): Promise<{
  formData: FormData;
  overallScore: number;
  lastUpdated: Timestamp | null;
  organizationId?: string;
} | null> {
  if (!organizationId) {
    logger.warn('getCurrentAssessment called without organizationId', 'assessmentHistory');
    return null;
  }

  const ref = getCurrentAssessmentDoc(organizationId, clientName);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as {
    formData?: FormData;
    overallScore?: number;
    lastUpdated?: Timestamp;
    organizationId?: string;
  };

  // Security check: verify organizationId matches
  if (data.organizationId && data.organizationId !== organizationId) {
    logger.warn(
      `Organization ID mismatch for client ${clientName}`,
      'assessmentHistory:security'
    );
    return null;
  }

  return {
    formData: (data.formData as FormData) ?? ({} as FormData),
    overallScore: typeof data.overallScore === "number" ? data.overallScore : 0,
    lastUpdated: (data.lastUpdated as Timestamp | undefined) ?? null,
    organizationId: data.organizationId,
  };
}

/**
 * Calculate what fields changed between old and new form data
 */
function calculateChanges(
  oldData: FormData,
  newData: FormData,
  category?: "bodycomp" | "posture" | "fitness" | "strength" | "lifestyle" | "all"
): Record<string, { old: FormValue; new: FormValue }> {
  const changes: Record<string, { old: FormValue; new: FormValue }> = {};

  // Define field categories
  const categoryFields: Record<string, string[]> = {
    bodycomp: [
      "inbodyWeightKg",
      "inbodyBodyFatPct",
      "bodyFatMassKg",
      "inbodyBmi",
      "visceralFatLevel",
      "skeletalMuscleMassKg",
      "totalBodyWaterL",
      "waistHipRatio",
      "segmentalArmRightKg",
      "segmentalArmLeftKg",
      "segmentalLegRightKg",
      "segmentalLegLeftKg",
      "segmentalTrunkKg",
      "bmrKcal",
      "inbodyScore",
    ],
    posture: [
      "postureInputMode",
      "postureAiResults",
      "postureSeverity",
      "postureForwardHead",
      "postureRoundedShoulders",
      "postureHeadOverall",
      "postureShouldersOverall",
      "postureBackOverall",
      "postureHipsOverall",
      "postureKneesOverall",
    ],
    fitness: [
      "cardioTestType",
      "cardioTestSelected",
      "cardioRestingHr",
      "cardioPost1MinHr",
      "cardioMedicationFlag",
      "cardioFinalHeartRate",
      "cardioVo2MaxEstimate",
      "cardioTestInstructions",
      "cardioNotes",
      "ymcaStepHeight",
      "ymcaMetronomeBpm",
      "ymcaPreTestHeartRate",
      "ymcaPost1MinHeartRate",
      "ymcaRecoveryHeartRate1",
      "ymcaRpe",
      "ymcaNotes",
      "treadmillProtocol",
      "treadmillIncline",
      "treadmillSpeed",
      "treadmillDurationMin",
      "treadmillFinalHeartRate",
      "treadmillRpe",
      "treadmillTerminationReason",
      "treadmillNotes",
    ],
    strength: [
      "pushupMaxReps",
      "squatsOneMinuteReps",
      "pushupsOneMinuteReps",
      "gripLeftKg",
      "gripRightKg",
      "chairStandReps",
      "dynamometerForce",
    ],
    lifestyle: [
      "activityLevel",
      "sleepDuration",
      "sleepQuality",
      "sleepConsistency",
      "stressLevel",
      "workHoursPerDay",
      "nutritionHabits",
      "hydrationHabits",
      "stepsPerDay",
      "sedentaryHours",
      "caffeineCupsPerDay",
      "alcoholFrequency",
      "lastCaffeineIntake",
    ],
  };

  const fieldsToCheck = category
    ? categoryFields[category] || []
    : Object.keys(newData);

  for (const field of fieldsToCheck) {
    const oldValue = oldData[field as keyof FormData];
    const newValue = newData[field as keyof FormData];

    if (
      oldValue !== newValue &&
      (oldValue !== undefined || newValue !== undefined)
    ) {
      changes[field] = {
        old: oldValue ?? null,
        new: newValue ?? null,
      };
    }
  }

  return changes;
}

/**
 * Update current assessment and log changes
 * @param coachUid - The coach's user ID (used for tracking who made changes)
 * @param clientName - The client's name
 * @param formData - The form data to save
 * @param overallScore - The calculated overall score
 * @param changeType - The type of change being made
 * @param category - The category of the change (optional)
 * @param organizationId - Required: The organization ID for path construction
 */
export async function updateCurrentAssessment(
  coachUid: string,
  clientName: string,
  formData: FormData,
  overallScore: number,
  changeType: AssessmentChange["type"],
  category?: AssessmentChange["category"],
  organizationId?: string
): Promise<void> {
  if (!organizationId) {
    throw new Error('organizationId is required for updateCurrentAssessment');
  }

  // Get current assessment
  const current = await getCurrentAssessment(
    coachUid,
    clientName,
    organizationId
  );
  const oldData = current?.formData ?? ({} as FormData);

  // Calculate changes - filter out 'all' category for calculateChanges
  const changes = calculateChanges(
    oldData,
    formData,
    category === "all" ? undefined : category
  );

  // If no changes, skip update
  if (Object.keys(changes).length === 0) {
    return;
  }

  // Update current assessment using organization path
  const currentRef = getCurrentAssessmentDoc(organizationId, clientName);
  try {
    await setDoc(
      currentRef,
      {
        formData: sanitizeForFirestore(formData),
        overallScore: overallScore ?? 0,
        lastUpdated: serverTimestamp(),
        clientName: clientName || "Unnamed client",
        organizationId: organizationId,
        coachUid: coachUid, // Track which coach made the update
      },
      { merge: false }
    );
  } catch (err) {
    logger.error(`[SYNC] ✗ Failed to save current assessment:`, err);
    throw err;
  }

  // Log change to history using organization path
  const historyRef = getHistoryCollection(organizationId, clientName);
  try {
    await addDoc(historyRef, {
      timestamp: serverTimestamp(),
      type: changeType,
      category: category || "all",
      changes: sanitizeForFirestore(changes),
      updatedBy: coachUid || "unknown",
      organizationId: organizationId,
    });
  } catch (err) {
    logger.warn(`[SYNC] ✗ Failed to log history (non-critical):`, err);
  }

  // Check if we should create a snapshot (monthly, full assessment, or partial update)
  const now = new Date();
  const shouldCreateSnapshot =
    changeType === "full" ||
    changeType.startsWith("partial-") ||
    (now.getDate() === 1 && !current?.lastUpdated);

  if (shouldCreateSnapshot) {
    const snapshotType =
      changeType === "full"
        ? "full-assessment"
        : changeType.startsWith("partial-")
        ? changeType
        : "monthly";
    await createSnapshot(
      coachUid,
      clientName,
      formData,
      overallScore,
      snapshotType,
      undefined,
      organizationId
    );
  }
}

/**
 * Create a snapshot of the current assessment state
 * @param coachUid - The coach's user ID (tracked for audit purposes)
 * @param clientName - The client's name
 * @param formData - The form data to snapshot
 * @param overallScore - The calculated overall score
 * @param snapshotType - The type of snapshot
 * @param notes - Optional notes for the snapshot
 * @param organizationId - Required: The organization ID for path construction
 */
export async function createSnapshot(
  coachUid: string,
  clientName: string,
  formData: FormData,
  overallScore: number,
  snapshotType: AssessmentSnapshot["type"] = "full-assessment",
  notes?: string,
  organizationId?: string
): Promise<string> {
  if (!organizationId) {
    throw new Error('organizationId is required for createSnapshot');
  }

  const snapshotsRef = getSnapshotsCollection(organizationId, clientName);
  const docRef = await addDoc(snapshotsRef, {
    timestamp: serverTimestamp(),
    type: snapshotType,
    formData: sanitizeForFirestore(formData),
    overallScore: overallScore ?? 0,
    notes: notes ?? null,
    organizationId: organizationId,
    createdBy: coachUid,
  });
  return docRef.id;
}

/**
 * Get change history for a client
 * @param coachUid - The coach's user ID (kept for backwards compatibility)
 * @param clientName - The client's name
 * @param limitCount - Maximum number of history entries to return
 * @param organizationId - Required: The organization ID for path construction
 */
export async function getChangeHistory(
  coachUid: string,
  clientName: string,
  limitCount: number = 100,
  organizationId?: string
): Promise<AssessmentChange[]> {
  if (!organizationId) {
    logger.warn('getChangeHistory called without organizationId', 'assessmentHistory');
    return [];
  }

  const resolvedLimit = Math.min(limitCount, MAX_HISTORY_LIMIT);
  const historyRef = getHistoryCollection(organizationId, clientName);

  const q = query(
    historyRef,
    orderBy("timestamp", "desc"),
    limit(resolvedLimit)
  );

  let snap;
  try {
    snap = await getDocs(q);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "failed-precondition"
    ) {
      // Fallback without orderBy if index doesn't exist
      const fallbackQuery = query(historyRef, limit(resolvedLimit));
      snap = await getDocs(fallbackQuery);
    } else {
      throw error;
    }
  }

  const changes: AssessmentChange[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<AssessmentChange>;
    changes.push({
      id: docSnap.id,
      timestamp: (data.timestamp as Timestamp) ?? Timestamp.now(),
      type: data.type as AssessmentChange["type"],
      category: data.category as AssessmentChange["category"],
      changes: data.changes ?? {},
      updatedBy: data.updatedBy ?? "",
    });
  });

  // Sort by timestamp descending
  return changes.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
}

/**
 * Get snapshots for a client
 * @param coachUid - The coach's user ID (kept for backwards compatibility)
 * @param clientName - The client's name
 * @param limitCount - Maximum number of snapshots to return
 * @param organizationId - Required: The organization ID for path construction
 */
export async function getSnapshots(
  coachUid: string,
  clientName: string,
  limitCount: number = 50,
  organizationId?: string
): Promise<AssessmentSnapshot[]> {
  if (!organizationId) {
    logger.warn('getSnapshots called without organizationId', 'assessmentHistory');
    return [];
  }

  const resolvedLimit = Math.min(limitCount, MAX_SNAPSHOT_LIMIT);
  const snapshotsRef = getSnapshotsCollection(organizationId, clientName);

  const q = query(
    snapshotsRef,
    orderBy("timestamp", "desc"),
    limit(resolvedLimit)
  );

  let snap;
  try {
    snap = await getDocs(q);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "failed-precondition"
    ) {
      // Fallback without orderBy if index doesn't exist
      const fallbackQuery = query(snapshotsRef, limit(resolvedLimit));
      snap = await getDocs(fallbackQuery);
    } else {
      throw error;
    }
  }

  const snapshots: AssessmentSnapshot[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<AssessmentSnapshot>;
    snapshots.push({
      id: docSnap.id,
      timestamp: (data.timestamp as Timestamp) ?? Timestamp.now(),
      type: data.type as AssessmentSnapshot["type"],
      formData: (data.formData as FormData) ?? ({} as FormData),
      overallScore:
        typeof data.overallScore === "number" ? data.overallScore : 0,
      notes: data.notes,
    });
  });

  // Sort by timestamp descending
  return snapshots.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
}

const HISTORY_LIST_LIMIT = 50;

/** Human-readable label for snapshot type. Full or pillar short names (Body Comp, Strength, etc.). Never "Manual". */
export function formatSnapshotTypeLabel(type: string): string {
  if (type === 'full' || type === 'full-assessment') return 'Full';
  if (type === 'monthly') return 'Monthly';
  if (type === 'manual') return 'Partial';
  if (type.startsWith('partial-')) {
    const category = type.replace('partial-', '');
    return getPillarLabel(category, 'short');
  }
  return type;
}

/**
 * Get snapshot-based assessment history for a client (for dashboard history list).
 * Returns snapshots in descending date order; use limit for pagination.
 */
export async function getClientAssessmentHistory(
  coachUid: string,
  clientName: string,
  organizationId: string | undefined,
  limitCount: number = HISTORY_LIST_LIMIT
): Promise<AssessmentSnapshot[]> {
  return getSnapshots(coachUid, clientName, limitCount, organizationId);
}

/**
 * Delete a snapshot. If it was the most recent, restores current and summary from the previous snapshot (or clears if none).
 */
export async function deleteSnapshot(
  coachUid: string,
  clientName: string,
  snapshotId: string,
  organizationId: string
): Promise<{ success: boolean; message: string }> {
  const db = getDb();
  const snapshots = await getSnapshots(coachUid, clientName, 100, organizationId);
  const toDelete = snapshots.find((s) => s.id === snapshotId);
  if (!toDelete) {
    return { success: false, message: 'Snapshot not found' };
  }

  const slug = getClientSlug(clientName);
  const snapRef = doc(db, ORGANIZATION.assessmentHistory.snapshots(organizationId, slug), snapshotId);
  await deleteDoc(snapRef);

  const wasLatest = snapshots[0]?.id === snapshotId;
  if (wasLatest && snapshots.length > 1) {
    const prev = snapshots[1];
    await restoreFromSnapshot(coachUid, clientName, prev.id, organizationId);
    const { summarizeScores } = await import('@/lib/scoring');
    const summary = summarizeScores(prev.formData);
    const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(organizationId));
    const q = query(
      assessmentsRef,
      where('clientNameLower', '==', clientName.toLowerCase()),
      limit(1)
    );
    const sumSnap = await getDocs(q);
    if (!sumSnap.empty) {
      const prevScore = snapshots.length > 2 ? snapshots[2].overallScore : 0;
      await updateDoc(sumSnap.docs[0].ref, {
        formData: prev.formData,
        overallScore: prev.overallScore,
        scoresSummary: summary,
        previousScore: prevScore,
        trend: prev.overallScore - prevScore,
      });
    }
    return { success: true, message: 'Snapshot deleted; current restored from previous.' };
  }
  if (wasLatest && snapshots.length === 1) {
    const currentRef = doc(db, ORGANIZATION.assessmentHistory.current(organizationId, slug));
    const emptyFormData = {} as FormData;
    await setDoc(currentRef, {
      formData: emptyFormData,
      overallScore: 0,
      lastUpdated: serverTimestamp(),
      organizationId,
    }, { merge: true });
    const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(organizationId));
    const q = query(
      assessmentsRef,
      where('clientNameLower', '==', clientName.toLowerCase()),
      limit(1)
    );
    const sumSnap = await getDocs(q);
    if (!sumSnap.empty) {
      await updateDoc(sumSnap.docs[0].ref, {
        formData: emptyFormData,
        overallScore: 0,
        scoresSummary: { overall: 0, categories: [] },
        previousScore: 0,
        trend: 0,
      });
    }
    return { success: true, message: 'Snapshot deleted; current cleared.' };
  }
  return { success: true, message: 'Snapshot deleted.' };
}

/**
 * Update a snapshot in place (edit flow). Does not add a new snapshot.
 * If the snapshot is the latest, also updates current and summary so the dashboard reflects the edit.
 */
export async function updateSnapshotInPlace(
  coachUid: string,
  clientName: string,
  snapshotId: string,
  formData: FormData,
  overallScore: number,
  organizationId: string
): Promise<{ success: boolean; message: string }> {
  const db = getDb();
  const slug = getClientSlug(clientName);
  const snapRef = doc(db, ORGANIZATION.assessmentHistory.snapshots(organizationId, slug), snapshotId);
  const snapDoc = await getDoc(snapRef);
  if (!snapDoc.exists()) {
    return { success: false, message: 'Snapshot not found' };
  }

  await updateDoc(snapRef, {
    formData: sanitizeForFirestore(formData),
    overallScore: typeof overallScore === 'number' ? overallScore : 0,
    lastUpdated: serverTimestamp(),
  });

  const snapshots = await getSnapshots(coachUid, clientName, 2, organizationId);
  const isLatest = snapshots[0]?.id === snapshotId;
  if (isLatest) {
    const currentRef = doc(db, ORGANIZATION.assessmentHistory.current(organizationId, slug));
    await setDoc(currentRef, {
      formData: sanitizeForFirestore(formData),
      overallScore: typeof overallScore === 'number' ? overallScore : 0,
      lastUpdated: serverTimestamp(),
      clientName: clientName || 'Unnamed client',
      organizationId,
      coachUid: coachUid || 'unknown',
    }, { merge: false });

    const { summarizeScores } = await import('@/lib/scoring');
    const summary = summarizeScores(formData);
    const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(organizationId));
    const q = query(
      assessmentsRef,
      where('clientNameLower', '==', clientName.toLowerCase()),
      limit(1)
    );
    const sumSnap = await getDocs(q);
    if (!sumSnap.empty) {
      const prevScore = snapshots.length >= 2 ? snapshots[1].overallScore : 0;
      await updateDoc(sumSnap.docs[0].ref, {
        formData: sanitizeForFirestore(formData),
        overallScore: typeof overallScore === 'number' ? overallScore : 0,
        scoresSummary: summary,
        previousScore: prevScore,
        trend: (typeof overallScore === 'number' ? overallScore : 0) - prevScore,
      });
    }
  }

  return { success: true, message: 'Assessment updated.' };
}

/**
 * Restore current assessment from a specific snapshot (by ID).
 * Updates the live current doc and optionally the summary doc so dashboard reflects the restored state.
 */
export async function restoreCurrentFromSnapshot(
  coachUid: string,
  clientName: string,
  snapshotId: string,
  organizationId: string
): Promise<{ success: boolean; message: string }> {
  const result = await restoreFromSnapshot(coachUid, clientName, snapshotId, organizationId);
  if (!result.success) return { success: false, message: result.message };
  const snapshots = await getSnapshots(coachUid, clientName, 2, organizationId);
  const restored = snapshots.find((s) => s.id === snapshotId);
  if (restored) {
    const db = getDb();
    const { summarizeScores } = await import('@/lib/scoring');
    const summary = summarizeScores(restored.formData);
    const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(organizationId));
    const q = query(
      assessmentsRef,
      where('clientNameLower', '==', clientName.toLowerCase()),
      limit(1)
    );
    const sumSnap = await getDocs(q);
    if (!sumSnap.empty) {
      const prevScore = snapshots[1]?.id === snapshotId ? 0 : snapshots.find((s) => s.id !== snapshotId)?.overallScore ?? 0;
      await updateDoc(sumSnap.docs[0].ref, {
        formData: restored.formData,
        overallScore: restored.overallScore,
        scoresSummary: summary,
        previousScore: prevScore,
        trend: restored.overallScore - prevScore,
      });
    }
  }
  return { success: true, message: result.message };
}

/**
 * Reconstruct assessment state at a specific date
 * @param coachUid - The coach's user ID (kept for backwards compatibility)
 * @param clientName - The client's name
 * @param targetDate - The date to reconstruct the assessment for
 * @param organizationId - Required: The organization ID for path construction
 */
export async function reconstructAssessmentAtDate(
  coachUid: string,
  clientName: string,
  targetDate: Date,
  organizationId?: string
): Promise<{ formData: FormData; overallScore: number } | null> {
  if (!organizationId) {
    logger.warn('reconstructAssessmentAtDate called without organizationId', 'assessmentHistory');
    return null;
  }

  const targetTimestamp = Timestamp.fromDate(targetDate);

  // Find nearest snapshot before target date
  const snapshots = await getSnapshots(
    coachUid,
    clientName,
    100,
    organizationId
  );
  const nearestSnapshot = snapshots
    .filter((s) => s.timestamp.toDate() <= targetDate)
    .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())[0];

  // Start with snapshot or empty
  const reconstructedData: FormData =
    nearestSnapshot?.formData ?? ({} as FormData);
  let reconstructedScore = nearestSnapshot?.overallScore ?? 0;

  // Get all changes between snapshot and target date
  const historyRef = getHistoryCollection(organizationId, clientName);
  const q = query(
    historyRef,
    where(
      "timestamp",
      ">",
      nearestSnapshot?.timestamp ?? Timestamp.fromDate(new Date(0))
    ),
    where("timestamp", "<=", targetTimestamp),
    orderBy("timestamp", "asc"),
    limit(100)
  );

  const changesSnap = await getDocs(q);
  const changes: AssessmentChange[] = [];
  changesSnap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<AssessmentChange>;
    changes.push({
      id: docSnap.id,
      timestamp: (data.timestamp as Timestamp) ?? Timestamp.now(),
      type: data.type as AssessmentChange["type"],
      category: data.category as AssessmentChange["category"],
      changes: data.changes ?? {},
      updatedBy: data.updatedBy ?? "",
    });
  });

  // Apply changes chronologically
  for (const change of changes) {
    for (const [field, values] of Object.entries(change.changes)) {
      if (field in reconstructedData) {
        (reconstructedData as unknown as Record<string, FormValue>)[field] =
          values.new;
      }
    }
  }

  // Recalculate score if we have the computeScores function available
  try {
    const { computeScores } = await import("@/lib/scoring");
    const scores = computeScores(reconstructedData);
    reconstructedScore = scores.overall;
  } catch (e) {
    logger.warn("Could not recalculate score", 'assessmentHistory', e);
  }

  return {
    formData: reconstructedData,
    overallScore: reconstructedScore,
  };
}

/**
 * Update posture analysis results in the current assessment
 * Useful for re-analyzing with corrected logic
 * @param coachUid - The coach's user ID (kept for backwards compatibility)
 * @param clientName - The client's name
 * @param view - The posture view being updated
 * @param analysis - The posture analysis result
 * @param organizationId - Required: The organization ID for path construction
 */
export async function updatePostureAnalysis(
  coachUid: string,
  clientName: string,
  view: "front" | "back" | "side-left" | "side-right",
  analysis: PostureAnalysisResult,
  organizationId?: string
): Promise<void> {
  if (!organizationId) {
    throw new Error('organizationId is required for updatePostureAnalysis');
  }

  const currentRef = getCurrentAssessmentDoc(organizationId, clientName);
  const currentSnap = await getDoc(currentRef);

  if (!currentSnap.exists()) {
    throw new Error(`No current assessment found for client ${clientName}`);
  }

  const currentData = currentSnap.data() as {
    formData?: FormData;
    organizationId?: string;
  };

  // Security check
  if (currentData.organizationId && currentData.organizationId !== organizationId) {
    throw new Error("Organization ID mismatch");
  }

  const formData = currentData.formData || ({} as FormData);
  const updatedPostureResults = {
    ...(formData.postureAiResults || {}),
    [view]: analysis,
  };

  await updateDoc(currentRef, {
    "formData.postureAiResults": sanitizeForFirestore(updatedPostureResults),
  });
}

/**
 * Compare two assessment states
 */
export function compareAssessments(
  oldData: FormData,
  newData: FormData,
  _category?: string
): Record<string, { old: FormValue; new: FormValue; changed: boolean }> {
  const comparison: Record<
    string,
    { old: FormValue; new: FormValue; changed: boolean }
  > = {};
  const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const field of allFields) {
    const oldValue = oldData[field as keyof FormData] as FormValue;
    const newValue = newData[field as keyof FormData] as FormValue;
    const changed = oldValue !== newValue;

    comparison[field] = {
      old: oldValue ?? null,
      new: newValue ?? null,
      changed,
    };
  }

  return comparison;
}

/**
 * Restore a client's current assessment from a specific snapshot
 * Useful for recovering from accidental overwrites
 * @param coachUid - The coach's user ID (tracked for audit purposes)
 * @param clientName - The client's name
 * @param snapshotId - Optional specific snapshot ID to restore
 * @param organizationId - Required: The organization ID for path construction
 */
export async function restoreFromSnapshot(
  coachUid: string,
  clientName: string,
  snapshotId?: string,
  organizationId?: string
): Promise<{ success: boolean; message: string; restoredScore?: number }> {
  if (!organizationId) {
    return { success: false, message: 'organizationId is required for restoreFromSnapshot' };
  }

  try {
    // Get all snapshots for this client
    const snapshots = await getSnapshots(coachUid, clientName, 50, organizationId);

    if (snapshots.length === 0) {
      return { success: false, message: `No snapshots found for client "${clientName}"` };
    }

    // Find the snapshot to restore (either by ID or use the second most recent)
    let snapshotToRestore: AssessmentSnapshot | undefined;

    if (snapshotId) {
      snapshotToRestore = snapshots.find(s => s.id === snapshotId);
      if (!snapshotToRestore) {
        return { success: false, message: `Snapshot with ID "${snapshotId}" not found` };
      }
    } else {
      // Use the second snapshot (first is probably the corrupted one)
      if (snapshots.length < 2) {
        // Only one snapshot - use it
        snapshotToRestore = snapshots[0];
      } else {
        snapshotToRestore = snapshots[1]; // Second most recent
      }
    }

    // Log what we're doing
    const snapshotDate = snapshotToRestore.timestamp?.toDate?.()?.toLocaleString?.() || 'unknown date';
    logger.info(`[RESTORE] Restoring "${clientName}" from snapshot ${snapshotToRestore.id} (${snapshotDate})`, 'assessmentHistory');

    // Get the current assessment ref using organization path
    const currentRef = getCurrentAssessmentDoc(organizationId, clientName);

    // Restore the snapshot to current
    await setDoc(
      currentRef,
      {
        formData: sanitizeForFirestore(snapshotToRestore.formData),
        overallScore: snapshotToRestore.overallScore ?? 0,
        lastUpdated: serverTimestamp(),
        clientName: clientName,
        organizationId: organizationId,
        restoredBy: coachUid,
        restoredFromSnapshot: snapshotToRestore.id,
      },
      { merge: false }
    );

    return {
      success: true,
      message: `Successfully restored "${clientName}" from snapshot dated ${snapshotDate}`,
      restoredScore: snapshotToRestore.overallScore,
    };
  } catch (error) {
    logger.error(`[RESTORE] Failed to restore from snapshot:`, error);
    return { success: false, message: `Restore failed: ${error}` };
  }
}

/**
 * List available snapshots for a client (for debugging/recovery)
 * @param coachUid - The coach's user ID (kept for backwards compatibility)
 * @param clientName - The client's name
 * @param organizationId - Required: The organization ID for path construction
 */
export async function listClientSnapshots(
  coachUid: string,
  clientName: string,
  organizationId?: string
): Promise<{ id: string; date: string; score: number; type: string }[]> {
  if (!organizationId) {
    logger.warn('listClientSnapshots called without organizationId', 'assessmentHistory');
    return [];
  }

  const snapshots = await getSnapshots(coachUid, clientName, 20, organizationId);
  return snapshots.map(s => ({
    id: s.id || 'unknown',
    date: s.timestamp?.toDate?.()?.toLocaleString?.() || 'unknown',
    score: s.overallScore,
    type: s.type,
  }));
}
