import type { Timestamp } from 'firebase-admin/firestore';

export type AssessmentDoc = {
  clientName?: string;
  clientNameLower?: string;
  coachUid: string;
  coachEmail?: string | null;
  goals?: string[];
  overallScore?: number;
  formData?: Record<string, unknown>;
  organizationId?: string;
};

// Legacy type for backwards compatibility with existing data
export type ReportArtifacts = {
  clientPdfPath?: string;
  coachPdfPath?: string;
  updatedAt?: Timestamp;
};

export type PublicReportDoc = {
  coachUid: string;
  assessmentId: string;
  /** Same as Firestore document id when using token-based public reports. */
  shareToken?: string;
  clientName: string;
  clientNameLower: string;
  visibility: 'public' | 'private';
  shareUrl: string;
  artifacts?: ReportArtifacts;
  goals: string[];
  overallScore: number;
  updatedAt?: Timestamp;
  organizationId?: string;
};
