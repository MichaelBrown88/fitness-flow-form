import { getPillarLabel } from '@/constants/pillars';
import { taskReassessmentDescription, taskReassessmentTitle } from '@/constants/dashboardTasksCopy';

export type TaskType =
  | 'overdue_reassessment'
  | 'upcoming_reassessment'
  | 'draft_assessment'
  | 'roadmap_review'
  | 'roadmap_needed'
  | 'profile_incomplete';

export type TaskUrgency = 'overdue' | 'this_week' | 'soon' | 'later';

export interface CoachTask {
  id: string;
  type: TaskType;
  urgency: TaskUrgency;
  clientName: string;
  title: string;
  description: string;
  pillar?: string;
  actionLabel: string;
  actionRoute: string;
  dueDate?: Date;
}

export interface QueueEntry {
  clientName: string;
  pillar: string;
  dueDate: Date;
  status: string;
  coachUid?: string;
}

export interface DraftInfo {
  assessmentId: string;
  clientName: string;
  lastModified: Date;
}

export interface RoadmapReviewInfo {
  clientName: string;
  roadmapId: string;
  lastUpdated: Date;
  itemsPastDeadline: number;
}

export interface RoadmapNeededInfo {
  clientName: string;
  assessmentDate: Date;
}

export interface ProfileGapInfo {
  clientName: string;
  missingFields: string[];
}

const URGENCY_ORDER: Record<TaskUrgency, number> = {
  overdue: 0,
  this_week: 1,
  soon: 2,
  later: 3,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function urgencyFromDate(date: Date): TaskUrgency {
  const diff = date.getTime() - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 7 * MS_PER_DAY) return 'this_week';
  if (diff < 21 * MS_PER_DAY) return 'soon';
  return 'later';
}

export function generateTasks(params: {
  reassessmentQueue: QueueEntry[];
  draftAssessments: DraftInfo[];
  roadmapsDueForReview: RoadmapReviewInfo[];
  roadmapsNeeded: RoadmapNeededInfo[];
  incompleteProfiles: ProfileGapInfo[];
}): CoachTask[] {
  const tasks: CoachTask[] = [];

  for (const entry of params.reassessmentQueue) {
    const isOverdue = entry.status === 'overdue';
    const urgency = isOverdue ? 'overdue' as const : urgencyFromDate(entry.dueDate);
    const pillarLabel = getPillarLabel(entry.pillar);

    tasks.push({
      id: `reassess-${entry.clientName}-${entry.pillar}`,
      type: isOverdue ? 'overdue_reassessment' : 'upcoming_reassessment',
      urgency,
      clientName: entry.clientName,
      pillar: entry.pillar,
      title: taskReassessmentTitle(pillarLabel, isOverdue),
      description: taskReassessmentDescription(entry.clientName, pillarLabel, isOverdue),
      actionLabel: 'Start Assessment',
      actionRoute: `/assessment?client=${encodeURIComponent(entry.clientName)}&pillar=${encodeURIComponent(entry.pillar)}`,
      dueDate: entry.dueDate,
    });
  }

  for (const draft of params.draftAssessments) {
    const daysSinceEdit = (Date.now() - draft.lastModified.getTime()) / MS_PER_DAY;
    tasks.push({
      id: `draft-${draft.assessmentId}`,
      type: 'draft_assessment',
      urgency: daysSinceEdit > 7 ? 'this_week' : 'soon',
      clientName: draft.clientName,
      title: 'Unfinished draft assessment',
      description: daysSinceEdit > 7
        ? `Draft for ${draft.clientName} is stale (${Math.floor(daysSinceEdit)}d old).`
        : `Draft for ${draft.clientName} is waiting to be completed.`,
      actionLabel: 'Continue',
      actionRoute: `/assessment?id=${draft.assessmentId}`,
      dueDate: draft.lastModified,
    });
  }

  for (const rm of params.roadmapsDueForReview) {
    if (rm.itemsPastDeadline <= 0) continue;
    tasks.push({
      id: `roadmap-${rm.roadmapId}`,
      type: 'roadmap_review',
      urgency: 'soon',
      clientName: rm.clientName,
      title: 'ARC™ items past deadline',
      description: `${rm.itemsPastDeadline} item(s) in ${rm.clientName}'s ARC™ need attention.`,
      actionLabel: 'Review ARC™',
      actionRoute: `/coach/clients/${encodeURIComponent(rm.clientName)}/roadmap`,
    });
  }

  for (const needed of params.roadmapsNeeded) {
    tasks.push({
      id: `roadmap-needed-${needed.clientName}`,
      type: 'roadmap_needed',
      urgency: 'this_week',
      clientName: needed.clientName,
      title: 'Create client ARC™',
      description: `${needed.clientName} completed an assessment and needs a personalised ARC™.`,
      actionLabel: 'Create ARC™',
      actionRoute: `/coach/clients/${encodeURIComponent(needed.clientName)}/roadmap`,
      dueDate: needed.assessmentDate,
    });
  }

  for (const profile of params.incompleteProfiles) {
    if (profile.missingFields.length <= 2) continue;
    tasks.push({
      id: `profile-${profile.clientName}`,
      type: 'profile_incomplete',
      urgency: 'later',
      clientName: profile.clientName,
      title: 'Incomplete client profile',
      description: `${profile.clientName} is missing ${profile.missingFields.length} fields.`,
      actionLabel: 'Update Profile',
      actionRoute: `/client/${encodeURIComponent(profile.clientName)}`,
    });
  }

  return tasks.sort((a, b) => {
    const urgencyDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    const aTime = a.dueDate?.getTime() ?? Infinity;
    const bTime = b.dueDate?.getTime() ?? Infinity;
    return aTime - bTime;
  });
}
