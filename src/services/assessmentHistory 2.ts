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
  Timestamp 
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import type { FormData } from '@/contexts/FormContext';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';

export type AssessmentChange = {
  id?: string;
  timestamp: Timestamp;
  type: 'full' | 'partial-inbody' | 'partial-posture' | 'partial-fitness' | 'partial-strength' | 'partial-lifestyle';
  category: 'inbody' | 'posture' | 'fitness' | 'strength' | 'lifestyle' | 'all';
  changes: Record<string, { old: any; new: any }>;
  updatedBy: string;
};

export type AssessmentSnapshot = {
  id?: string;
  timestamp: Timestamp;
  type: 'monthly' | 'full-assessment' | 'manual';
  formData: FormData;
  overallScore: number;
  notes?: string;
};

const getClientSlug = (clientName: string) => {
  const safeName = (clientName || 'unnamed-client').trim() || 'unnamed-client';
  return safeName.toLowerCase().replace(/\s+/g, '-');
};

const getCurrentAssessmentDoc = (coachUid: string, clientName: string) =>
  doc(getDb(), 'coaches', coachUid, 'assessments', getClientSlug(clientName), 'current', 'data');

const getHistoryCollection = (coachUid: string, clientName: string) =>
  collection(getDb(), 'coaches', coachUid, 'assessments', getClientSlug(clientName), 'history');

const getSnapshotsCollection = (coachUid: string, clientName: string) =>
  collection(getDb(), 'coaches', coachUid, 'assessments', getClientSlug(clientName), 'snapshots');

/**
 * Get the current assessment for a client
 */
export async function getCurrentAssessment(
  coachUid: string,
  clientName: string,
): Promise<{ formData: FormData; overallScore: number; lastUpdated: Timestamp | null } | null> {
  const ref = getCurrentAssessmentDoc(coachUid, clientName);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    formData: (data.formData as FormData) ?? ({} as FormData),
    overallScore: typeof data.overallScore === 'number' ? data.overallScore : 0,
    lastUpdated: (data.lastUpdated as Timestamp | undefined) ?? null,
  };
}

/**
 * Calculate what fields changed between old and new form data
 */
function calculateChanges(
  oldData: FormData,
  newData: FormData,
  category?: 'inbody' | 'posture' | 'fitness' | 'strength' | 'lifestyle' | 'all',
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};
  
  // Define field categories
  const categoryFields: Record<string, string[]> = {
    inbody: [
      'inbodyWeightKg', 'inbodyBodyFatPct', 'bodyFatMassKg', 'inbodyBmi',
      'visceralFatLevel', 'skeletalMuscleMassKg', 'totalBodyWaterL',
      'waistHipRatio', 'segmentalArmRightKg', 'segmentalArmLeftKg',
      'segmentalLegRightKg', 'segmentalLegLeftKg', 'segmentalTrunkKg',
      'bmrKcal', 'inbodyScore'
    ],
    posture: [
      'postureInputMode', 'postureAiResults', 'postureSeverity',
      'postureForwardHead', 'postureRoundedShoulders', 'postureHeadOverall',
      'postureShouldersOverall', 'postureBackOverall', 'postureHipsOverall',
      'postureKneesOverall'
    ],
    fitness: [
      'cardioTestType', 'cardioTestSelected', 'cardioRestingHr',
      'cardioPost1MinHr', 'cardioMedicationFlag', 'cardioFinalHeartRate',
      'cardioVo2MaxEstimate', 'cardioTestInstructions', 'cardioNotes',
      'ymcaStepHeight', 'ymcaMetronomeBpm', 'ymcaPreTestHeartRate',
      'ymcaPost1MinHeartRate', 'ymcaRecoveryHeartRate1', 'ymcaRpe',
      'ymcaNotes', 'treadmillProtocol', 'treadmillIncline', 'treadmillSpeed',
      'treadmillDurationMin', 'treadmillFinalHeartRate', 'treadmillRpe',
      'treadmillTerminationReason', 'treadmillNotes'
    ],
    strength: [
      'pushupMaxReps', 'squatsOneMinuteReps', 'pushupsOneMinuteReps',
      'gripLeftKg', 'gripRightKg', 'chairStandReps', 'dynamometerForce'
    ],
    lifestyle: [
      'activityLevel', 'sleepDuration', 'sleepQuality', 'sleepConsistency',
      'stressLevel', 'workHoursPerDay', 'nutritionHabits', 'hydrationHabits',
      'stepsPerDay', 'sedentaryHours', 'caffeineCupsPerDay',
      'alcoholFrequency', 'lastCaffeineIntake'
    ],
  };
  
  const fieldsToCheck = category 
    ? categoryFields[category] || []
    : Object.keys(newData);
  
  for (const field of fieldsToCheck) {
    const oldValue = oldData[field as keyof FormData];
    const newValue = newData[field as keyof FormData];
    
    if (oldValue !== newValue && (oldValue !== undefined || newValue !== undefined)) {
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
  changeType: AssessmentChange['type'],
  category?: AssessmentChange['category'],
): Promise<void> {
  // Get current assessment
  const current = await getCurrentAssessment(coachUid, clientName);
  const oldData = current?.formData ?? ({} as FormData);
  
  // Calculate changes - filter out 'all' category for calculateChanges
  const changes = calculateChanges(oldData, formData, category === 'all' ? undefined : category);
  
  // If no changes, skip update
  if (Object.keys(changes).length === 0) {
    return;
  }
  
  // Update current assessment
  const currentRef = getCurrentAssessmentDoc(coachUid, clientName);
  console.log(`[SYNC] Saving current assessment to: ${currentRef.path}`);
  try {
    await setDoc(currentRef, {
      formData: sanitizeForFirestore(formData),
      overallScore: overallScore ?? 0,
      lastUpdated: serverTimestamp(),
      clientName: clientName || 'Unnamed client',
    }, { merge: false }); // Overwrite completely
    console.log(`[SYNC] ✓ Current assessment saved`);
  } catch (err) {
    console.error(`[SYNC] ✗ Failed to save current assessment:`, err);
    throw err;
  }
  
  // Log change to history
  const historyRef = getHistoryCollection(coachUid, clientName);
  console.log(`[SYNC] Logging change to history: ${historyRef.path}`);
  try {
    await addDoc(historyRef, {
      timestamp: serverTimestamp(),
      type: changeType,
      category: category || 'all',
      changes: sanitizeForFirestore(changes),
      updatedBy: coachUid || 'unknown',
    });
    console.log(`[SYNC] ✓ History log created`);
  } catch (err) {
    console.warn(`[SYNC] ✗ Failed to log history (non-critical):`, err);
    // Don't throw for history log failure, but log it
  }
  
  // Check if we should create a snapshot (monthly, full assessment, or partial update)
  const now = new Date();
  const shouldCreateSnapshot = 
    changeType === 'full' ||
    changeType.startsWith('partial-') || // Create snapshots for partial updates too
    (now.getDate() === 1 && !current?.lastUpdated); // First of month
  
  if (shouldCreateSnapshot) {
    const snapshotType = changeType === 'full' ? 'full-assessment' : 
                        changeType.startsWith('partial-') ? 'manual' : 'monthly';
    await createSnapshot(coachUid, clientName, formData, overallScore, snapshotType);
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
  snapshotType: AssessmentSnapshot['type'] = 'manual',
  notes?: string,
): Promise<string> {
  const snapshotsRef = getSnapshotsCollection(coachUid, clientName);
  const docRef = await addDoc(snapshotsRef, {
    timestamp: serverTimestamp(),
    type: snapshotType,
    formData: sanitizeForFirestore(formData),
    overallScore: overallScore ?? 0,
    notes: notes ?? null,
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
): Promise<AssessmentChange[]> {
  const historyRef = getHistoryCollection(coachUid, clientName);
  const q = query(historyRef, orderBy('timestamp', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  
  const changes: AssessmentChange[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    changes.push({
      id: docSnap.id,
      timestamp: (data.timestamp as Timestamp) ?? Timestamp.now(),
      type: data.type as AssessmentChange['type'],
      category: data.category as AssessmentChange['category'],
      changes: data.changes ?? {},
      updatedBy: data.updatedBy ?? '',
    });
  });
  
  return changes;
}

/**
 * Get snapshots for a client
 */
export async function getSnapshots(
  coachUid: string,
  clientName: string,
  limitCount: number = 50,
): Promise<AssessmentSnapshot[]> {
  const snapshotsRef = getSnapshotsCollection(coachUid, clientName);
  const q = query(snapshotsRef, orderBy('timestamp', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  
  const snapshots: AssessmentSnapshot[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    snapshots.push({
      id: docSnap.id,
      timestamp: (data.timestamp as Timestamp) ?? Timestamp.now(),
      type: data.type as AssessmentSnapshot['type'],
      formData: (data.formData as FormData) ?? ({} as FormData),
      overallScore: typeof data.overallScore === 'number' ? data.overallScore : 0,
      notes: data.notes,
    });
  });
  
  return snapshots;
}

/**
 * Reconstruct assessment state at a specific date
 */
export async function reconstructAssessmentAtDate(
  coachUid: string,
  clientName: string,
  targetDate: Date,
): Promise<{ formData: FormData; overallScore: number } | null> {
  const targetTimestamp = Timestamp.fromDate(targetDate);
  
  // Find nearest snapshot before target date
  const snapshots = await getSnapshots(coachUid, clientName, 100);
  const nearestSnapshot = snapshots
    .filter(s => s.timestamp.toDate() <= targetDate)
    .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())[0];
  
  // Start with snapshot or empty
  let reconstructedData: FormData = nearestSnapshot?.formData ?? ({} as FormData);
  let reconstructedScore = nearestSnapshot?.overallScore ?? 0;
  
  // Get all changes between snapshot and target date
  const historyRef = getHistoryCollection(coachUid, clientName);
  const q = query(
    historyRef,
    where('timestamp', '>', nearestSnapshot?.timestamp ?? Timestamp.fromDate(new Date(0))),
    where('timestamp', '<=', targetTimestamp),
    orderBy('timestamp', 'asc')
  );
  
  const changesSnap = await getDocs(q);
  const changes: AssessmentChange[] = [];
  changesSnap.forEach((docSnap) => {
    const data = docSnap.data();
    changes.push({
      id: docSnap.id,
      timestamp: data.timestamp as Timestamp,
      type: data.type as AssessmentChange['type'],
      category: data.category as AssessmentChange['category'],
      changes: data.changes ?? {},
      updatedBy: data.updatedBy ?? '',
    });
  });
  
  // Apply changes chronologically
  for (const change of changes) {
    for (const [field, values] of Object.entries(change.changes)) {
      (reconstructedData as any)[field] = values.new;
    }
  }
  
  // Recalculate score if we have the computeScores function available
  try {
    const { computeScores } = await import('@/lib/scoring');
    const scores = computeScores(reconstructedData);
    reconstructedScore = scores.overall;
  } catch (e) {
    console.warn('Could not recalculate score:', e);
  }
  
  return {
    formData: reconstructedData,
    overallScore: reconstructedScore,
  };
}

/**
 * Compare two assessment states
 */
export function compareAssessments(
  oldData: FormData,
  newData: FormData,
  category?: string,
): Record<string, { old: any; new: any; changed: boolean }> {
  const comparison: Record<string, { old: any; new: any; changed: boolean }> = {};
  const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  
  for (const field of allFields) {
    const oldValue = oldData[field as keyof FormData];
    const newValue = newData[field as keyof FormData];
    const changed = oldValue !== newValue;
    
    comparison[field] = {
      old: oldValue ?? null,
      new: newValue ?? null,
      changed,
    };
  }
  
  return comparison;
}

