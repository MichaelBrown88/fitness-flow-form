/**
 * useReassessmentQueue Hook
 * 
 * Dynamic task list for the coach's Priority tab.
 * Every client appears, sorted by scheduling urgency.
 *
 * Traffic-light system (purely schedule-driven):
 *  - Overdue (red):   pillar past its due date
 *  - Due Soon (amber): pillar due within 7 days
 *  - Up to Date (green): all pillars on schedule
 *
 * Score gaps are informational only — they never affect the traffic light.
 * The cadence engine's score-adjusted intervals are ignored here;
 * only base clinical intervals and coach manual overrides are used.
 *
 * Pillars: Body Comp, Posture, Fitness, Strength, Lifestyle
 */

import { useMemo } from 'react';
import type { ClientGroup } from '@/hooks/dashboard/types';
import type { CoachAssessmentSummary } from '@/services/coachAssessments';
import type { PartialAssessmentCategory } from '@/types/client';
import { BASE_CADENCE_INTERVALS } from '@/types/client';

// ── Types ────────────────────────────────────────────────────────────

export type ReassessmentType =
  | 'bodycomp'
  | 'posture'
  | 'fitness'
  | 'strength'
  | 'lifestyle'
  | 'full';

/** Traffic-light schedule status */
export type ScheduleStatus = 'overdue' | 'due-soon' | 'up-to-date';

/** Per-pillar schedule info shown on the card */
export interface PillarSchedule {
  pillar: ReassessmentType;
  dueDate: Date;
  status: ScheduleStatus;
  /** Positive = days overdue, negative = days until due */
  daysFromDue: number;
}

/** A single client row in the task list */
export interface ReassessmentItem {
  /** Stable unique id (from Firestore summary doc) */
  id: string;
  clientName: string;
  latestAssessment: CoachAssessmentSummary | null;
  latestDate: Date | null;
  daysSinceAssessment: number;
  overallScore: number;
  /** Per-pillar schedule breakdown */
  pillarSchedules: PillarSchedule[];
  /** Overall client status = worst pillar status */
  status: ScheduleStatus;
  statusReason: string;
  /** The pillar the coach should act on first */
  mostUrgentPillar: ReassessmentType | null;
  /** Informational: pillar scores below threshold */
  pillarGaps: { pillar: string; score: number }[];
  hasCustomCadence: boolean;
  /** UID of the coach who owns this client (for team views) */
  coachUid?: string | null;
}

export interface ReassessmentQueueSummary {
  totalClients: number;
  overdue: number;
  dueSoon: number;
  upToDate: number;
}

export interface UseReassessmentQueueResult {
  /** All clients, sorted by urgency (overdue first → due soon → up to date) */
  queue: ReassessmentItem[];
  summary: ReassessmentQueueSummary;
}

/** Time-horizon grouping for the agenda view */
export type TimeHorizon = 'overdue' | 'this-week' | 'next-week' | '2-3-weeks' | '4-plus-weeks';

/** A single flat row in the schedule agenda (one client + one pillar) */
export interface AgendaItem {
  id: string;
  clientName: string;
  pillar: ReassessmentType;
  dueDate: Date;
  daysFromDue: number;
  horizon: TimeHorizon;
  dueLabel: string;
  coachUid?: string | null;
}

export interface AgendaGroup {
  horizon: TimeHorizon;
  label: string;
  items: AgendaItem[];
}

const HORIZON_ORDER: Record<TimeHorizon, number> = {
  'overdue': 0,
  'this-week': 1,
  'next-week': 2,
  '2-3-weeks': 3,
  '4-plus-weeks': 4,
};

const HORIZON_LABELS: Record<TimeHorizon, string> = {
  'overdue': 'Overdue',
  'this-week': 'This Week',
  'next-week': 'Next Week',
  '2-3-weeks': 'In 2-3 Weeks',
  '4-plus-weeks': '4+ Weeks',
};

function classifyHorizon(daysFromDue: number): TimeHorizon {
  if (daysFromDue > 0) return 'overdue';
  const daysUntil = Math.abs(daysFromDue);
  if (daysUntil <= 7) return 'this-week';
  if (daysUntil <= 14) return 'next-week';
  if (daysUntil <= 21) return '2-3-weeks';
  return '4-plus-weeks';
}

function formatAgendaDueLabel(daysFromDue: number, dueDate: Date): string {
  if (daysFromDue > 0) {
    const weeks = Math.ceil(daysFromDue / 7);
    return weeks === 1 ? 'Overdue 1 wk' : `Overdue ${weeks} wk`;
  }
  const daysUntil = Math.abs(daysFromDue);
  if (daysUntil <= 1) return 'Today';
  if (daysUntil <= 7) return 'Do next session';
  if (daysUntil <= 14) return dueDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const weeks = Math.ceil(daysUntil / 7);
  return `In ${weeks} wk`;
}

/**
 * Derive a flat agenda from the queue.
 * Each actionable pillar becomes its own row.
 */
export function deriveAgenda(queue: ReassessmentItem[]): AgendaGroup[] {
  const items: AgendaItem[] = [];

  for (const client of queue) {
    for (const ps of client.pillarSchedules) {
      if (ps.pillar === 'full') continue;
      items.push({
        id: `${client.clientName}::${ps.pillar}`,
        clientName: client.clientName,
        pillar: ps.pillar,
        dueDate: ps.dueDate,
        daysFromDue: ps.daysFromDue,
        horizon: classifyHorizon(ps.daysFromDue),
        dueLabel: formatAgendaDueLabel(ps.daysFromDue, ps.dueDate),
        coachUid: client.coachUid,
      });
    }
  }

  items.sort((a, b) => {
    const h = HORIZON_ORDER[a.horizon] - HORIZON_ORDER[b.horizon];
    if (h !== 0) return h;
    return b.daysFromDue - a.daysFromDue;
  });

  const grouped = new Map<TimeHorizon, AgendaItem[]>();
  for (const item of items) {
    const existing = grouped.get(item.horizon) ?? [];
    existing.push(item);
    grouped.set(item.horizon, existing);
  }

  const result: AgendaGroup[] = [];
  for (const horizon of ['overdue', 'this-week', 'next-week', '2-3-weeks', '4-plus-weeks'] as TimeHorizon[]) {
    const groupItems = grouped.get(horizon);
    if (groupItems && groupItems.length > 0) {
      result.push({ horizon, label: HORIZON_LABELS[horizon], items: groupItems });
    }
  }

  return result;
}

// ── Pillar types that map to actionable partial assessments ──────────

const ACTIONABLE_PILLARS: readonly ReassessmentType[] = [
  'bodycomp', 'posture', 'fitness', 'strength', 'lifestyle',
];

// ── Fallback intervals (days) – only used if BASE_CADENCE_INTERVALS missing ──

const FALLBACK_INTERVALS: Record<string, number> = {
  bodycomp: 30,
  posture: 45,
  fitness: 45,
  strength: 60,
  lifestyle: 45,
  full: 90,
};

/** Score below this shown as a gap (informational) */
const GAP_THRESHOLD = 60;

/** "Due soon" = within this many days */
const DUE_SOON_WINDOW = 7;

// ── Helpers ──────────────────────────────────────────────────────────

function daysSince(date: Date | null | undefined): number {
  if (!date) return 999;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function extractPillarScores(assessment: CoachAssessmentSummary | null) {
  const categories = assessment?.scoresSummary?.categories;
  if (!categories) {
    return { bodyComp: 0, cardio: 0, movement: 0, strength: 0, lifestyle: 0 };
  }
  return {
    bodyComp: categories.find((c) => c.id === 'bodyComp')?.score || 0,
    cardio: categories.find((c) => c.id === 'cardio')?.score || 0,
    movement: categories.find((c) => c.id === 'movementQuality')?.score || 0,
    strength: categories.find((c) => c.id === 'strength')?.score || 0,
    lifestyle: categories.find((c) => c.id === 'lifestyle')?.score || 0,
  };
}

/**
 * Org-level default cadence intervals (optional).
 * Injected by the dashboard so the interval chain is:
 * client custom > org defaults > clinical baselines.
 */
export interface OrgCadenceDefaults {
  intervals?: Record<string, number>;
  activePillars?: PartialAssessmentCategory[];
}

/**
 * Get the effective interval for a pillar.
 * Chain: client custom override > org default > clinical baseline.
 */
function getInterval(
  pillar: string,
  retestSchedule?: ClientGroup['retestSchedule'],
  orgDefaults?: OrgCadenceDefaults,
): number {
  const customInterval = retestSchedule?.custom?.[pillar as PartialAssessmentCategory]?.intervalDays;
  if (customInterval && customInterval > 0) return customInterval;
  const orgInterval = orgDefaults?.intervals?.[pillar];
  if (orgInterval && orgInterval > 0) return orgInterval;
  return BASE_CADENCE_INTERVALS[pillar as keyof typeof BASE_CADENCE_INTERVALS]
    ?? FALLBACK_INTERVALS[pillar]
    ?? FALLBACK_INTERVALS.full;
}

import { getPillarLabel } from '@/constants/pillars';

/** Friendly label for a pillar */
export function pillarLabel(type: ReassessmentType): string {
  if (type === 'full') return 'Full Assessment';
  return getPillarLabel(type);
}

// ── Core logic ───────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Compute the schedule for every pillar and the full assessment.
 * Returns per-pillar status (overdue / due-soon / up-to-date) and dates.
 *
 * Priority order for determining the due date:
 *   1. One-time absolute due date override (set by coach on Priority tab)
 *      — only used if the override is AFTER the last assessment date
 *        (automatically ignored once the assessment is completed)
 *   2. Cadence-based: lastAssessmentDate + intervalDays
 */
function computePillarSchedules(
  latestDate: Date | null,
  retestSchedule?: ClientGroup['retestSchedule'],
  dueDateOverrides?: Record<string, Date>,
  pillarDates?: Record<string, Date>,
  orgDefaults?: OrgCadenceDefaults,
  activePillars?: PartialAssessmentCategory[],
  trainingStartDate?: Date,
): PillarSchedule[] {
  // If the client has a training start date that's after their assessment,
  // use it as the scheduling anchor so they don't appear overdue before starting.
  const effectiveGlobalDate = latestDate
    ? (trainingStartDate && trainingStartDate > latestDate ? trainingStartDate : latestDate)
    : new Date(0);
  const now = Date.now();
  const schedules: PillarSchedule[] = [];

  const allPillars: ReassessmentType[] = [...ACTIONABLE_PILLARS, 'full'];

  for (const pillar of allPillars) {
    if (pillar !== 'full' && activePillars && !activePillars.includes(pillar as PartialAssessmentCategory)) {
      continue;
    }

    const baseDate = (pillar !== 'full' && pillarDates?.[pillar]) || effectiveGlobalDate;

    const override = dueDateOverrides?.[pillar];
    const useOverride = override && override.getTime() > baseDate.getTime();

    const dueDate = useOverride
      ? override
      : new Date(baseDate.getTime() + getInterval(pillar, retestSchedule, orgDefaults) * MS_PER_DAY);

    const daysFromDue = Math.floor((now - dueDate.getTime()) / MS_PER_DAY);

    let status: ScheduleStatus;
    if (daysFromDue > 0) {
      status = 'overdue';
    } else if (Math.abs(daysFromDue) <= DUE_SOON_WINDOW) {
      status = 'due-soon';
    } else {
      status = 'up-to-date';
    }

    schedules.push({ pillar, dueDate, status, daysFromDue });
  }

  return schedules;
}

/** Status severity for sorting: overdue > due-soon > up-to-date */
const STATUS_ORDER: Record<ScheduleStatus, number> = {
  'overdue': 0,
  'due-soon': 1,
  'up-to-date': 2,
};

/**
 * Derive the overall client status from their pillar schedules.
 * The worst pillar wins (most overdue determines client status).
 */
function deriveClientStatus(
  schedules: PillarSchedule[],
  daysSinceLastAssessment: number,
): { status: ScheduleStatus; reason: string; mostUrgentPillar: ReassessmentType | null } {
  // Never assessed
  if (daysSinceLastAssessment >= 999) {
    return { status: 'overdue', reason: 'No assessment on record', mostUrgentPillar: 'full' };
  }

  // Find the most overdue ACTIONABLE pillar (not 'full')
  let worstPillar: PillarSchedule | null = null;
  for (const s of schedules) {
    if (!ACTIONABLE_PILLARS.includes(s.pillar)) continue;
    if (!worstPillar || s.daysFromDue > worstPillar.daysFromDue) {
      worstPillar = s;
    }
  }

  // Also check full assessment
  const fullSchedule = schedules.find(s => s.pillar === 'full');

  // Full assessment overdue takes top priority
  if (fullSchedule && fullSchedule.status === 'overdue') {
    return {
      status: 'overdue',
      reason: `Full assessment overdue by ${fullSchedule.daysFromDue}d`,
      mostUrgentPillar: worstPillar && worstPillar.daysFromDue > 0
        ? worstPillar.pillar
        : 'full',
    };
  }

  if (worstPillar && worstPillar.status === 'overdue') {
    const label = pillarLabel(worstPillar.pillar);
    return {
      status: 'overdue',
      reason: `${label} overdue by ${worstPillar.daysFromDue}d`,
      mostUrgentPillar: worstPillar.pillar,
    };
  }

  if (worstPillar && worstPillar.status === 'due-soon') {
    const daysLeft = Math.abs(worstPillar.daysFromDue);
    const label = pillarLabel(worstPillar.pillar);
    return {
      status: 'due-soon',
      reason: `${label} due in ${daysLeft}d`,
      mostUrgentPillar: worstPillar.pillar,
    };
  }

  return {
    status: 'up-to-date',
    reason: 'All assessments on schedule',
    mostUrgentPillar: null,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useReassessmentQueue(
  clientGroups: ClientGroup[],
  orgDefaults?: OrgCadenceDefaults,
): UseReassessmentQueueResult {

  const queue = useMemo<ReassessmentItem[]>(() => {
    const effectiveOrgActivePillars = orgDefaults?.activePillars;

    return clientGroups
      .filter(group => group.clientStatus !== 'paused' && group.clientStatus !== 'archived')
      .map(group => {
        const latestAssessment = group.assessments[0] || null;
        const latestDate = group.lastAssessmentDate ?? group.latestDate;
        const days = daysSince(latestDate);
        const pillarScores = extractPillarScores(latestAssessment);
        const clientActivePillars = group.activePillars ?? effectiveOrgActivePillars;
        const pillarSchedules = computePillarSchedules(latestDate, group.retestSchedule, group.dueDateOverrides, group.pillarDates, orgDefaults, clientActivePillars, group.trainingStartDate);
        const { status, reason, mostUrgentPillar } = deriveClientStatus(pillarSchedules, days);

        // Informational gaps (score < 60%)
        const pillarGaps: { pillar: string; score: number }[] = [];
        const gapEntries: [string, number][] = [
          ['Body Composition', pillarScores.bodyComp],
          ['Cardio/Metabolic', pillarScores.cardio],
          ['Movement Quality', pillarScores.movement],
          ['Functional Strength', pillarScores.strength],
          ['Lifestyle', pillarScores.lifestyle],
        ];
        for (const [label, score] of gapEntries) {
          if (score > 0 && score < GAP_THRESHOLD) {
            pillarGaps.push({ pillar: label, score });
          }
        }

        return {
          id: group.id,
          clientName: group.name,
          latestAssessment,
          latestDate,
          daysSinceAssessment: days,
          overallScore: group.latestScore,
          pillarSchedules,
          status,
          statusReason: reason,
          mostUrgentPillar,
          pillarGaps,
          hasCustomCadence: !!group.retestSchedule?.custom,
          coachUid: group.coachUid,
        };
      })
      // Sort: overdue first (most overdue at top) → due soon → up to date
      .sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        // Within same status, sort by most overdue first
        return b.daysSinceAssessment - a.daysSinceAssessment;
      });
  }, [clientGroups, orgDefaults]);

  const summary = useMemo<ReassessmentQueueSummary>(() => ({
    totalClients: clientGroups.length,
    overdue: queue.filter(q => q.status === 'overdue').length,
    dueSoon: queue.filter(q => q.status === 'due-soon').length,
    upToDate: queue.filter(q => q.status === 'up-to-date').length,
  }), [queue, clientGroups.length]);

  return { queue, summary };
}
