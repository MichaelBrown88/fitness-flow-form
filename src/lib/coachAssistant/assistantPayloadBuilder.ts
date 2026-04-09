/**
 * Compact coach-workspace payloads for the assistant (token cost control).
 */

import { Timestamp } from 'firebase/firestore';
import type { ClientGroup } from '@/hooks/dashboard/types';
import type { CoachTask } from '@/lib/tasks/generateTasks';
import type { ReassessmentItem, ReassessmentQueueSummary } from '@/hooks/useReassessmentQueue';
import { getPillarLabel } from '@/constants/pillars';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

const MAX_CLIENT_ROWS = 200;
const MAX_TASK_ROWS = 40;
const MAX_WEAKNESS_AGGREGATES = 40;
const MAX_WEAKNESSES_PER_CATEGORY = 8;
const FULL_DETAIL_ASSESSMENTS = 6;

function daysBetween(earlier: Date, later: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findQueueItem(
  queue: ReassessmentItem[],
  clientId: string,
  clientName: string,
): ReassessmentItem | undefined {
  return queue.find(
    (q) =>
      q.id === clientId ||
      normalizeName(q.clientName) === normalizeName(clientName) ||
      normalizeName(q.clientName) === normalizeName(formatClientDisplayName(clientName)),
  );
}

function scheduleStatusLabel(item: ReassessmentItem | undefined): 'overdue' | 'due-soon' | 'on-track' {
  if (!item) return 'on-track';
  if (item.status === 'overdue') return 'overdue';
  if (item.status === 'due-soon') return 'due-soon';
  return 'on-track';
}

/**
 * One-line summary per client for the model (replaces raw category blobs in the main payload).
 */
export function summariseClientForAssistant(c: ClientGroup, queue: ReassessmentItem[]): string {
  const displayName = formatClientDisplayName(c.name);
  const qItem = findQueueItem(queue, c.id, c.name);
  const daysSince =
    c.latestDate !== null ? daysBetween(c.latestDate, new Date()) : null;
  const overall = c.latestScore;
  const latest = c.assessments[0];
  const cats = latest?.scoresSummary?.categories?.filter((x) => x.assessed) ?? [];
  let flagged: string | null = null;
  let lowest = 101;
  for (const cat of cats) {
    if (cat.score < lowest) lowest = cat.score;
    if (cat.score < 55 && cat.weaknesses?.length) {
      flagged = getPillarLabel(cat.id);
      break;
    }
  }
  if (!flagged && cats.length > 0 && lowest < 55) {
    const worst = cats.reduce((a, b) => (a.score <= b.score ? a : b));
    flagged = getPillarLabel(worst.id);
  }

  const nextDue = qItem?.pillarSchedules
    .filter((p) => p.status !== 'up-to-date')
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
  const nextDueDays =
    nextDue !== undefined ? Math.max(0, Math.ceil(-nextDue.daysFromDue)) : null;

  const status = scheduleStatusLabel(qItem);
  const acct = c.clientStatus ?? 'active';

  const parts: string[] = [
    `${displayName} — last assessed ${daysSince === null ? 'never' : `${daysSince} days ago`}, overall score ${overall}/100`,
  ];
  if (flagged) parts.push(`${flagged} flagged`);
  parts.push(
    nextDueDays === null ? 'next due: n/a' : `next due in ${nextDueDays} days`,
    `schedule: ${status}`,
    `account: ${acct}`,
  );
  return parts.join(', ');
}

export type AssistantPayloadDepth = 'lightweight' | 'standard';

export type AssistantCoachDataPayload = Record<string, unknown>;

export function buildAssistantCoachDataPayload(params: {
  clients: ClientGroup[];
  coachTasks: CoachTask[];
  queue: ReassessmentItem[];
  summary: ReassessmentQueueSummary;
  depth: AssistantPayloadDepth;
}): AssistantCoachDataPayload {
  const { clients, coachTasks, queue, summary, depth } = params;
  const sliceClients = clients.slice(0, MAX_CLIENT_ROWS);

  const clientIndex = sliceClients.map((c) => {
    const qItem = findQueueItem(queue, c.id, c.name);
    const nextDue = qItem?.pillarSchedules
      .filter((p) => p.status !== 'up-to-date')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
    return {
      id: c.id,
      name: formatClientDisplayName(c.name),
      accountStatus: c.clientStatus ?? 'active',
      nextAssessmentDueIso: nextDue ? nextDue.dueDate.toISOString() : null,
      daysSinceLastAssessment:
        c.latestDate !== null ? daysBetween(c.latestDate, new Date()) : null,
    };
  });

  const clientSummaries = sliceClients.map((c) => summariseClientForAssistant(c, queue));

  const overdueClients = queue.filter((q) => q.status === 'overdue');
  const dueSoonClients = queue.filter((q) => q.status === 'due-soon');

  const base: AssistantCoachDataPayload = {
    schemaVersion: 2,
    payloadKind: depth === 'lightweight' ? 'roster_light' : 'roster_standard',
    generatedAtIso: new Date().toISOString(),
    queueSummary: summary,
    clientIndex,
    clientSummaries,
    overdueClientNames: overdueClients.map((r) => r.clientName).slice(0, 50),
    dueSoonClientNames: dueSoonClients.map((r) => r.clientName).slice(0, 50),
    generatedTasks: coachTasks.slice(0, MAX_TASK_ROWS).map((t) => ({
      title: t.title,
      clientName: t.clientName,
      dueDateIso: t.dueDate ? t.dueDate.toISOString() : null,
    })),
    notes: {
      clientRowCap: MAX_CLIENT_ROWS,
      truncatedClientList: clients.length > MAX_CLIENT_ROWS,
    },
  };

  if (depth === 'lightweight') {
    return base;
  }

  const weaknessCounts = new Map<string, number>();
  for (const c of sliceClients) {
    const latest = c.assessments[0];
    const cats = latest?.scoresSummary?.categories ?? [];
    const seen = new Set<string>();
    for (const cat of cats) {
      for (const w of cat.weaknesses ?? []) {
        const key = w.trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        weaknessCounts.set(key, (weaknessCounts.get(key) ?? 0) + 1);
      }
    }
  }
  const weaknessAggregates = Array.from(weaknessCounts.entries())
    .map(([label, clientCount]) => ({ label, clientCount }))
    .sort((a, b) => b.clientCount - a.clientCount)
    .slice(0, MAX_WEAKNESS_AGGREGATES);

  const scheduleOverdue = overdueClients.map((row) => ({
    clientName: row.clientName,
    overallScore: row.overallScore,
    pillars: row.pillarSchedules.map((ps) => ({
      pillar: ps.pillar,
      status: ps.status,
      daysFromDue: ps.daysFromDue,
      dueDateIso: ps.dueDate.toISOString(),
    })),
  }));

  const scheduleDueSoon = dueSoonClients.map((row) => ({
    clientName: row.clientName,
    overallScore: row.overallScore,
    pillars: row.pillarSchedules.map((ps) => ({
      pillar: ps.pillar,
      daysFromDue: ps.daysFromDue,
      dueDateIso: ps.dueDate.toISOString(),
    })),
  }));

  const latestAssessmentByClient = sliceClients.map((c) => {
    const latest = c.assessments[0];
    const cats = (latest?.scoresSummary?.categories ?? []).filter((x) => x.assessed);
    return {
      clientId: c.id,
      name: formatClientDisplayName(c.name),
      overallScore: c.latestScore,
      previousScore: latest?.previousScore ?? null,
      trend: latest?.trend ?? null,
      lastUpdatedDaysAgo: c.latestDate !== null ? daysBetween(c.latestDate, new Date()) : null,
      pillars: cats.map((cat) => ({
        id: cat.id,
        label: getPillarLabel(cat.id),
        score: cat.score,
        weaknesses: (cat.weaknesses ?? []).slice(0, 8),
      })),
    };
  });

  return {
    ...base,
    weaknessAggregates,
    schedule: { overdue: scheduleOverdue, dueSoon: scheduleDueSoon },
    latestAssessmentByClient,
  };
}

/**
 * Org-admin context injected into the assistant system prompt when the logged-in
 * user is a non-coaching org admin (isAdmin && !isActiveCoach).
 * Derived entirely from data already loaded on the dashboard — no extra fetches.
 */
export function buildAdminOrgContext(params: {
  clients: ClientGroup[];
  queue: ReassessmentItem[];
  coachMap: Map<string, string>;
}): Record<string, unknown> {
  const { clients, queue, coachMap } = params;

  // Retention counts
  const statusCounts = { total: clients.length, active: 0, inactive: 0, archived: 0 };
  for (const c of clients) {
    const st = c.clientStatus ?? 'active';
    if (st === 'active') statusCounts.active++;
    else if (st === 'inactive') statusCounts.inactive++;
    else if (st === 'archived') statusCounts.archived++;
  }

  // Per-coach buckets
  const coachClientMap = new Map<string, ClientGroup[]>();
  for (const c of clients) {
    const uid = c.coachUid ?? 'unassigned';
    const bucket = coachClientMap.get(uid) ?? [];
    bucket.push(c);
    coachClientMap.set(uid, bucket);
  }

  const coachMetrics = Array.from(coachClientMap.entries())
    .map(([uid, coachClients]) => {
      const name = coachMap.get(uid) ?? 'Unassigned';
      const avgScore =
        coachClients.length > 0
          ? Math.round(coachClients.reduce((s, c) => s + c.latestScore, 0) / coachClients.length)
          : 0;
      const clientIds = new Set(coachClients.map((c) => c.id));
      const clientNames = new Set(coachClients.map((c) => c.name.toLowerCase()));
      const coachQueue = queue.filter(
        (q) => clientIds.has(q.id) || clientNames.has(q.clientName.toLowerCase()),
      );
      return {
        coachName: name,
        clientCount: coachClients.length,
        avgScore,
        overdueCount: coachQueue.filter((q) => q.status === 'overdue').length,
        dueSoonCount: coachQueue.filter((q) => q.status === 'due-soon').length,
      };
    })
    .sort((a, b) => b.clientCount - a.clientCount);

  const totalAvgScore =
    clients.length > 0
      ? Math.round(clients.reduce((s, c) => s + c.latestScore, 0) / clients.length)
      : 0;

  return {
    isOrgAdminView: true,
    retentionSummary: statusCounts,
    orgTotals: {
      avgOverallScore: totalAvgScore,
      overdue: queue.filter((q) => q.status === 'overdue').length,
      dueSoon: queue.filter((q) => q.status === 'due-soon').length,
      coachCount: coachClientMap.size,
    },
    coachMetrics,
  };
}

/** Full detail blob for one client after fetch_client_data (follow-up turn). */
export function serialiseClientDetailForAssistant(client: ClientGroup): Record<string, unknown> {
  const assessments = client.assessments.slice(0, FULL_DETAIL_ASSESSMENTS).map((a) => ({
    id: a.id,
    completedAtIso:
      a.createdAt instanceof Timestamp
        ? a.createdAt.toDate().toISOString()
        : a.updatedAt instanceof Timestamp
          ? a.updatedAt.toDate().toISOString()
          : null,
    overallScore: a.overallScore,
    previousScore: a.previousScore ?? null,
    trend: a.trend ?? null,
    categories: (a.scoresSummary?.categories ?? []).map((cat) => ({
      id: cat.id,
      label: getPillarLabel(cat.id),
      score: cat.score,
      assessed: cat.assessed,
      weaknesses: (cat.weaknesses ?? []).slice(0, MAX_WEAKNESSES_PER_CATEGORY),
    })),
    goals: a.goals ?? [],
  }));

  return {
    id: client.id,
    name: formatClientDisplayName(client.name),
    latestScore: client.latestScore,
    latestAssessmentDateIso: client.latestDate ? client.latestDate.toISOString() : null,
    assessmentCount: client.assessments.length,
    coachNotesSnippet: client.notes?.trim() ? client.notes.trim().slice(0, 400) : null,
    clientStatus: client.clientStatus ?? 'active',
    assessments,
  };
}
