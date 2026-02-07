/**
 * useReassessmentQueue Hook
 * 
 * Creates a prioritized queue of clients who need reassessment.
 * Considers:
 * - Time since last assessment for each pillar (InBody, Posture, Fitness, Strength)
 * - Pillar gaps (scores below threshold)
 * - Per-client cadence schedules (when available)
 * - Overall engagement patterns
 */

import { useMemo } from 'react';
import type { ClientGroup } from '@/hooks/dashboard/types';
import type { CoachAssessmentSummary } from '@/services/coachAssessments';
import type { PillarCadence, PartialAssessmentCategory } from '@/types/client';
import { 
  getEffectiveInterval, 
  getEffectiveReason, 
  getEffectivePriority 
} from '@/lib/recommendations/cadenceEngine';

/** Types of reassessment needs */
export type ReassessmentType = 
  | 'inbody' 
  | 'posture' 
  | 'fitness' 
  | 'strength' 
  | 'full' 
  | 'check-in';

/** Client in the reassessment queue */
export interface ReassessmentItem {
  clientName: string;
  latestAssessment: CoachAssessmentSummary | null;
  latestDate: Date | null;
  daysSinceAssessment: number;
  overallScore: number;
  reassessmentNeeds: ReassessmentType[];
  /** Reasons for each reassessment need (from cadence engine) */
  reassessmentReasons: Record<ReassessmentType, string>;
  priority: 'high' | 'medium' | 'low';
  priorityReason: string;
  pillarGaps: {
    pillar: string;
    score: number;
    threshold: number;
    daysSinceScan: number | null;
  }[];
  /** Whether this client has a custom cadence schedule */
  hasCustomCadence: boolean;
}

/** Queue summary */
export interface ReassessmentQueueSummary {
  totalClients: number;
  clientsNeedingReassessment: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  byType: Record<ReassessmentType, number>;
}

export interface UseReassessmentQueueResult {
  queue: ReassessmentItem[];
  summary: ReassessmentQueueSummary;
  highPriorityClients: ReassessmentItem[];
  dueForInBody: ReassessmentItem[];
  dueForPosture: ReassessmentItem[];
  dueForCheckIn: ReassessmentItem[];
}

/** 
 * Fallback thresholds for clients without personalized cadence schedules
 * These are used when no retestSchedule exists on the client profile
 */
const FALLBACK_THRESHOLDS = {
  // Days since last scan to trigger reassessment (ACSM/NASM aligned)
  inbody: 30,    // Monthly InBody recommended
  posture: 45,   // 4-6 week corrective block (FMS standards)
  fitness: 45,   // 6-week adaptation block
  strength: 60,  // True hypertrophy measurement
  full: 90,      // Quarterly full assessment
  checkIn: 14,   // 2-week check-in for high-gap clients
  
  // Score thresholds indicating gaps
  gapThreshold: 60,       // Score below this needs attention
  criticalGap: 40,        // Score below this is critical
  improvementTarget: 20,  // Gap > 20% from target
};

/**
 * Calculate days since a date
 */
function daysSince(date: Date | null | undefined): number {
  if (!date) return 999;
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Extract pillar scores from an assessment
 */
function extractPillarScores(assessment: CoachAssessmentSummary | null): {
  bodyComp: number;
  cardio: number;
  movement: number;
  strength: number;
  lifestyle: number;
} {
  if (!assessment?.scores?.categories) {
    return { bodyComp: 0, cardio: 0, movement: 0, strength: 0, lifestyle: 0 };
  }
  
  const categories = assessment.scores.categories;
  return {
    bodyComp: categories.find((c: { id: string }) => c.id === 'bodyComp')?.score || 0,
    cardio: categories.find((c: { id: string }) => c.id === 'cardio')?.score || 0,
    movement: categories.find((c: { id: string }) => c.id === 'movementQuality')?.score || 0,
    strength: categories.find((c: { id: string }) => c.id === 'strength')?.score || 0,
    lifestyle: categories.find((c: { id: string }) => c.id === 'lifestyle')?.score || 0,
  };
}

/**
 * Get the effective interval for a pillar, using client schedule or fallback
 */
function getClientInterval(
  pillar: PartialAssessmentCategory,
  retestSchedule?: ClientGroup['retestSchedule']
): number {
  if (!retestSchedule) {
    return FALLBACK_THRESHOLDS[pillar];
  }
  return getEffectiveInterval(retestSchedule.recommended, retestSchedule.custom, pillar);
}

/**
 * Get the reason for a pillar's cadence
 */
function getClientReason(
  pillar: PartialAssessmentCategory,
  retestSchedule?: ClientGroup['retestSchedule']
): string {
  if (!retestSchedule) {
    return 'Scheduled retest';
  }
  return getEffectiveReason(retestSchedule.recommended, retestSchedule.custom, pillar);
}

/**
 * Determine reassessment needs based on scores, time, and client-specific cadence
 */
function determineReassessmentNeeds(
  pillarScores: ReturnType<typeof extractPillarScores>,
  daysSinceLastAssessment: number,
  retestSchedule?: ClientGroup['retestSchedule']
): { needs: ReassessmentType[]; reasons: Record<ReassessmentType, string> } {
  const needs: ReassessmentType[] = [];
  const reasons: Record<ReassessmentType, string> = {} as Record<ReassessmentType, string>;
  
  // Check if full reassessment is due
  if (daysSinceLastAssessment >= FALLBACK_THRESHOLDS.full) {
    needs.push('full');
    reasons['full'] = 'Quarterly full reassessment due';
    return { needs, reasons };
  }
  
  // Check individual pillars with client-specific intervals
  const inbodyInterval = getClientInterval('inbody', retestSchedule);
  if (pillarScores.bodyComp < FALLBACK_THRESHOLDS.gapThreshold || 
      daysSinceLastAssessment >= inbodyInterval) {
    needs.push('inbody');
    reasons['inbody'] = getClientReason('inbody', retestSchedule);
  }
  
  const postureInterval = getClientInterval('posture', retestSchedule);
  if (pillarScores.movement < FALLBACK_THRESHOLDS.gapThreshold ||
      daysSinceLastAssessment >= postureInterval) {
    needs.push('posture');
    reasons['posture'] = getClientReason('posture', retestSchedule);
  }
  
  const fitnessInterval = getClientInterval('fitness', retestSchedule);
  if (pillarScores.cardio < FALLBACK_THRESHOLDS.gapThreshold ||
      daysSinceLastAssessment >= fitnessInterval) {
    needs.push('fitness');
    reasons['fitness'] = getClientReason('fitness', retestSchedule);
  }
  
  const strengthInterval = getClientInterval('strength', retestSchedule);
  if (pillarScores.strength < FALLBACK_THRESHOLDS.gapThreshold ||
      daysSinceLastAssessment >= strengthInterval) {
    needs.push('strength');
    reasons['strength'] = getClientReason('strength', retestSchedule);
  }
  
  // High-gap clients need more frequent check-ins
  const hasHighGap = Object.values(pillarScores).some(
    score => score > 0 && score < FALLBACK_THRESHOLDS.criticalGap
  );
  if (hasHighGap && daysSinceLastAssessment >= FALLBACK_THRESHOLDS.checkIn) {
    needs.push('check-in');
    reasons['check-in'] = 'Critical score requires check-in';
  }
  
  return { needs, reasons };
}

/**
 * Determine priority based on gaps, time, and client-specific cadence
 */
function determinePriority(
  pillarScores: ReturnType<typeof extractPillarScores>,
  daysSinceLastAssessment: number,
  needs: ReassessmentType[],
  retestSchedule?: ClientGroup['retestSchedule']
): { priority: 'high' | 'medium' | 'low'; reason: string } {
  // Critical gaps or full reassessment needed = high priority
  const hasCriticalGap = Object.values(pillarScores).some(
    score => score > 0 && score < FALLBACK_THRESHOLDS.criticalGap
  );
  
  if (hasCriticalGap) {
    return { priority: 'high', reason: 'Critical gap in pillar score (<40%)' };
  }
  
  if (needs.includes('full')) {
    return { priority: 'high', reason: 'Full reassessment overdue (90+ days)' };
  }
  
  if (daysSinceLastAssessment >= 60) {
    return { priority: 'high', reason: 'No assessment in 60+ days' };
  }
  
  // Check if any pillar has high priority in the cadence schedule
  if (retestSchedule) {
    const pillars: PartialAssessmentCategory[] = ['inbody', 'posture', 'fitness', 'strength'];
    for (const pillar of pillars) {
      const priority = getEffectivePriority(retestSchedule.recommended, retestSchedule.custom, pillar);
      if (priority === 'high' && needs.includes(pillar)) {
        const reason = getEffectiveReason(retestSchedule.recommended, retestSchedule.custom, pillar);
        return { priority: 'high', reason };
      }
    }
  }
  
  // Multiple needs = medium priority
  if (needs.length >= 2) {
    return { priority: 'medium', reason: `${needs.length} pillars need attention` };
  }
  
  // Single need or gap = medium priority
  const hasGap = Object.values(pillarScores).some(
    score => score > 0 && score < FALLBACK_THRESHOLDS.gapThreshold
  );
  if (hasGap) {
    return { priority: 'medium', reason: 'Pillar gap detected (<60%)' };
  }
  
  if (daysSinceLastAssessment >= 30) {
    return { priority: 'medium', reason: 'Due for scheduled check' };
  }
  
  // Default = low priority
  return { priority: 'low', reason: 'Routine follow-up' };
}

/**
 * Hook to create a prioritized reassessment queue
 */
export function useReassessmentQueue(
  clientGroups: ClientGroup[]
): UseReassessmentQueueResult {
  
  const queue = useMemo<ReassessmentItem[]>(() => {
    return clientGroups
      .map(group => {
        const latestAssessment = group.assessments[0] || null;
        const latestDate = group.latestDate;
        const days = daysSince(latestDate);
        const pillarScores = extractPillarScores(latestAssessment);
        const { needs, reasons } = determineReassessmentNeeds(pillarScores, days, group.retestSchedule);
        const { priority, reason } = determinePriority(pillarScores, days, needs, group.retestSchedule);
        
        // Build pillar gaps array
        const pillarGaps: ReassessmentItem['pillarGaps'] = [];
        
        if (pillarScores.bodyComp > 0 && pillarScores.bodyComp < FALLBACK_THRESHOLDS.gapThreshold) {
          pillarGaps.push({
            pillar: 'Body Composition',
            score: pillarScores.bodyComp,
            threshold: FALLBACK_THRESHOLDS.gapThreshold,
            daysSinceScan: days,
          });
        }
        
        if (pillarScores.cardio > 0 && pillarScores.cardio < FALLBACK_THRESHOLDS.gapThreshold) {
          pillarGaps.push({
            pillar: 'Cardio/Metabolic',
            score: pillarScores.cardio,
            threshold: FALLBACK_THRESHOLDS.gapThreshold,
            daysSinceScan: days,
          });
        }
        
        if (pillarScores.movement > 0 && pillarScores.movement < FALLBACK_THRESHOLDS.gapThreshold) {
          pillarGaps.push({
            pillar: 'Movement Quality',
            score: pillarScores.movement,
            threshold: FALLBACK_THRESHOLDS.gapThreshold,
            daysSinceScan: days,
          });
        }
        
        if (pillarScores.strength > 0 && pillarScores.strength < FALLBACK_THRESHOLDS.gapThreshold) {
          pillarGaps.push({
            pillar: 'Functional Strength',
            score: pillarScores.strength,
            threshold: FALLBACK_THRESHOLDS.gapThreshold,
            daysSinceScan: days,
          });
        }
        
        return {
          clientName: group.name,
          latestAssessment,
          latestDate,
          daysSinceAssessment: days,
          overallScore: group.latestScore,
          reassessmentNeeds: needs,
          reassessmentReasons: reasons,
          priority,
          priorityReason: reason,
          pillarGaps,
          hasCustomCadence: !!group.retestSchedule?.custom,
        };
      })
      // Filter to only those with needs
      .filter(item => item.reassessmentNeeds.length > 0)
      // Sort by priority (high first), then by days since assessment
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.daysSinceAssessment - a.daysSinceAssessment;
      });
  }, [clientGroups]);

  // Calculate summary
  const summary = useMemo<ReassessmentQueueSummary>(() => {
    const byType: Record<ReassessmentType, number> = {
      inbody: 0,
      posture: 0,
      fitness: 0,
      strength: 0,
      full: 0,
      'check-in': 0,
    };
    
    queue.forEach(item => {
      item.reassessmentNeeds.forEach(need => {
        byType[need]++;
      });
    });

    return {
      totalClients: clientGroups.length,
      clientsNeedingReassessment: queue.length,
      highPriority: queue.filter(q => q.priority === 'high').length,
      mediumPriority: queue.filter(q => q.priority === 'medium').length,
      lowPriority: queue.filter(q => q.priority === 'low').length,
      byType,
    };
  }, [queue, clientGroups.length]);

  // Filtered lists for quick access
  const highPriorityClients = useMemo(() => 
    queue.filter(q => q.priority === 'high'),
  [queue]);

  const dueForInBody = useMemo(() => 
    queue.filter(q => q.reassessmentNeeds.includes('inbody')),
  [queue]);

  const dueForPosture = useMemo(() => 
    queue.filter(q => q.reassessmentNeeds.includes('posture')),
  [queue]);

  const dueForCheckIn = useMemo(() => 
    queue.filter(q => q.reassessmentNeeds.includes('check-in')),
  [queue]);

  return {
    queue,
    summary,
    highPriorityClients,
    dueForInBody,
    dueForPosture,
    dueForCheckIn,
  };
}
