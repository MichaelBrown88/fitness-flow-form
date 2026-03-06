import type { Timestamp } from 'firebase/firestore';
import type { ScoreSummary } from '@/lib/scoring/types';

export type RoadmapItemStatus = 'not_started' | 'in_progress' | 'achieved' | 'adjusted';

export type RoadmapCategory = 'bodyComp' | 'movementQuality' | 'strength' | 'cardio' | 'lifestyle' | 'general';

export type RoadmapPhase = 'foundation' | 'development' | 'performance';

export type BlockUrgency = 'critical' | 'prerequisite' | 'parallel' | 'optional';

export interface Trackable {
  id: string;
  label: string;
  baseline: number;
  target: number;
  current: number;
  unit?: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: RoadmapCategory;
  phase: RoadmapPhase;
  targetWeeks: number;
  status: RoadmapItemStatus;
  priority: number;
  source: 'auto' | 'coach';
  progressNote?: string;
  finding?: string;
  rationale?: string;
  action?: string;
  urgency?: BlockUrgency;
  icon?: string;
  contraindications?: string[];
  score?: number;
  trackables?: Trackable[];
  scoreDetailId?: string;
  scoreCategoryId?: string;
}

export interface RoadmapBlock {
  id: string;
  title: string;
  description: string;
  category: RoadmapCategory;
  phase: RoadmapPhase;
  targetWeeks: number;
  urgency: BlockUrgency;
  blocksGoal: boolean;
  finding: string;
  rationale: string;
  action: string;
  contraindications: string[];
  score: number;
  icon: string;
  trackables?: Trackable[];
  scoreDetailId?: string;
  scoreCategoryId?: string;
}

export interface PhaseTarget {
  category: RoadmapCategory;
  targetScore: number;
  baselineScore: number;
  label: string;
}

export interface RoadmapDoc {
  clientName: string;
  assessmentId: string;
  coachUid: string;
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  shareToken?: string;
  published: boolean;
  summary: string;
  items: RoadmapItem[];
  previousScores?: ScoreSummary;
  version?: number;
  phaseTargets?: Record<RoadmapPhase, PhaseTarget[]>;
  baselineScores?: Record<string, number>;
  activePhase?: RoadmapPhase;
  clientGoals?: string[];
}

export interface ProgressSuggestion {
  itemId: string;
  itemTitle: string;
  currentStatus: RoadmapItemStatus;
  suggestedStatus: RoadmapItemStatus;
  reason: string;
  scoreDelta: number;
}

export const PHASE_NARRATIVES: Record<RoadmapPhase, { title: string; subtitle: string }> = {
  foundation: {
    title: 'Foundation',
    subtitle: 'Laying the groundwork — addressing the fundamentals that everything else builds on.',
  },
  development: {
    title: 'Development',
    subtitle: 'Building momentum — progressing the core areas that drive lasting change.',
  },
  performance: {
    title: 'Performance',
    subtitle: 'Reaching your potential — fine-tuning and pushing towards your goals.',
  },
};

export const URGENCY_META: Record<BlockUrgency, { label: string; color: string; dot: string; border: string }> = {
  critical: { label: 'Critical', color: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200 bg-red-50/30' },
  prerequisite: { label: 'Prerequisite', color: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200 bg-amber-50/30' },
  parallel: { label: 'Parallel', color: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200 bg-blue-50/30' },
  optional: { label: 'Optional', color: 'text-slate-500', dot: 'bg-slate-400', border: 'border-slate-200 bg-slate-50/30' },
};

export const CATEGORY_ICONS: Record<RoadmapCategory, string> = {
  bodyComp: 'Scale',
  movementQuality: 'Move',
  strength: 'Dumbbell',
  cardio: 'Activity',
  lifestyle: 'Heart',
  general: 'Target',
};
