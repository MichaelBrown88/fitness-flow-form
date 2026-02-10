import type { FormData } from '@/contexts/FormContext';
import { PHASE_TIMELINE, PHASE_TITLES, rulesVersion } from './assessmentRules';
import {
  evaluateNegativeOutcomes,
  type NegativeOutcomeFinding,
  type PriorityBand,
  type StrengthHighlight,
} from './negativeOutcomes';
import type { PhaseId } from './phaseConfig';

export interface CoachGuideItem {
  id: string;
  phase: PhaseId;
  phaseTitle: string;
  priority: PriorityBand;
  finding: string;
  action: string;
  testName: string;
}

export interface ClientRoadmapItem {
  id: string;
  phase: PhaseId;
  phaseTitle: string;
  timeframe: string;
  focus: string;
}

export interface StrengthItem {
  id: string;
  phase: PhaseId;
  phaseTitle: string;
  description: string;
}

export interface AssessmentResult {
  coachGuide: CoachGuideItem[];
  clientRoadmap: ClientRoadmapItem[];
  strengths: StrengthItem[];
  coachSummary: string;
  clientSummary: string;
  timelineNote: string;
  rulesVersion: string;
  metadata: {
    sessionsPerWeek: string;
    clientGoals: string[];
    parqStatus: string;
  };
}

const PRIORITY_WEIGHT: Record<PriorityBand, number> = {
  P1: 3,
  P2: 2,
  P3: 1,
};

const priorityComparator = (a: NegativeOutcomeFinding, b: NegativeOutcomeFinding) => {
  if (PRIORITY_WEIGHT[a.priority] !== PRIORITY_WEIGHT[b.priority]) {
    return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  }
  if (a.phase !== b.phase) {
    return a.phase.localeCompare(b.phase);
  }
  return a.id.localeCompare(b.id);
};

const summariseCoachGuide = (items: CoachGuideItem[]): string => {
  if (items.length === 0) {
    return 'No high-priority risks flagged. Maintain current training plan while building progressive overload.';
  }
  const grouped = items.reduce<Record<PriorityBand, CoachGuideItem[]>>(
    (acc, item) => {
      acc[item.priority] = acc[item.priority] || [];
      acc[item.priority].push(item);
      return acc;
    },
    { P1: [], P2: [], P3: [] }
  );

  const segments: string[] = [];
  if (grouped.P1?.length) {
    segments.push(
      `Immediate focus on Phase 1 risk items: ${grouped.P1
        .map((i) => `${i.testName} (${i.finding.toLowerCase()})`)
        .join('; ')}.`
    );
  }
  if (grouped.P2?.length) {
    segments.push(
      `Address movement foundations next: ${grouped.P2
        .map((i) => `${i.testName} (${i.finding.toLowerCase()})`)
        .join('; ')}.`
    );
  }
  if (grouped.P3?.length) {
    segments.push(
      `Performance development: ${grouped.P3
        .map((i) => `${i.testName} (${i.finding.toLowerCase()})`)
        .join('; ')}.`
    );
  }
  return segments.join(' ');
};

const summariseClient = (strengths: StrengthItem[], roadmap: ClientRoadmapItem[]): string => {
  const topStrengths = strengths.slice(0, 3).map((s) => s.description);
  const adjustments = roadmap.slice(0, 3).map((r) => r.focus);

  const lines: string[] = [];
  if (topStrengths.length) {
    lines.push(`Strength highlights: ${topStrengths.join(' • ')}.`);
  } else {
    lines.push('We will build a solid foundation together—more strengths will appear as you progress.');
  }
  if (adjustments.length) {
    lines.push(`Immediate focus: ${adjustments.join(' • ')}.`);
  }
  return lines.join(' ');
};

const buildTimelineNote = (findings: NegativeOutcomeFinding[], parqStatus: string): string => {
  if (parqStatus === 'yes') {
    return 'Pause Phase 4–5 testing until medical clearance confirms PAR-Q+ risks are resolved.';
  }
  const priorities = new Set(findings.map((f) => f.priority));
  if (priorities.has('P1')) {
    return 'Dedicate the first 4–6 weeks to Phase 1 risk mitigation before adding higher intensity work.';
  }
  if (priorities.has('P2')) {
    return 'Spend the next 4–6 weeks reinforcing Phase 2 movement quality prior to advanced loading.';
  }
  if (priorities.has('P3')) {
    return 'With foundations in place, progress through Phases 3–5 over the coming training blocks.';
  }
  return 'All phases are clear—maintain balanced training and reassess quarterly.';
};

const dedupeFocus = (items: NegativeOutcomeFinding[]): ClientRoadmapItem[] => {
  const seen = new Set<string>();
  const roadmap: ClientRoadmapItem[] = [];
  for (const item of items) {
    if (seen.has(item.clientFocus)) continue;
    seen.add(item.clientFocus);
    roadmap.push({
      id: `${item.id}-roadmap`,
      phase: item.phase,
      phaseTitle: PHASE_TITLES[item.phase],
      timeframe: PHASE_TIMELINE[item.phase],
      focus: item.clientFocus,
    });
  }
  return roadmap;
};

const selectStrengths = (strengths: StrengthHighlight[]): StrengthItem[] => {
  const top = strengths.slice(0, 5);
  return top.map((s) => ({
    id: s.id,
    phase: s.phase,
    phaseTitle: PHASE_TITLES[s.phase],
    description: s.description,
  }));
};

export function generateAssessmentResults(form: FormData): AssessmentResult {
  const { findings, strengths } = evaluateNegativeOutcomes(form);
  const sortedFindings = findings.sort(priorityComparator);

  const coachGuide: CoachGuideItem[] = sortedFindings.map((item) => ({
    id: item.id,
    phase: item.phase,
    phaseTitle: PHASE_TITLES[item.phase],
    priority: item.priority,
    finding: item.negativeFinding,
    action: item.coachAction,
    testName: item.testName,
  }));

  const clientRoadmap = dedupeFocus(sortedFindings);
  const strengthHighlights = selectStrengths(strengths);

  const coachSummary = summariseCoachGuide(coachGuide);
  const clientSummary = summariseClient(strengthHighlights, clientRoadmap);
  const formRecord = form as unknown as Record<string, string>;
  const timelineNote = buildTimelineNote(sortedFindings, formRecord.parqPositive ?? '');

  return {
    coachGuide,
    clientRoadmap,
    strengths: strengthHighlights,
    coachSummary,
    clientSummary,
    timelineNote,
    rulesVersion,
    metadata: {
      sessionsPerWeek: formRecord.sessionsPerWeek ?? '',
      clientGoals: form.clientGoals ?? [],
      parqStatus: formRecord.parqPositive ?? '',
    },
  };
}