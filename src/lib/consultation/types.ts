import type { Timestamp } from 'firebase/firestore';
import type { ConsultationQuestionId } from '@/constants/consultation';

export type ConsultationAnswers = Partial<Record<ConsultationQuestionId, string>>;

export interface ConsultationDoc {
  id: string;
  organizationId: string;
  clientSlug: string;
  coachUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  prepNotes: string;
  answers: ConsultationAnswers;
  clientGoals: string[];
  trainingFrequency?: string;
  goalDeadline?: string;
  assessmentId?: string;
}

export type ConsultationSaveInput = {
  organizationId: string;
  clientSlug: string;
  coachUid: string;
  prepNotes?: string;
  answers?: ConsultationAnswers;
  clientGoals?: string[];
  trainingFrequency?: string;
  goalDeadline?: string;
  assessmentId?: string;
  consultationId?: string;
};
