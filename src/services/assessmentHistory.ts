import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
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
import { COLLECTIONS } from "@/constants/collections";

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
    | "partial-inbody"
    | "partial-posture"
    | "partial-fitness"
    | "partial-strength"
    | "partial-lifestyle";
  category: "inbody" | "posture" | "fitness" | "strength" | "lifestyle" | "all";
  changes: Record<string, { old: FormValue; new: FormValue }>;
  updatedBy: string;
};

export type AssessmentSnapshot = {
  id?: string;
  timestamp: Timestamp;
  type: "monthly" | "full-assessment" | "manual";
  formData: FormData;
  overallScore: number;
  notes?: string;
};

const getClientSlug = (clientName: string) => {
  const safeName = (clientName || "unnamed-client").trim() || "unnamed-client";
  return safeName.toLowerCase().replace(/\s+/g, "-");
};

const getCurrentAssessmentDoc = (coachUid: string, clientName: string) =>
  doc(
    getDb(),
    COLLECTIONS.COACHES,
    coachUid,
    COLLECTIONS.ASSESSMENTS,
    getClientSlug(clientName),
    "current",
    "data"
  );

const getHistoryCollection = (coachUid: string, clientName: string) =>
  collection(
    getDb(),
    COLLECTIONS.COACHES,
    coachUid,
    COLLECTIONS.ASSESSMENTS,
    getClientSlug(clientName),
    "history"
  );

const getSnapshotsCollection = (coachUid: string, clientName: string) =>
  collection(
    getDb(),
    COLLECTIONS.COACHES,
    coachUid,
    COLLECTIONS.ASSESSMENTS,
    getClientSlug(clientName),
    "snapshots"
  );

/**
 * Get the current assessment for a client
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
  const ref = getCurrentAssessmentDoc(coachUid, clientName);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as {
    formData?: FormData;
    overallScore?: number;
    lastUpdated?: Timestamp;
    organizationId?: string;
  };

  // Security check: if organizationId is provided, verify it matches
  if (
    organizationId &&
    data.organizationId &&
    data.organizationId !== organizationId
  ) {
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
  category?: "inbody" | "posture" | "fitness" | "strength" | "lifestyle" | "all"
): Record<string, { old: FormValue; new: FormValue }> {
  const changes: Record<string, { old: FormValue; new: FormValue }> = {};

  // Define field categories
  const categoryFields: Record<string, string[]> = {
    inbody: [
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
  // Get current assessment
  const current = await getCurrentAssessment(
    coachUid,
    clientName,
    organizationId
  );
  const oldData = current?.formData ?? ({} as FormData);

  // Use organizationId from current doc if not provided
  const finalOrgId = organizationId || current?.organizationId || null;

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

  // Update current assessment
  const currentRef = getCurrentAssessmentDoc(coachUid, clientName);
  // Saving current assessment
  try {
    await setDoc(
      currentRef,
      {
        formData: sanitizeForFirestore(formData),
        overallScore: overallScore ?? 0,
        lastUpdated: serverTimestamp(),
        clientName: clientName || "Unnamed client",
        organizationId: finalOrgId,
      },
      { merge: false }
    ); // Overwrite completely
    // Current assessment saved
  } catch (err) {
    // Use logger for consistency with project rules
    const { logger } = await import('@/lib/utils/logger');
    logger.error(`[SYNC] ✗ Failed to save current assessment:`, err);
    throw err;
  }

  // Log change to history
  const historyRef = getHistoryCollection(coachUid, clientName);
  // Logging change to history
  try {
    await addDoc(historyRef, {
      timestamp: serverTimestamp(),
      type: changeType,
      category: category || "all",
      changes: sanitizeForFirestore(changes),
      updatedBy: coachUid || "unknown",
      organizationId: finalOrgId,
    });
    // History log created
  } catch (err) {
    // Use logger for consistency with project rules
    const { logger } = await import('@/lib/utils/logger');
    logger.warn(`[SYNC] ✗ Failed to log history (non-critical):`, err);
    // Don't throw for history log failure, but log it
  }

  // Check if we should create a snapshot (monthly, full assessment, or partial update)
  const now = new Date();
  const shouldCreateSnapshot =
    changeType === "full" ||
    changeType.startsWith("partial-") || // Create snapshots for partial updates too
    (now.getDate() === 1 && !current?.lastUpdated); // First of month

  if (shouldCreateSnapshot) {
    const snapshotType =
      changeType === "full"
        ? "full-assessment"
        : changeType.startsWith("partial-")
        ? "manual"
        : "monthly";
    await createSnapshot(
      coachUid,
      clientName,
      formData,
      overallScore,
      snapshotType,
      undefined,
      finalOrgId || undefined
    );
  }
}

/**
 * Create a snapshot of the current assessment state
 */
export async function createSnapshot(
  coachUid: string,
  clientName: string,
  formData: FormData,
  overallScore: number,
  snapshotType: AssessmentSnapshot["type"] = "manual",
  notes?: string,
  organizationId?: string
): Promise<string> {
  const snapshotsRef = getSnapshotsCollection(coachUid, clientName);
  const docRef = await addDoc(snapshotsRef, {
    timestamp: serverTimestamp(),
    type: snapshotType,
    formData: sanitizeForFirestore(formData),
    overallScore: overallScore ?? 0,
    notes: notes ?? null,
    organizationId: organizationId || null,
  });
  return docRef.id;
}

/**
 * Get change history for a client
 */
export async function getChangeHistory(
  coachUid: string,
  clientName: string,
  limitCount: number = 100,
  organizationId?: string
): Promise<AssessmentChange[]> {
  const historyRef = getHistoryCollection(coachUid, clientName);
  let q;
  if (organizationId) {
    q = query(
      historyRef,
      where("organizationId", "==", organizationId),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
  } else {
    q = query(historyRef, orderBy("timestamp", "desc"), limit(limitCount));
  }
  let snap;
  try {
    snap = await getDocs(q);
  } catch (error) {
    if (
      organizationId &&
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "failed-precondition"
    ) {
      const fallbackQuery = query(
        historyRef,
        where("organizationId", "==", organizationId),
        limit(limitCount)
      );
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

  if (organizationId) {
    return changes.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
  }
  return changes;
}

/**
 * Get snapshots for a client
 */
export async function getSnapshots(
  coachUid: string,
  clientName: string,
  limitCount: number = 50,
  organizationId?: string
): Promise<AssessmentSnapshot[]> {
  const snapshotsRef = getSnapshotsCollection(coachUid, clientName);

  let q;
  if (organizationId) {
    q = query(
      snapshotsRef,
      where("organizationId", "==", organizationId),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
  } else {
    q = query(snapshotsRef, orderBy("timestamp", "desc"), limit(limitCount));
  }

  let snap;
  try {
    snap = await getDocs(q);
  } catch (error) {
    if (
      organizationId &&
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "failed-precondition"
    ) {
      const fallbackQuery = query(
        snapshotsRef,
        where("organizationId", "==", organizationId),
        limit(limitCount)
      );
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

  if (organizationId) {
    return snapshots.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
  }
  return snapshots;
}

/**
 * Reconstruct assessment state at a specific date
 */
export async function reconstructAssessmentAtDate(
  coachUid: string,
  clientName: string,
  targetDate: Date,
  organizationId?: string
): Promise<{ formData: FormData; overallScore: number } | null> {
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
  const historyRef = getHistoryCollection(coachUid, clientName);
  let q;
  if (organizationId) {
    q = query(
      historyRef,
      where("organizationId", "==", organizationId),
      where(
        "timestamp",
        ">",
        nearestSnapshot?.timestamp ?? Timestamp.fromDate(new Date(0))
      ),
      where("timestamp", "<=", targetTimestamp),
      orderBy("timestamp", "asc"),
      limit(100)
    );
  } else {
    q = query(
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
  }

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
 */
export async function updatePostureAnalysis(
  coachUid: string,
  clientName: string,
  view: "front" | "back" | "side-left" | "side-right",
  analysis: PostureAnalysisResult,
  organizationId?: string
): Promise<void> {
  const currentRef = getCurrentAssessmentDoc(coachUid, clientName);
  const currentSnap = await getDoc(currentRef);

  if (!currentSnap.exists()) {
    throw new Error(`No current assessment found for client ${clientName}`);
  }

  const currentData = currentSnap.data() as {
    formData?: FormData;
    organizationId?: string;
  };

  // Security check
  if (
    organizationId &&
    currentData.organizationId &&
    currentData.organizationId !== organizationId
  ) {
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
 */
export async function restoreFromSnapshot(
  coachUid: string,
  clientName: string,
  snapshotId?: string,
  organizationId?: string
): Promise<{ success: boolean; message: string; restoredScore?: number }> {
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
    
    // Get the current assessment ref
    const currentRef = getCurrentAssessmentDoc(coachUid, clientName);
    
    // Restore the snapshot to current
    await setDoc(
      currentRef,
      {
        formData: sanitizeForFirestore(snapshotToRestore.formData),
        overallScore: snapshotToRestore.overallScore ?? 0,
        lastUpdated: serverTimestamp(),
        clientName: clientName,
        organizationId: organizationId || null,
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
 */
export async function listClientSnapshots(
  coachUid: string,
  clientName: string
): Promise<{ id: string; date: string; score: number; type: string }[]> {
  const snapshots = await getSnapshots(coachUid, clientName, 20);
  return snapshots.map(s => ({
    id: s.id || 'unknown',
    date: s.timestamp?.toDate?.()?.toLocaleString?.() || 'unknown',
    score: s.overallScore,
    type: s.type,
  }));
}
