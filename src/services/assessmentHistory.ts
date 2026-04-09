import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
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
import { ORGANIZATION, sessionIdFromDate } from "@/lib/database/paths";
import { generateClientSlug } from "@/services/clientProfiles";
import { getPillarLabel } from "@/constants/pillars";

const MAX_SESSION_LIMIT = 100;

export type FormValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | Record<string, string>
  | Record<string, PostureAnalysisResult>;

/** @deprecated v1 field-level diff type — kept for backward compat with callers */
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
  schemaVersion?: number;
  timestamp: Timestamp;
  /** full-assessment | pillar-* (new) | partial-* (legacy) | monthly | manual */
  type: "full-assessment" | "full" | "partial-bodycomp" | "partial-posture" | "partial-fitness" | "partial-strength" | "partial-lifestyle" | "monthly" | "manual" | `pillar-${string}`;
  assessmentType?: "full" | "pillar";
  pillar?: string;
  formData: FormData;
  overallScore: number;
  notes?: string;
  scoresSummary?: {
    overall: number;
    categories: { id: string; score: number; weaknesses: string[] }[];
  };
};

// ---------------------------------------------------------------------------
// Internal path helpers
// ---------------------------------------------------------------------------

const slug = (name: string) => generateClientSlug(name);

const getCurrentStateDoc = (orgId: string, clientName: string) =>
  doc(getDb(), ORGANIZATION.clients.current(orgId, slug(clientName)));

const getSessionsCol = (orgId: string, clientName: string) =>
  collection(getDb(), ORGANIZATION.clients.sessions.collection(orgId, slug(clientName)));

const getClientProfileDoc = (orgId: string, clientName: string) =>
  doc(getDb(), ORGANIZATION.clients.doc(orgId, slug(clientName)));

// ---------------------------------------------------------------------------
// No-op detection — avoids writing identical data and incrementing counters
// ---------------------------------------------------------------------------

/**
 * Normalizes form data for change detection only — NOT for Firestore writes.
 *
 * Unlike sanitizeForFirestore, large base64 image strings are truncated to
 * their first 200 characters rather than replaced with a fixed placeholder.
 * This prevents a false-negative where a coach retakes a posture photo but
 * both the old and new images are large enough to become identical placeholders,
 * causing the save to be skipped.
 *
 * Timestamps are reduced to their seconds value to eliminate nanosecond noise
 * from server-assigned timestamps vs client-constructed ones.
 */
export function normalizeForComparison(obj: unknown): unknown {
  if (obj === undefined || (typeof obj === 'number' && !Number.isFinite(obj))) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return (obj as unknown[]).map(normalizeForComparison);
  const ctorName = (obj as object).constructor?.name;
  if (ctorName === 'Timestamp') {
    const ts = obj as { seconds: number };
    return `ts:${ts.seconds}`;
  }
  if (ctorName === 'FieldValue' || '_methodName' in obj) return '(sentinel)';
  // Sort keys so JSON.stringify produces a deterministic string regardless of insertion order.
  // Without this, two identical objects spread/merged in different order would hash differently.
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    if (key.startsWith('_')) continue;
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.startsWith('data:image/') && value.length > 200) {
      result[key] = value.slice(0, 200);
    } else {
      result[key] = normalizeForComparison(value);
    }
  }
  return result;
}

function hasFormDataChanged(oldData: FormData, newData: FormData): boolean {
  return (
    JSON.stringify(normalizeForComparison(oldData)) !==
    JSON.stringify(normalizeForComparison(newData))
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getCurrentAssessment(
  _coachUid: string,
  clientName: string,
  organizationId?: string
): Promise<{
  formData: FormData;
  overallScore: number;
  lastUpdated: Timestamp | null;
  organizationId?: string;
} | null> {
  if (!organizationId) {
    logger.warn("getCurrentAssessment called without organizationId", "assessmentHistory");
    return null;
  }

  const ref = getCurrentStateDoc(organizationId, clientName);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as {
    formData?: FormData;
    overallScore?: number;
    lastUpdated?: Timestamp;
    organizationId?: string;
  };

  if (data.organizationId && data.organizationId !== organizationId) {
    logger.warn(`Organization ID mismatch for client ${clientName}`, "assessmentHistory:security");
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
 * Returns true when changes were detected and a save + session occurred.
 * Returns false when the incoming data is identical — callers must respect
 * this to avoid incrementing assessment counters on a no-op save.
 */
export async function updateCurrentAssessment(
  coachUid: string,
  clientName: string,
  formData: FormData,
  overallScore: number,
  changeType: AssessmentChange["type"],
  _category?: AssessmentChange["category"],
  organizationId?: string,
  scoresSummary?: AssessmentSnapshot["scoresSummary"],
): Promise<boolean> {
  if (!organizationId) {
    throw new Error("organizationId is required for updateCurrentAssessment");
  }

  const current = await getCurrentAssessment("", clientName, organizationId);
  const oldData = current?.formData ?? ({} as FormData);

  if (!hasFormDataChanged(oldData, formData)) return false;

  const currentRef = getCurrentStateDoc(organizationId, clientName);
  try {
    await setDoc(
      currentRef,
      {
        formData: sanitizeForFirestore(formData),
        overallScore: overallScore ?? 0,
        lastUpdated: serverTimestamp(),
        clientName: clientName || "Unnamed client",
        organizationId,
        coachUid,
      },
      { merge: false },
    );
  } catch (err) {
    logger.error("[SYNC] ✗ Failed to save current state:", err);
    throw err;
  }

  const shouldCreateSession =
    changeType === "full" || changeType.startsWith("partial-");

  if (shouldCreateSession) {
    const snapshotType: AssessmentSnapshot["type"] =
      changeType === "full"
        ? "full-assessment"
        : changeType.startsWith("partial-")
          ? (changeType as AssessmentSnapshot["type"])
          : "monthly";
    await createSnapshot(
      coachUid,
      clientName,
      formData,
      overallScore,
      snapshotType,
      undefined,
      organizationId,
      scoresSummary,
    );
  }

  return true;
}

/**
 * Write an immutable session document to the sessions sub-collection.
 * Uses a chronologically-sortable ISO timestamp as the document ID.
 */
export async function createSnapshot(
  coachUid: string,
  clientName: string,
  formData: FormData,
  overallScore: number,
  snapshotType: AssessmentSnapshot["type"] = "full-assessment",
  notes?: string,
  organizationId?: string,
  scoresSummary?: AssessmentSnapshot["scoresSummary"],
): Promise<string> {
  if (!organizationId) {
    throw new Error("organizationId is required for createSnapshot");
  }

  const isPillar =
    snapshotType.startsWith("pillar-") || snapshotType.startsWith("partial-");
  const derivedAssessmentType: "full" | "pillar" = isPillar ? "pillar" : "full";
  const derivedPillar = isPillar
    ? snapshotType.replace(/^(pillar-|partial-)/, "")
    : undefined;

  const sessionId = sessionIdFromDate();
  const sessionRef = doc(getSessionsCol(organizationId, clientName), sessionId);

  await setDoc(sessionRef, {
    schemaVersion: 2,
    timestamp: serverTimestamp(),
    type: snapshotType,
    assessmentType: derivedAssessmentType,
    ...(derivedPillar ? { pillar: derivedPillar } : {}),
    formData: sanitizeForFirestore(formData),
    overallScore: overallScore ?? 0,
    notes: notes ?? null,
    organizationId,
    createdBy: coachUid,
    ...(scoresSummary ? { scoresSummary } : {}),
  });

  return sessionId;
}

export async function getSnapshots(
  _coachUid: string,
  clientName: string,
  limitCount: number = 50,
  organizationId?: string,
): Promise<AssessmentSnapshot[]> {
  if (!organizationId) {
    logger.warn("getSnapshots called without organizationId", "assessmentHistory");
    return [];
  }

  const resolvedLimit = Math.min(limitCount, MAX_SESSION_LIMIT);
  const sessionsCol = getSessionsCol(organizationId, clientName);
  const q = query(sessionsCol, orderBy("timestamp", "desc"), limit(resolvedLimit));

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
      snap = await getDocs(query(sessionsCol, limit(resolvedLimit)));
    } else {
      throw error;
    }
  }

  const snapshots: AssessmentSnapshot[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<AssessmentSnapshot>;
    snapshots.push({
      id: docSnap.id,
      schemaVersion: typeof data.schemaVersion === "number" ? data.schemaVersion : undefined,
      timestamp: (data.timestamp as Timestamp) ?? Timestamp.now(),
      type: data.type as AssessmentSnapshot["type"],
      assessmentType: data.assessmentType,
      pillar: data.pillar,
      formData: (data.formData as FormData) ?? ({} as FormData),
      overallScore: typeof data.overallScore === "number" ? data.overallScore : 0,
      notes: data.notes,
      scoresSummary: data.scoresSummary,
    });
  });

  return snapshots.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
}

const HISTORY_LIST_LIMIT = 50;

/** Human-readable label for snapshot type. */
export function formatSnapshotTypeLabel(type: string | undefined | null): string {
  if (!type) return "Pillar";
  if (type === "full" || type === "full-assessment") return "Full";
  if (type === "monthly") return "Full";
  if (type.startsWith("partial-")) {
    const category = type.replace("partial-", "");
    return getPillarLabel(category, "short");
  }
  if (type.startsWith("pillar-")) {
    const category = type.replace("pillar-", "");
    return getPillarLabel(category, "short");
  }
  if (type === "partial" || type === "manual") return "Pillar";
  return type;
}

/**
 * Get session-based assessment history for a client (for dashboard history list).
 * Returns sessions in descending date order.
 */
export async function getClientAssessmentHistory(
  coachUid: string,
  clientName: string,
  organizationId: string | undefined,
  limitCount: number = HISTORY_LIST_LIMIT,
): Promise<AssessmentSnapshot[]> {
  return getSnapshots(coachUid, clientName, limitCount, organizationId);
}

/**
 * @deprecated v1 field-level change history. Returns empty array in v2.
 * Use getSnapshots() (sessions) to see assessment history.
 */
export async function getChangeHistory(
  _coachUid: string,
  _clientName: string,
  _limitCount: number = 100,
  _organizationId?: string,
): Promise<AssessmentChange[]> {
  return [];
}

/**
 * Delete a session. If it was the most recent, restores current/state from
 * the previous session (or clears if none).
 */
export async function deleteSnapshot(
  coachUid: string,
  clientName: string,
  snapshotId: string,
  organizationId: string,
): Promise<{ success: boolean; message: string }> {
  const db = getDb();
  const snapshots = await getSnapshots(coachUid, clientName, 100, organizationId);
  const toDelete = snapshots.find((s) => s.id === snapshotId);
  if (!toDelete) {
    return { success: false, message: "Snapshot not found" };
  }

  const clientSlug = slug(clientName);
  const snapRef = doc(db, ORGANIZATION.clients.sessions.doc(organizationId, clientSlug, snapshotId));
  await deleteDoc(snapRef);

  const wasLatest = snapshots[0]?.id === snapshotId;

  if (wasLatest && snapshots.length > 1) {
    const prev = snapshots[1];
    await restoreFromSnapshot(coachUid, clientName, prev.id, organizationId);
    const { summarizeScores } = await import("@/lib/scoring");
    const summary = summarizeScores(prev.formData);
    const clientRef = getClientProfileDoc(organizationId, clientName);
    const prevScore = snapshots.length > 2 ? snapshots[2].overallScore : 0;
    await updateDoc(clientRef, {
      formData: prev.formData,
      overallScore: prev.overallScore,
      scoresSummary: summary,
      previousScore: prevScore,
      trend: prev.overallScore - prevScore,
    });
    return { success: true, message: "Snapshot deleted; current restored from previous." };
  }

  if (wasLatest && snapshots.length === 1) {
    const currentRef = getCurrentStateDoc(organizationId, clientName);
    const emptyFormData = {} as FormData;
    await setDoc(
      currentRef,
      { formData: emptyFormData, overallScore: 0, lastUpdated: serverTimestamp(), organizationId },
      { merge: true },
    );
    const clientRef = getClientProfileDoc(organizationId, clientName);
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
      await updateDoc(clientRef, {
        formData: emptyFormData,
        overallScore: 0,
        scoresSummary: { overall: 0, categories: [] },
        previousScore: 0,
        trend: 0,
      });
    }
    return { success: true, message: "Snapshot deleted; current cleared." };
  }

  return { success: true, message: "Snapshot deleted." };
}

/**
 * Update a session in place (edit flow). Does not add a new session.
 * If the session is the latest, also updates current/state and client profile.
 */
export async function updateSnapshotInPlace(
  coachUid: string,
  clientName: string,
  snapshotId: string,
  formData: FormData,
  overallScore: number,
  organizationId: string,
): Promise<{ success: boolean; message: string }> {
  const db = getDb();
  const clientSlug = slug(clientName);
  const snapRef = doc(db, ORGANIZATION.clients.sessions.doc(organizationId, clientSlug, snapshotId));
  const snapDoc = await getDoc(snapRef);
  if (!snapDoc.exists()) {
    return { success: false, message: "Snapshot not found" };
  }

  await updateDoc(snapRef, {
    formData: sanitizeForFirestore(formData),
    overallScore: typeof overallScore === "number" ? overallScore : 0,
    lastUpdated: serverTimestamp(),
  });

  const snapshots = await getSnapshots(coachUid, clientName, 2, organizationId);
  const isLatest = snapshots[0]?.id === snapshotId;

  if (isLatest) {
    const currentRef = getCurrentStateDoc(organizationId, clientName);
    await setDoc(
      currentRef,
      {
        formData: sanitizeForFirestore(formData),
        overallScore: typeof overallScore === "number" ? overallScore : 0,
        lastUpdated: serverTimestamp(),
        clientName: clientName || "Unnamed client",
        organizationId,
        coachUid: coachUid || "unknown",
      },
      { merge: false },
    );

    const { summarizeScores } = await import("@/lib/scoring");
    const summary = summarizeScores(formData);
    const clientRef = getClientProfileDoc(organizationId, clientName);
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
      const prevScore = snapshots.length >= 2 ? snapshots[1].overallScore : 0;
      await updateDoc(clientRef, {
        formData: sanitizeForFirestore(formData),
        overallScore: typeof overallScore === "number" ? overallScore : 0,
        scoresSummary: summary,
        previousScore: prevScore,
        trend: (typeof overallScore === "number" ? overallScore : 0) - prevScore,
      });
    }
  }

  return { success: true, message: "Assessment updated." };
}

/**
 * Edit a session in place and cascade field changes forward through all subsequent sessions.
 *
 * Each partial assessment only explicitly changes certain fields; the rest are inherited from the
 * previous session. When an earlier session is edited, the changed fields are propagated forward
 * through every subsequent session that "inherited" them. Fields explicitly changed by a later
 * partial assessment are left untouched.
 */
export async function updateSnapshotWithCascade(
  coachUid: string,
  clientName: string,
  snapshotId: string,
  newFormData: FormData,
  organizationId: string,
): Promise<{ success: boolean; message: string; cascadedCount: number }> {
  const db = getDb();
  const clientSlug = slug(clientName);

  const snapshots = await getSnapshots(coachUid, clientName, 100, organizationId);
  const editedIdx = snapshots.findIndex((s) => s.id === snapshotId);
  if (editedIdx === -1) return { success: false, message: "Snapshot not found", cascadedCount: 0 };

  const { computeScores, summarizeScores } = await import("@/lib/scoring");
  const originalFormDatas = snapshots.map((s) => s.formData);

  const editedScore = computeScores(newFormData).overall;
  const editedSummary = summarizeScores(newFormData);
  const editedRef = doc(db, ORGANIZATION.clients.sessions.doc(organizationId, clientSlug, snapshotId));
  await updateDoc(editedRef, {
    formData: sanitizeForFirestore(newFormData),
    overallScore: editedScore,
    scoresSummary: editedSummary,
    lastUpdated: serverTimestamp(),
  });

  let previousCascadedFormData: FormData = newFormData;
  let cascadedCount = 0;

  for (let i = editedIdx - 1; i >= 0; i--) {
    const snapshot = snapshots[i];
    const parentOriginalFormData = originalFormDatas[i + 1];
    const updatedFormData: Record<string, unknown> = {
      ...(snapshot.formData as unknown as Record<string, unknown>),
    };
    let anyFieldChanged = false;

    for (const key of Object.keys({ ...parentOriginalFormData, ...newFormData })) {
      const snapRec = snapshot.formData as unknown as Record<string, unknown>;
      const fieldInSnapshot = JSON.stringify(snapRec[key]);
      const fieldInParentOriginal = JSON.stringify(
        (parentOriginalFormData as unknown as Record<string, unknown>)[key],
      );

      if (fieldInSnapshot === fieldInParentOriginal) {
        const newVal = (previousCascadedFormData as unknown as Record<string, unknown>)[key];
        if (JSON.stringify(newVal) !== fieldInSnapshot) {
          updatedFormData[key] = newVal;
          anyFieldChanged = true;
        }
      }
    }

    if (!anyFieldChanged || !snapshot.id) {
      previousCascadedFormData = snapshot.formData;
      continue;
    }

    const cascadedFormData = updatedFormData as unknown as FormData;
    const score = computeScores(cascadedFormData).overall;
    const summary = summarizeScores(cascadedFormData);

    const snapRef = doc(db, ORGANIZATION.clients.sessions.doc(organizationId, clientSlug, snapshot.id));
    await updateDoc(snapRef, {
      formData: sanitizeForFirestore(cascadedFormData),
      overallScore: score,
      scoresSummary: summary,
      lastUpdated: serverTimestamp(),
    });

    previousCascadedFormData = cascadedFormData;
    cascadedCount++;
  }

  const latestFormData = editedIdx === 0 ? newFormData : previousCascadedFormData;
  const latestScore = computeScores(latestFormData).overall;
  const currentRef = getCurrentStateDoc(organizationId, clientName);
  await setDoc(
    currentRef,
    {
      formData: sanitizeForFirestore(latestFormData),
      overallScore: latestScore,
      lastUpdated: serverTimestamp(),
      clientName: clientName || "Unnamed client",
      organizationId,
      coachUid: coachUid || "unknown",
    },
    { merge: false },
  );

  const latestSummary = summarizeScores(latestFormData);
  const clientRef = getClientProfileDoc(organizationId, clientName);
  const clientSnap = await getDoc(clientRef);
  if (clientSnap.exists()) {
    const secondLatest = snapshots.length > 1 ? snapshots[1] : null;
    const prevScore = secondLatest?.overallScore ?? 0;
    await updateDoc(clientRef, {
      formData: sanitizeForFirestore(latestFormData),
      overallScore: latestScore,
      scoresSummary: latestSummary,
      previousScore: prevScore,
      trend: latestScore - prevScore,
    });
  }

  const msg =
    cascadedCount > 0
      ? `Assessment updated and changes cascaded to ${cascadedCount} subsequent assessment${cascadedCount > 1 ? "s" : ""}.`
      : "Assessment updated.";
  return { success: true, message: msg, cascadedCount };
}

/**
 * Restore current/state from a specific session (by ID) and update the client profile.
 */
export async function restoreCurrentFromSnapshot(
  coachUid: string,
  clientName: string,
  snapshotId: string,
  organizationId: string,
): Promise<{ success: boolean; message: string }> {
  const result = await restoreFromSnapshot(coachUid, clientName, snapshotId, organizationId);
  if (!result.success) return { success: false, message: result.message };

  const snapshots = await getSnapshots(coachUid, clientName, 2, organizationId);
  const restored = snapshots.find((s) => s.id === snapshotId);
  if (restored) {
    const { summarizeScores } = await import("@/lib/scoring");
    const summary = summarizeScores(restored.formData);
    const clientRef = getClientProfileDoc(organizationId, clientName);
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
      const prevScore = snapshots.find((s) => s.id !== snapshotId)?.overallScore ?? 0;
      await updateDoc(clientRef, {
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
 * Reconstruct assessment state at a specific date.
 * In v2, sessions contain full formData — we find the latest session before the target date.
 */
export async function reconstructAssessmentAtDate(
  coachUid: string,
  clientName: string,
  targetDate: Date,
  organizationId?: string,
): Promise<{ formData: FormData; overallScore: number } | null> {
  if (!organizationId) {
    logger.warn("reconstructAssessmentAtDate called without organizationId", "assessmentHistory");
    return null;
  }

  const sessions = await getSnapshots(coachUid, clientName, 100, organizationId);
  const nearest = sessions
    .filter((s) => s.timestamp.toDate() <= targetDate)
    .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())[0];

  if (!nearest) return null;

  let reconstructedScore = nearest.overallScore;
  try {
    const { computeScores } = await import("@/lib/scoring");
    reconstructedScore = computeScores(nearest.formData).overall;
  } catch (e) {
    logger.warn("Could not recalculate score", "assessmentHistory", e);
  }

  return { formData: nearest.formData, overallScore: reconstructedScore };
}

export async function updatePostureAnalysis(
  _coachUid: string,
  clientName: string,
  view: "front" | "back" | "side-left" | "side-right",
  analysis: PostureAnalysisResult,
  organizationId?: string,
): Promise<void> {
  if (!organizationId) {
    throw new Error("organizationId is required for updatePostureAnalysis");
  }

  const currentRef = getCurrentStateDoc(organizationId, clientName);
  const currentSnap = await getDoc(currentRef);

  if (!currentSnap.exists()) {
    throw new Error(`No current assessment found for client ${clientName}`);
  }

  const currentData = currentSnap.data() as {
    formData?: FormData;
    organizationId?: string;
  };

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

export function compareAssessments(
  oldData: FormData,
  newData: FormData,
  _category?: string,
): Record<string, { old: FormValue; new: FormValue; changed: boolean }> {
  const comparison: Record<string, { old: FormValue; new: FormValue; changed: boolean }> = {};
  const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const field of allFields) {
    const oldValue = oldData[field as keyof FormData] as FormValue;
    const newValue = newData[field as keyof FormData] as FormValue;
    comparison[field] = {
      old: oldValue ?? null,
      new: newValue ?? null,
      changed: oldValue !== newValue,
    };
  }

  return comparison;
}

/**
 * Restore current/state from a specific session. Updates only the live current doc.
 * Callers that also need the client profile updated should use restoreCurrentFromSnapshot.
 */
export async function restoreFromSnapshot(
  coachUid: string,
  clientName: string,
  snapshotId?: string,
  organizationId?: string,
): Promise<{ success: boolean; message: string; restoredScore?: number }> {
  if (!organizationId) {
    return { success: false, message: "organizationId is required for restoreFromSnapshot" };
  }

  try {
    const snapshots = await getSnapshots(coachUid, clientName, 50, organizationId);

    if (snapshots.length === 0) {
      return { success: false, message: `No snapshots found for client "${clientName}"` };
    }

    let snapshotToRestore: AssessmentSnapshot | undefined;
    if (snapshotId) {
      snapshotToRestore = snapshots.find((s) => s.id === snapshotId);
      if (!snapshotToRestore) {
        return { success: false, message: `Snapshot with ID "${snapshotId}" not found` };
      }
    } else {
      snapshotToRestore = snapshots.length < 2 ? snapshots[0] : snapshots[1];
    }

    const snapshotDate =
      snapshotToRestore.timestamp?.toDate?.()?.toLocaleString?.() || "unknown date";
    logger.info(
      `[RESTORE] Restoring "${clientName}" from session ${snapshotToRestore.id} (${snapshotDate})`,
      "assessmentHistory",
    );

    const currentRef = getCurrentStateDoc(organizationId, clientName);
    await setDoc(
      currentRef,
      {
        formData: sanitizeForFirestore(snapshotToRestore.formData),
        overallScore: snapshotToRestore.overallScore ?? 0,
        lastUpdated: serverTimestamp(),
        clientName,
        organizationId,
        restoredBy: coachUid,
        restoredFromSnapshot: snapshotToRestore.id,
      },
      { merge: false },
    );

    return {
      success: true,
      message: `Successfully restored "${clientName}" from snapshot dated ${snapshotDate}`,
      restoredScore: snapshotToRestore.overallScore,
    };
  } catch (error) {
    logger.error("[RESTORE] Failed to restore from snapshot:", error);
    return { success: false, message: `Restore failed: ${error}` };
  }
}

export async function listClientSnapshots(
  coachUid: string,
  clientName: string,
  organizationId?: string,
): Promise<{ id: string; date: string; score: number; type: string }[]> {
  if (!organizationId) {
    logger.warn("listClientSnapshots called without organizationId", "assessmentHistory");
    return [];
  }

  const snapshots = await getSnapshots(coachUid, clientName, 20, organizationId);
  return snapshots.map((s) => ({
    id: s.id || "unknown",
    date: s.timestamp?.toDate?.()?.toLocaleString?.() || "unknown",
    score: s.overallScore,
    type: s.type,
  }));
}
