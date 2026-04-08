import {
  collection,
  doc,
  getDocs,
  writeBatch,
  query,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import { ORGANIZATION } from '@/lib/database/paths';
import { ACHIEVEMENT_DEFINITIONS } from '@/constants/achievements';
import type { Achievement } from '@/types/achievements';
import { logger } from '@/lib/utils/logger';

const MAX_ACHIEVEMENTS = 50;

const PILLAR_IDS = ['bodyComp', 'cardio', 'strength', 'movementQuality', 'lifestyle'] as const;

function achievementsCollection(organizationId: string, clientId: string) {
  return collection(getDb(), ORGANIZATION.clientAchievements.collection(organizationId, clientId));
}

function legacyAchievementsCollection(shareToken: string) {
  return collection(getDb(), COLLECTIONS.PUBLIC_REPORTS, shareToken, COLLECTIONS.ACHIEVEMENTS);
}

async function getExistingAchievements(organizationId: string, clientId: string): Promise<Map<string, Achievement>> {
  const q = query(achievementsCollection(organizationId, clientId), limit(MAX_ACHIEVEMENTS));
  const snap = await getDocs(q);
  const map = new Map<string, Achievement>();
  snap.docs.forEach((d) => {
    map.set(d.id, { id: d.id, ...d.data() } as Achievement);
  });
  return map;
}

export type CategoryScoreInput = {
  id: string;
  score: number;
  assessed: boolean;
};

interface EvaluationInput {
  organizationId: string;
  clientId: string;
  shareToken?: string;
  overallScore: number;
  /** Session mean; milestones and holistic trophies use fullProfileScore when set */
  fullProfileScore: number | null;
  categoryScores: CategoryScoreInput[];
  previousOverallScore?: number;
  previousFullProfileScore?: number | null;
  previousCategoryScores?: CategoryScoreInput[];
  assessmentCount: number;
}

export type UnlockedAchievement = { id: string; title: string; description: string };

export async function evaluateAchievements(input: EvaluationInput): Promise<UnlockedAchievement[]> {
  const {
    organizationId,
    clientId,
    overallScore,
    fullProfileScore,
    categoryScores,
    previousOverallScore,
    previousCategoryScores,
    assessmentCount,
  } = input;

  const newlyUnlocked: UnlockedAchievement[] = [];

  try {
    const existing = await getExistingAchievements(organizationId, clientId);
    const batch = writeBatch(getDb());
    let changesMade = false;

    const scoreMap = new Map(categoryScores.map((c) => [c.id, c.score]));
    const assessedMap = new Map(categoryScores.map((c) => [c.id, c.assessed]));
    const prevScoreMap = previousCategoryScores
      ? new Map(previousCategoryScores.map((c) => [c.id, c.score]))
      : null;
    const prevAssessedMap = previousCategoryScores
      ? new Map(previousCategoryScores.map((c) => [c.id, c.assessed]))
      : null;

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const ref = doc(achievementsCollection(organizationId, clientId), def.id);
      const current = existing.get(def.id);

      if (current?.unlockedAt) continue;

      let newProgress = current?.currentValue ?? 0;
      let shouldUnlock = false;

      if (def.type === 'streak') {
        newProgress = assessmentCount;
        shouldUnlock = assessmentCount >= def.threshold;
      }

      if (def.type === 'milestone' && def.category === 'progress') {
        if (fullProfileScore === null) {
          newProgress = 0;
          shouldUnlock = false;
        } else {
          newProgress = fullProfileScore;
          shouldUnlock = fullProfileScore >= def.threshold;
        }
      }

      if (def.id === 'trophy_first_assessment') {
        newProgress = assessmentCount;
        shouldUnlock = assessmentCount >= 1;
      }

      if (def.id === 'trophy_all_improved' && prevScoreMap && prevAssessedMap && prevScoreMap.size > 0) {
        const improved = categoryScores.filter((c) => {
          if (!c.assessed) return false;
          if (!prevAssessedMap.get(c.id)) return false;
          const prev = prevScoreMap.get(c.id);
          return prev !== undefined && c.score > prev;
        });
        newProgress = improved.length;
        const allFiveAssessed = PILLAR_IDS.every((id) => assessedMap.get(id) === true);
        shouldUnlock = allFiveAssessed && improved.length >= 5;
      }

      if (def.id === 'trophy_biggest_leap' && previousOverallScore !== undefined) {
        const leap = overallScore - previousOverallScore;
        newProgress = Math.max(leap, current?.currentValue ?? 0);
        shouldUnlock = leap >= def.threshold;
      }

      if (def.id === 'trophy_full_house') {
        const assessedPillars = categoryScores.filter((c) => c.assessed);
        const above70 = assessedPillars.filter((c) => c.score >= 70);
        newProgress = above70.length;
        shouldUnlock = assessedPillars.length >= 5 && above70.length >= 5;
      }

      const pillarScoreMatch = def.id.match(/^pillar_(\w+)_80$/);
      if (pillarScoreMatch) {
        const pillarId = pillarScoreMatch[1];
        const assessed = assessedMap.get(pillarId) === true;
        const pillarScore = scoreMap.get(pillarId) ?? 0;
        newProgress = assessed ? pillarScore : 0;
        shouldUnlock = assessed && pillarScore >= def.threshold;
      }

      if (def.id === 'pillar_weakest_link') {
        const assessedCount = categoryScores.filter((c) => c.assessed).length;
        newProgress = assessmentCount;
        shouldUnlock = assessmentCount >= 2 && assessedCount >= 2 && categoryScores.length > 0;
      }

      if (def.id === 'pillar_biggest_gain' && prevScoreMap && prevAssessedMap && prevScoreMap.size > 0) {
        let maxGain = 0;
        for (const cs of categoryScores) {
          if (!cs.assessed) continue;
          if (!prevAssessedMap.get(cs.id)) continue;
          const prev = prevScoreMap.get(cs.id);
          if (prev === undefined) continue;
          maxGain = Math.max(maxGain, cs.score - prev);
        }
        newProgress = Math.max(maxGain, current?.currentValue ?? 0);
        shouldUnlock = maxGain >= def.threshold;
      }

      const progressPct = def.threshold > 0 ? Math.min(100, Math.round((newProgress / def.threshold) * 100)) : 0;

      if (!current) {
        batch.set(ref, {
          organizationId,
          type: def.type,
          category: def.category,
          title: def.title,
          description: def.description,
          icon: def.icon,
          unlockedAt: shouldUnlock ? serverTimestamp() : null,
          progress: progressPct,
          threshold: def.threshold,
          currentValue: newProgress,
        });
        changesMade = true;
      } else if (newProgress !== current.currentValue || shouldUnlock) {
        batch.update(ref, {
          currentValue: newProgress,
          progress: progressPct,
          ...(shouldUnlock ? { unlockedAt: serverTimestamp() } : {}),
        });
        changesMade = true;
      }

      if (shouldUnlock) {
        newlyUnlocked.push({ id: def.id, title: def.title, description: def.description });
      }
    }

    if (changesMade) {
      await batch.commit();
      logger.debug(`Achievements evaluated for client ${clientId} (${newlyUnlocked.length} unlocked)`, 'ACHIEVEMENTS');
    }
  } catch (error) {
    logger.error('Failed to evaluate achievements', 'ACHIEVEMENTS', error);
  }

  return newlyUnlocked;
}

export async function populateClientData(): Promise<number> {
  if (!import.meta.env.DEV) {
    logger.warn('[Populate] Called in production — skipping');
    return 0;
  }

  const {
    collection: fbCollection,
    query: fbQuery,
    getDocs: fbGetDocs,
    limit: fbLimit,
    addDoc,
    serverTimestamp: fbTimestamp,
  } = await import('firebase/firestore');
  const { computeScores } = await import('@/lib/scoring');
  const db = getDb();

  const reportsRef = fbCollection(db, COLLECTIONS.PUBLIC_REPORTS);
  const allQ = fbQuery(reportsRef, fbLimit(200));
  const snap = await fbGetDocs(allQ);

  logger.info(`[Populate] Found ${snap.size} public reports`);

  let totalUnlocked = 0;
  let processed = 0;

  for (const reportDoc of snap.docs) {
    const data = reportDoc.data();
    const shareToken = reportDoc.id;
    const formData = data.formData;

    if (!formData) {
      logger.info(`[Populate] Skipping ${shareToken} — no formData`);
      continue;
    }

    const orgId = (data.organizationId as string) || 'unknown';
    const clientName = (formData.fullName as string) || 'Client';

    try {
      const scores = computeScores(formData);
      const categoryScores = scores.categories.map((c) => ({
        id: c.id,
        score: c.score,
        assessed: c.assessed,
      }));

      const assessmentCount = 1;

      const unlocked = await evaluateAchievements({
        organizationId: orgId,
        clientId: (data.assessmentId as string) || shareToken,
        shareToken,
        overallScore: scores.overall,
        fullProfileScore: scores.fullProfileScore,
        categoryScores,
        assessmentCount,
      });

      totalUnlocked += unlocked.length;

      const notifRef = fbCollection(db, COLLECTIONS.PUBLIC_REPORTS, shareToken, COLLECTIONS.NOTIFICATIONS);

      const existingNotifs = await fbGetDocs(fbQuery(notifRef, fbLimit(1)));
      if (existingNotifs.empty) {
        await addDoc(notifRef, {
          type: 'assessment_complete',
          title: 'Your assessment results are ready',
          body: `Hi ${clientName}, your fitness report is ready to view.`,
          priority: 'medium',
          read: false,
          createdAt: fbTimestamp(),
          shareToken,
        });

        for (const ach of unlocked) {
          await addDoc(notifRef, {
            type: 'system',
            title: `ARC™ milestone unlocked: ${ach.title}`,
            body: ach.description,
            priority: 'low',
            read: false,
            createdAt: fbTimestamp(),
            shareToken,
          });
        }

        logger.info(
          `[Populate] ${clientName} (${shareToken.substring(0, 8)}...): score=${scores.overall}, ${unlocked.length} achievements, notifications written`,
        );
      } else {
        logger.info(
          `[Populate] ${clientName} (${shareToken.substring(0, 8)}...): score=${scores.overall}, ${unlocked.length} achievements (notifications already exist)`,
        );
      }

      processed++;
    } catch (err) {
      logger.warn(`[Populate] Failed for ${shareToken}:`, err);
    }
  }

  logger.info(`[Populate] Done: ${processed} reports processed, ${totalUnlocked} achievements unlocked`);
  return totalUnlocked;
}

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).populateClientData = populateClientData;
}
