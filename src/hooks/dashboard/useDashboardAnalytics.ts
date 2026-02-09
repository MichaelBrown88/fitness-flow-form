/**
 * Dashboard Analytics Hook
 *
 * Computes analytics from assessment data.
 */

import { useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { getCoachAssessment, type CoachAssessmentSummary } from '@/services/coachAssessments';
import { computeScores } from '@/lib/scoring';
import type { Analytics } from './types';

export function useDashboardAnalytics(
  profile?: { organizationId?: string } | null,
  /** Effective org ID for reads (supports impersonation) */
  effectiveOrgId?: string | null,
) {
  // Reads use effectiveOrgId (impersonation), fallback to profile
  const readOrgId = effectiveOrgId || profile?.organizationId;
  const computeAnalytics = useCallback(async (
    assessments: CoachAssessmentSummary[],
    coachUid: string
  ): Promise<Analytics> => {
    if (assessments.length === 0) {
      return {
        totalClients: 0,
        totalAssessments: 0,
        averageScore: 0,
        mostCommonIssues: [],
        highestCategory: null,
        lowestCategory: null,
        assessmentsThisMonth: 0,
        clientsThisMonth: 0,
      };
    }

    const uniqueClients = new Set(assessments.map(a => a.clientName));
    // With upsert (one row per client), assessments.length = unique clients.
    // Sum assessmentCount field to get the true total assessments performed.
    const totalAssessmentsCount = assessments.reduce(
      (sum, a) => sum + (a.assessmentCount || 1), 0
    );
    const avgScore = Math.round(
      assessments.reduce((sum, a) => sum + (a.overallScore || 0), 0) / assessments.length
    );

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Clients assessed this month = clients whose latest assessment (createdAt) is this month
    const assessmentsThisMonth = assessments.filter(a =>
      a.createdAt && a.createdAt.toDate() >= thisMonth
    ).length;

    const clientsThisMonth = new Set(
      assessments
        .filter(a => a.createdAt && a.createdAt.toDate() >= thisMonth)
        .map(a => a.clientName)
    ).size;

    const issueCounts: Record<string, number> = {};
    const categoryScores: Record<string, number[]> = {
      bodyComp: [],
      cardio: [],
      strength: [],
      movementQuality: [],
      lifestyle: [],
    };

    const sampleSize = Math.min(20, assessments.length);
    const samples = assessments.slice(0, sampleSize);

    const summaries = await Promise.all(samples.map(async (assessment) => {
      try {
        if (assessment.scoresSummary) {
          return assessment.scoresSummary;
        }
        const full = await getCoachAssessment(coachUid, assessment.id, undefined, readOrgId, profile);
        if (full?.formData) {
          return computeScores(full.formData);
        }
        return null;
      } catch (err) {
        logger.warn(`Failed to load assessment ${assessment.id} for analytics:`, err);
        return null;
      }
    }));

    summaries.forEach((summary) => {
      if (!summary) return;
      summary.categories.forEach(cat => {
        if (categoryScores[cat.id]) {
          categoryScores[cat.id].push(cat.score);
        }
        cat.weaknesses.forEach(weakness => {
          issueCounts[weakness] = (issueCounts[weakness] || 0) + 1;
        });
      });
    });

    const mostCommonIssues = Object.entries(issueCounts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const categoryAverages = Object.entries(categoryScores)
      .map(([id, scores]) => ({
        id,
        name: id === 'bodyComp' ? 'Body Composition' :
          id === 'cardio' ? 'Cardiovascular' :
            id === 'strength' ? 'Strength' :
              id === 'movementQuality' ? 'Movement Quality' :
                'Lifestyle',
        avgScore: scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0
      }))
      .filter(c => c.avgScore > 0);

    const sortedCategories = [...categoryAverages].sort((a, b) => b.avgScore - a.avgScore);
    const highestCategory = sortedCategories[0] || null;
    const lowestCategory = sortedCategories[sortedCategories.length - 1] || null;

    return {
      totalClients: uniqueClients.size,
      totalAssessments: totalAssessmentsCount,
      averageScore: avgScore,
      mostCommonIssues,
      highestCategory: highestCategory ? { name: highestCategory.name, avgScore: highestCategory.avgScore } : null,
      lowestCategory: lowestCategory ? { name: lowestCategory.name, avgScore: lowestCategory.avgScore } : null,
      assessmentsThisMonth,
      clientsThisMonth,
    };
  }, [readOrgId]);

  return { computeAnalytics };
}
