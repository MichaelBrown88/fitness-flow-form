/**
 * Repair Client Data
 *
 * One-time repair for clients with stale profile dates and assessment summaries.
 * Fixes:
 *   1. Backfills lastAssessmentDate and per-pillar dates from assessment history
 *   2. Recalculates overallScore and trend on summary docs from actual formData
 *
 * Run from browser console:
 *   await window.repairClientData({ dryRun: true })   // preview changes
 *   await window.repairClientData({ dryRun: false })  // apply changes
 */

import { collection, getDocs, doc, updateDoc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { getDb, auth } from '@/services/firebase';
import { ORGANIZATION } from '@/lib/database/paths';
import { computeScores } from '@/lib/scoring';
import type { FormData } from '@/contexts/FormContext';

interface RepairOptions {
  dryRun?: boolean;
  orgId?: string;
}

interface RepairResult {
  profilesFixed: number;
  summariesFixed: number;
  errors: string[];
  details: string[];
}

async function resolveOrgId(providedOrgId?: string): Promise<string> {
  if (providedOrgId) return providedOrgId;

  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in. Please log in first.');

  const profileDoc = await getDoc(doc(getDb(), `userProfiles/${user.uid}`));
  if (!profileDoc.exists()) throw new Error('User profile not found.');

  const orgId = profileDoc.data().organizationId as string | undefined;
  if (!orgId) throw new Error('No organizationId on your profile.');

  return orgId;
}

export async function repairClientData(
  options: RepairOptions = { dryRun: true },
): Promise<RepairResult> {
  const { dryRun = true } = options;
  const result: RepairResult = { profilesFixed: 0, summariesFixed: 0, errors: [], details: [] };
  const log = (msg: string) => {
    console.log(`[RepairClientData] ${msg}`);
    result.details.push(msg);
  };

  log(dryRun ? '🔍 DRY RUN — no changes will be written' : '🔧 LIVE RUN — writing changes');

  const orgId = await resolveOrgId(options.orgId);
  log(`Organization: ${orgId}`);
  await repairOrg(orgId, dryRun, result, log);

  log(`\n📊 Summary: ${result.profilesFixed} profiles fixed, ${result.summariesFixed} summaries fixed, ${result.errors.length} errors`);
  return result;
}

async function repairOrg(
  orgId: string,
  dryRun: boolean,
  result: RepairResult,
  log: (msg: string) => void,
) {
  log(`\n── Org: ${orgId} ──`);

  // 1. Load all client profiles
  const clientsSnap = await getDocs(collection(getDb(), ORGANIZATION.clients.collection(orgId)));
  log(`  Found ${clientsSnap.size} client profiles`);

  // 2. Load all assessment summaries
  const assessmentsSnap = await getDocs(collection(getDb(), ORGANIZATION.assessments.collection(orgId)));
  log(`  Found ${assessmentsSnap.size} assessment summaries`);

  // Build summary lookup by clientNameLower
  const summaryByClient = new Map<string, { docId: string; data: Record<string, unknown> }>();
  for (const aDoc of assessmentsSnap.docs) {
    const data = aDoc.data();
    const key = (data.clientName as string || '').toLowerCase();
    const existing = summaryByClient.get(key);
    const existingTime = existing ? ((existing.data.updatedAt as Timestamp)?.toMillis() ?? (existing.data.createdAt as Timestamp)?.toMillis() ?? 0) : 0;
    const currentTime = (data.updatedAt as Timestamp)?.toMillis() ?? (data.createdAt as Timestamp)?.toMillis() ?? 0;
    if (!existing || currentTime > existingTime) {
      summaryByClient.set(key, { docId: aDoc.id, data });
    }
  }

  // 3. For each client, check and repair
  for (const clientDoc of clientsSnap.docs) {
    const profile = clientDoc.data();
    const clientName = profile.clientName as string;
    if (!clientName) continue;

    const clientSlug = clientName.toLowerCase().replace(/\s+/g, '-');

    // Load current assessment from history
    try {
      const currentRef = doc(getDb(), ORGANIZATION.assessmentHistory.current(orgId, clientSlug));
      const currentSnap = await getDoc(currentRef);

      if (!currentSnap.exists()) {
        log(`  ⚠️ ${clientName}: No current assessment in history`);
        continue;
      }

      const currentData = currentSnap.data();
      const formData = currentData.formData as FormData | undefined;
      const historyTimestamp = currentData.updatedAt as Timestamp | undefined
        ?? currentData.createdAt as Timestamp | undefined;

      if (!formData) {
        log(`  ⚠️ ${clientName}: Current assessment has no formData`);
        continue;
      }

      // Recompute score from actual data
      const scores = computeScores(formData);
      const correctScore = scores.overall;

      // --- Fix profile dates ---
      const profileUpdates: Record<string, unknown> = {};
      const now = historyTimestamp ?? Timestamp.now();

      if (!profile.lastAssessmentDate) {
        profileUpdates.lastAssessmentDate = now;
      }

      const pillarFields = [
        'lastInBodyDate', 'lastPostureDate', 'lastFitnessDate',
        'lastStrengthDate', 'lastLifestyleDate',
      ];
      for (const field of pillarFields) {
        if (!profile[field]) {
          profileUpdates[field] = now;
        }
      }

      if (Object.keys(profileUpdates).length > 0) {
        log(`  📋 ${clientName}: Backfilling profile dates: ${Object.keys(profileUpdates).join(', ')}`);
        if (!dryRun) {
          const clientRef = doc(getDb(), ORGANIZATION.clients.collection(orgId), clientDoc.id);
          await updateDoc(clientRef, profileUpdates);
        }
        result.profilesFixed++;
      }

      // --- Fix assessment summary ---
      const summary = summaryByClient.get(clientName.toLowerCase());
      if (summary) {
        const summaryUpdates: Record<string, unknown> = {};
        const currentSummaryScore = summary.data.overallScore as number ?? 0;

        if (currentSummaryScore !== correctScore) {
          summaryUpdates.overallScore = correctScore;
          summaryUpdates.previousScore = currentSummaryScore;
          summaryUpdates.trend = correctScore - currentSummaryScore;
          log(`  📊 ${clientName}: Score mismatch — summary has ${currentSummaryScore}, should be ${correctScore} (trend: ${correctScore - currentSummaryScore > 0 ? '+' : ''}${correctScore - currentSummaryScore})`);
        }

        if (!summary.data.updatedAt && historyTimestamp) {
          summaryUpdates.updatedAt = historyTimestamp;
          log(`  📅 ${clientName}: Backfilling summary updatedAt`);
        }

        if (Object.keys(summaryUpdates).length > 0) {
          if (!dryRun) {
            const summaryRef = doc(getDb(), ORGANIZATION.assessments.collection(orgId), summary.docId);
            await updateDoc(summaryRef, summaryUpdates);
          }
          result.summariesFixed++;
        } else {
          log(`  ✅ ${clientName}: Summary OK (score: ${currentSummaryScore})`);
        }
      } else {
        log(`  ⚠️ ${clientName}: No assessment summary found`);
      }
    } catch (err) {
      const msg = `${clientName}: ${err instanceof Error ? err.message : String(err)}`;
      result.errors.push(msg);
      log(`  ❌ ${msg}`);
    }
  }
}

/**
 * Diagnostic: dump raw Firestore data for the dashboard to the console.
 * Run: await window.diagnoseClientDashboard()
 */
export async function diagnoseClientDashboard(): Promise<void> {
  const orgId = await resolveOrgId();
  console.log(`\n🔎 Diagnosing dashboard data for org: ${orgId}\n`);

  const assessmentsSnap = await getDocs(collection(getDb(), ORGANIZATION.assessments.collection(orgId)));
  console.log(`Assessment summaries: ${assessmentsSnap.size} documents\n`);

  const byClient = new Map<string, { docId: string; score: number; trend?: number; createdAt?: string; updatedAt?: string; coachUid?: string }[]>();

  for (const aDoc of assessmentsSnap.docs) {
    const d = aDoc.data();
    const name = (d.clientName as string) || '(unnamed)';
    const entry = {
      docId: aDoc.id,
      score: d.overallScore as number ?? 0,
      trend: d.trend as number | undefined,
      createdAt: (d.createdAt as Timestamp)?.toDate()?.toLocaleDateString() ?? '—',
      updatedAt: (d.updatedAt as Timestamp)?.toDate()?.toLocaleDateString() ?? '—',
      coachUid: (d.coachUid as string) ?? '—',
    };
    const list = byClient.get(name) ?? [];
    list.push(entry);
    byClient.set(name, list);
  }

  for (const [name, docs] of byClient) {
    const isDupe = docs.length > 1;
    console.log(`${isDupe ? '⚠️ DUPLICATE' : '✅'} ${name} — ${docs.length} doc(s)`);
    for (const d of docs) {
      console.log(`    ${d.docId} | score: ${d.score} | trend: ${d.trend ?? '—'} | created: ${d.createdAt} | updated: ${d.updatedAt} | coach: ${d.coachUid}`);
    }
  }

  console.log(`\n── Client Profiles ──`);
  const clientsSnap = await getDocs(collection(getDb(), ORGANIZATION.clients.collection(orgId)));
  for (const cDoc of clientsSnap.docs) {
    const p = cDoc.data();
    console.log(`[${cDoc.id}] ${p.clientName ?? '(no clientName field)'}: lastAssessment=${(p.lastAssessmentDate as Timestamp)?.toDate()?.toLocaleDateString() ?? '—'} | lastBodyComp=${(p.lastInBodyDate as Timestamp)?.toDate()?.toLocaleDateString() ?? '—'} | trainingStart=${p.trainingStartDate ?? '—'} | status=${p.status ?? 'active'}`);
  }
}

/**
 * Deduplicate assessment summaries: keep newest doc per client, delete stale duplicates.
 * Also fixes coachUid on the kept doc to the logged-in user's UID.
 *
 * Run: await window.deduplicateAssessments({ dryRun: true })
 */
export async function deduplicateAssessments(
  options: { dryRun?: boolean } = { dryRun: true },
): Promise<void> {
  const { dryRun = true } = options;
  const orgId = await resolveOrgId();
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');

  console.log(`\n${dryRun ? '🔍 DRY RUN' : '🔧 LIVE RUN'} — Deduplicating summaries for org: ${orgId}\n`);

  const assessmentsSnap = await getDocs(collection(getDb(), ORGANIZATION.assessments.collection(orgId)));

  const byClient = new Map<string, { docId: string; data: Record<string, unknown> }[]>();
  for (const aDoc of assessmentsSnap.docs) {
    const d = aDoc.data();
    const key = ((d.clientName as string) || '').toLowerCase();
    if (!key) continue;
    const list = byClient.get(key) ?? [];
    list.push({ docId: aDoc.id, data: d });
    byClient.set(key, list);
  }

  let deleted = 0;
  let fixed = 0;

  for (const [clientKey, docs] of byClient) {
    if (docs.length <= 1) {
      const single = docs[0];
      if (single.data.coachUid !== user.uid) {
        console.log(`  🔧 ${single.data.clientName}: Fixing coachUid ${single.data.coachUid} → ${user.uid}`);
        if (!dryRun) {
          await updateDoc(doc(getDb(), ORGANIZATION.assessments.collection(orgId), single.docId), {
            coachUid: user.uid,
          });
        }
        fixed++;
      }
      continue;
    }

    docs.sort((a, b) => {
      const timeA = (a.data.updatedAt as Timestamp)?.toMillis()
        ?? (a.data.createdAt as Timestamp)?.toMillis() ?? 0;
      const timeB = (b.data.updatedAt as Timestamp)?.toMillis()
        ?? (b.data.createdAt as Timestamp)?.toMillis() ?? 0;
      return timeB - timeA;
    });

    const keep = docs[0];
    const stale = docs.slice(1);
    const clientName = keep.data.clientName || clientKey;

    console.log(`  ✅ ${clientName}: Keeping ${keep.docId} (score: ${keep.data.overallScore})`);

    if (keep.data.coachUid !== user.uid) {
      console.log(`     🔧 Fixing coachUid ${keep.data.coachUid} → ${user.uid}`);
      if (!dryRun) {
        await updateDoc(doc(getDb(), ORGANIZATION.assessments.collection(orgId), keep.docId), {
          coachUid: user.uid,
        });
      }
      fixed++;
    }

    for (const old of stale) {
      console.log(`     🗑️ Deleting stale ${old.docId} (score: ${old.data.overallScore}, coach: ${old.data.coachUid})`);
      if (!dryRun) {
        await deleteDoc(doc(getDb(), ORGANIZATION.assessments.collection(orgId), old.docId));
      }
      deleted++;
    }
  }

  console.log(`\n📊 ${dryRun ? 'Would delete' : 'Deleted'}: ${deleted} stale docs, ${dryRun ? 'would fix' : 'fixed'}: ${fixed} coachUids`);
}

if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.repairClientData = repairClientData;
  w.diagnoseClientDashboard = diagnoseClientDashboard;
  w.deduplicateAssessments = deduplicateAssessments;
}
