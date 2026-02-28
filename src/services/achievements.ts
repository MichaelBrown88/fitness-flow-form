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
import { ACHIEVEMENT_DEFINITIONS } from '@/constants/achievements';
import type { Achievement } from '@/types/achievements';
import { logger } from '@/lib/utils/logger';

const MAX_ACHIEVEMENTS = 50;

/**
 * Get the token-scoped achievements collection.
 * Path: publicReports/{shareToken}/achievements
 */
function achievementsCollection(shareToken: string) {
  return collection(getDb(), COLLECTIONS.PUBLIC_REPORTS, shareToken, COLLECTIONS.ACHIEVEMENTS);
}

/** Fetch all existing achievements for a client via their share token */
async function getExistingAchievements(shareToken: string): Promise<Map<string, Achievement>> {
  const q = query(achievementsCollection(shareToken), limit(MAX_ACHIEVEMENTS));
  const snap = await getDocs(q);
  const map = new Map<string, Achievement>();
  snap.docs.forEach((d) => {
    map.set(d.id, { id: d.id, ...d.data() } as Achievement);
  });
  return map;
}

interface EvaluationInput {
  /** Share token that scopes achievements to publicReports/{shareToken}/achievements */
  shareToken: string;
  organizationId: string;
  overallScore: number;
  categoryScores: Array<{ id: string; score: number }>;
  previousOverallScore?: number;
  previousCategoryScores?: Array<{ id: string; score: number }>;
  assessmentCount: number;
}

/** IDs of achievements that were newly unlocked during this evaluation */
export type UnlockedAchievement = { id: string; title: string; description: string };

/**
 * Evaluate which achievements should be unlocked or updated for a client.
 * Called after each assessment save. Returns newly unlocked achievements.
 *
 * Storage: publicReports/{shareToken}/achievements/{achievementId}
 */
export async function evaluateAchievements(input: EvaluationInput): Promise<UnlockedAchievement[]> {
  const {
    shareToken,
    organizationId,
    overallScore,
    categoryScores,
    previousOverallScore,
    previousCategoryScores,
    assessmentCount,
  } = input;

  const newlyUnlocked: UnlockedAchievement[] = [];

  try {
    const existing = await getExistingAchievements(shareToken);
    const batch = writeBatch(getDb());
    let changesMade = false;

    const scoreMap = new Map(categoryScores.map((c) => [c.id, c.score]));
    const prevScoreMap = previousCategoryScores
      ? new Map(previousCategoryScores.map((c) => [c.id, c.score]))
      : null;

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const ref = doc(achievementsCollection(shareToken), def.id);
      const current = existing.get(def.id);

      if (current?.unlockedAt) continue;

      let newProgress = current?.currentValue ?? 0;
      let shouldUnlock = false;

      // Streaks (assessment count)
      if (def.type === 'streak') {
        newProgress = assessmentCount;
        shouldUnlock = assessmentCount >= def.threshold;
      }

      // Milestones (overall score thresholds)
      if (def.type === 'milestone' && def.category === 'progress') {
        newProgress = overallScore;
        shouldUnlock = overallScore >= def.threshold;
      }

      // Trophies
      if (def.id === 'trophy_first_assessment') {
        newProgress = assessmentCount;
        shouldUnlock = assessmentCount >= 1;
      }

      if (def.id === 'trophy_all_improved' && prevScoreMap && prevScoreMap.size > 0) {
        const improved = categoryScores.filter((c) => {
          const prev = prevScoreMap.get(c.id);
          return prev !== undefined && c.score > prev;
        });
        newProgress = improved.length;
        shouldUnlock = improved.length >= 5;
      }

      if (def.id === 'trophy_biggest_leap' && previousOverallScore !== undefined) {
        const leap = overallScore - previousOverallScore;
        newProgress = Math.max(leap, current?.currentValue ?? 0);
        shouldUnlock = leap >= def.threshold;
      }

      if (def.id === 'trophy_full_house') {
        const above70 = categoryScores.filter((c) => c.score >= 70).length;
        newProgress = above70;
        shouldUnlock = above70 >= 5;
      }

      // Pillar-specific: per-pillar score >= 80
      const pillarScoreMatch = def.id.match(/^pillar_(\w+)_80$/);
      if (pillarScoreMatch) {
        const pillarId = pillarScoreMatch[1];
        const pillarScore = scoreMap.get(pillarId) ?? 0;
        newProgress = pillarScore;
        shouldUnlock = pillarScore >= def.threshold;
      }

      // Pillar: weakest link (requires 2+ assessments)
      if (def.id === 'pillar_weakest_link') {
        newProgress = assessmentCount;
        if (assessmentCount >= 2 && categoryScores.length > 0) {
          shouldUnlock = true;
        }
      }

      // Pillar: biggest single-pillar gain (15+ points)
      if (def.id === 'pillar_biggest_gain' && prevScoreMap && prevScoreMap.size > 0) {
        let maxGain = 0;
        for (const cs of categoryScores) {
          const prev = prevScoreMap.get(cs.id);
          if (prev !== undefined) {
            maxGain = Math.max(maxGain, cs.score - prev);
          }
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
      logger.debug(`Achievements evaluated for token ${shareToken} (${newlyUnlocked.length} unlocked)`, 'ACHIEVEMENTS');
    }
  } catch (error) {
    logger.error('Failed to evaluate achievements', 'ACHIEVEMENTS', error);
  }

  return newlyUnlocked;
}

/**
 * Populate achievements + notifications for ALL public reports that have formData.
 * Dead simple: read every public report, compute scores, write achievements, write notifications.
 * Dev-only utility -- call from browser console: populateClientData()
 */
export async function populateClientData(): Promise<number> {
  if (!import.meta.env.DEV) {
    logger.warn('[Populate] Called in production — skipping');
    return 0;
  }

  const { collection: fbCollection, query: fbQuery, getDocs: fbGetDocs, limit: fbLimit, addDoc, serverTimestamp: fbTimestamp } = await import('firebase/firestore');
  const { computeScores } = await import('@/lib/scoring');
  const db = getDb();

  // Get ALL public reports (no filter — just grab them all)
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
      const categoryScores = scores.categories.map((c: { id: string; score: number }) => ({ id: c.id, score: c.score }));

      // Every client with a public report has done at least 1 assessment
      const assessmentCount = 1;

      const unlocked = await evaluateAchievements({
        shareToken,
        organizationId: orgId,
        overallScore: scores.overall,
        categoryScores,
        assessmentCount,
      });

      totalUnlocked += unlocked.length;

      // Write notifications for this client
      const notifRef = fbCollection(db, COLLECTIONS.PUBLIC_REPORTS, shareToken, COLLECTIONS.NOTIFICATIONS);

      // Check if notifications already exist
      const existingNotifs = await fbGetDocs(fbQuery(notifRef, fbLimit(1)));
      if (existingNotifs.empty) {
        // "Your report is ready" notification
        await addDoc(notifRef, {
          type: 'assessment_complete',
          title: 'Your assessment results are ready',
          body: `Hi ${clientName}, your fitness report is ready to view.`,
          priority: 'medium',
          read: false,
          createdAt: fbTimestamp(),
          shareToken,
        });

        // Achievement unlock notifications for each unlocked achievement
        for (const ach of unlocked) {
          await addDoc(notifRef, {
            type: 'system',
            title: `Achievement Unlocked: ${ach.title}`,
            body: ach.description,
            priority: 'low',
            read: false,
            createdAt: fbTimestamp(),
            shareToken,
          });
        }

        logger.info(`[Populate] ${clientName} (${shareToken.substring(0, 8)}...): score=${scores.overall}, ${unlocked.length} achievements, notifications written`);
      } else {
        logger.info(`[Populate] ${clientName} (${shareToken.substring(0, 8)}...): score=${scores.overall}, ${unlocked.length} achievements (notifications already exist)`);
      }

      processed++;
    } catch (err) {
      logger.warn(`[Populate] Failed for ${shareToken}:`, err);
    }
  }

  logger.info(`[Populate] Done: ${processed} reports processed, ${totalUnlocked} achievements unlocked`);
  return totalUnlocked;
}

// Expose on window for dev console usage
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).populateClientData = populateClientData;
}
