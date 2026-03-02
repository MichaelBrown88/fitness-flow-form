/**
 * Backfill Roadmaps for Existing Clients
 *
 * Generates roadmaps for all clients who have at least one assessment
 * but no roadmap yet. Uses the same generation pipeline as the UI builder.
 *
 * Run from browser console:
 *   await window.backfillRoadmaps({ dryRun: true })                  // preview what would be created
 *   await window.backfillRoadmaps({ dryRun: false })                 // create roadmaps for real
 *   await window.backfillRoadmaps({ dryRun: false, force: true })    // recreate all (deletes existing first)
 */

import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { getDb, auth } from '@/services/firebase';
import { ORGANIZATION } from '@/lib/database/paths';
import { computeScores } from '@/lib/scoring';
import { generateRoadmapBlocks } from '@/lib/roadmap/generateBlocks';
import { generatePhaseTargets, extractBaselineScores, determineActivePhase } from '@/lib/roadmap/phaseTargets';
import { generateRoadmapSummary } from '@/components/roadmap/RoadmapBuilder';
import { createRoadmap, getRoadmapForClient, generateShareToken, setRoadmapShareToken, deleteRoadmap } from '@/services/roadmaps';
import type { FormData } from '@/contexts/FormContext';
import type { RoadmapItem, RoadmapPhase } from '@/lib/roadmap/types';

interface BackfillOptions {
  dryRun?: boolean;
  orgId?: string;
  shareWithClients?: boolean;
  force?: boolean;
}

interface BackfillResult {
  processed: number;
  created: number;
  skipped: number;
  errors: string[];
  details: string[];
}

function blockToItem(block: import('@/lib/roadmap/types').RoadmapBlock, phase: RoadmapPhase): RoadmapItem {
  return {
    id: block.id, title: block.title, description: block.description, category: block.category,
    phase, targetWeeks: block.targetWeeks, status: 'not_started', priority: 0, source: 'auto',
    finding: block.finding, rationale: block.rationale, action: block.action,
    urgency: block.urgency, icon: block.icon, contraindications: block.contraindications, score: block.score,
    trackables: block.trackables,
  };
}

export async function backfillRoadmaps(options: BackfillOptions = {}): Promise<BackfillResult> {
  const { dryRun = true, shareWithClients = true, force = false } = options;
  const result: BackfillResult = { processed: 0, created: 0, skipped: 0, errors: [], details: [] };

  const user = auth.currentUser;
  if (!user) { result.errors.push('Not authenticated'); return result; }

  const orgId = options.orgId;
  if (!orgId) {
    const profileSnap = await getDoc(doc(getDb(), 'userProfiles', user.uid));
    if (!profileSnap.exists()) { result.errors.push('No user profile found'); return result; }
    const profileOrgId = profileSnap.data().organizationId;
    if (!profileOrgId) { result.errors.push('No organizationId on profile'); return result; }
    return backfillRoadmaps({ ...options, orgId: profileOrgId });
  }

  console.log(`🔍 Backfill roadmaps for org: ${orgId} (dryRun: ${dryRun})`);

  const orgAssessmentsRef = collection(getDb(), ORGANIZATION.assessments.collection(orgId));
  const allAssessmentsSnap = await getDocs(query(orgAssessmentsRef, orderBy('createdAt', 'desc')));
  const clientNames = new Set<string>();
  const latestByClient = new Map<string, typeof allAssessmentsSnap.docs[0]>();
  for (const d of allAssessmentsSnap.docs) {
    const name = d.data().clientName as string;
    if (!name) continue;
    clientNames.add(name);
    if (!latestByClient.has(name)) latestByClient.set(name, d);
  }

  console.log(`📋 Found ${clientNames.size} clients with assessments`);

  for (const clientName of clientNames) {
    result.processed++;
    try {
      const existing = await getRoadmapForClient(orgId, clientName);
      if (existing && existing.items.length > 0 && !force) {
        result.skipped++;
        result.details.push(`⏭️  ${clientName}: already has a roadmap with ${existing.items.length} items`);
        continue;
      }
      if (existing && force && !dryRun) {
        await deleteRoadmap(orgId, existing.id);
      }

      const assessmentDoc = latestByClient.get(clientName);
      if (!assessmentDoc) {
        result.skipped++;
        result.details.push(`⏭️  ${clientName}: no assessment data found`);
        continue;
      }
      const formData = assessmentDoc.data().formData as FormData;
      const scores = computeScores(formData);
      const blocks = generateRoadmapBlocks(scores, formData);

      if (blocks.length === 0) {
        result.skipped++;
        result.details.push(`⏭️  ${clientName}: no blocks generated (scores may be high)`);
        continue;
      }

      const items: RoadmapItem[] = blocks.map((b, i) => ({ ...blockToItem(b, b.phase), priority: i + 1 }));
      const totalWeeks = Math.max(...items.map((i) => i.targetWeeks));
      const goals = formData?.clientGoals ?? [];
      const summary = generateRoadmapSummary(clientName, goals, items, totalWeeks);
      const targets = generatePhaseTargets(items, scores);
      const baselines = extractBaselineScores(scores);
      const active = determineActivePhase(targets, baselines);

      if (dryRun) {
        result.created++;
        result.details.push(`✅ ${clientName}: would create roadmap — ${blocks.length} blocks, ${items.length} items, active phase: ${active}`);
        console.log(`  📊 ${clientName}: ${blocks.map(b => `${b.category}(${b.urgency})`).join(', ')}`);
      } else {
        const newId = await createRoadmap({
          organizationId: orgId,
          clientName,
          assessmentId: assessmentDoc.id,
          coachUid: user.uid,
          summary,
          items,
          previousScores: scores,
          phaseTargets: targets,
          baselineScores: baselines,
          activePhase: active,
        });

        if (shareWithClients) {
          const token = generateShareToken();
          await setRoadmapShareToken(orgId, newId, token);
          result.details.push(`✅ ${clientName}: created roadmap ${newId} (${items.length} items, shared)`);
        } else {
          result.details.push(`✅ ${clientName}: created roadmap ${newId} (${items.length} items, draft)`);
        }
        result.created++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`❌ ${clientName}: ${msg}`);
    }
  }

  console.log('\n📊 Backfill Summary:');
  console.log(`   Processed: ${result.processed}`);
  console.log(`   Created:   ${result.created}`);
  console.log(`   Skipped:   ${result.skipped}`);
  console.log(`   Errors:    ${result.errors.length}`);
  console.log('');
  for (const d of result.details) console.log(`   ${d}`);
  for (const e of result.errors) console.log(`   ${e}`);

  return result;
}

if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.backfillRoadmaps = backfillRoadmaps;
}
