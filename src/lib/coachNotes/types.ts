/**
 * CoachNotes — coach-facing diagnostic + prescriptive content per
 * client. Lives separately from the ARC™ (which is the journey).
 *
 * Generated automatically from assessment data + intervention library;
 * coaches can edit any field, free-form notes survive regeneration.
 */

import type { Timestamp } from 'firebase/firestore';
import type { FindingId, FindingSeverity, Intervention } from './interventionLibrary';
import type { Confidence } from '@/lib/physiology/rates';

export type PillarId = 'bodyComp' | 'strength' | 'cardio' | 'movementQuality' | 'lifestyle';

export type FindingStatus = 'active' | 'monitoring' | 'resolved';

export interface CoachFinding {
  /** Unique within the doc — combines findingId + a stable suffix. */
  id: string;
  /** Pillar bucket (drives UI grouping). */
  pillar: PillarId;
  /** Library lookup key — null when finding is coach-added freeform. */
  libraryFindingId: FindingId | null;
  /** Severity at the time the finding was generated. */
  severity: FindingSeverity;
  /** Coach-facing finding name. */
  finding: string;
  /** Plain-English diagnosis with the client's specific measurements. */
  diagnosis: string;
  /** Optional measurements supporting the finding. */
  measurements?: { label: string; value: string }[];
  /** Prescribed exercises / behaviours. */
  prescription: Intervention[];
  /** Minimum dose for the prescription to actually work. */
  minimumDose: string;
  /** Expected outcome with timeline (rate × duration). */
  expectedOutcome: string;
  /** Reassessment cadence in weeks. */
  reassessmentCadence: number[];
  /** Contraindications / red flags. */
  contraindications: string[];
  /** Confidence in the prescription + outcome. */
  confidence: Confidence;
  /** Citations / sources. */
  references?: string[];
  /** Auto-generated or coach-added. */
  source: 'auto' | 'coach';
  /** Status — coach can transition active → monitoring → resolved. */
  status: FindingStatus;
  /** When the finding was first surfaced. */
  createdAt: Timestamp;
  /** Last time auto-generation touched this finding. */
  lastGeneratedAt: Timestamp;
  /** When the coach marked it resolved (if status === 'resolved'). */
  resolvedAt?: Timestamp;
  /** Free-form coach addendum — never overwritten by regeneration. */
  coachNote?: string;
  /** When true, coach has acknowledged the finding (read-receipt-ish). */
  acknowledged?: boolean;
}

export interface PillarNotes {
  pillar: PillarId;
  /** Last assessment that fed THIS pillar's findings. */
  lastAssessedAt: Timestamp;
  /** Assessment id whose data drove this pillar's findings. */
  sourceAssessmentId?: string;
  findings: CoachFinding[];
}

export interface CoachNotesDoc {
  /** Client slug — same identifier used elsewhere in the app. */
  clientSlug: string;
  organizationId: string;
  generatedAt: Timestamp;
  updatedAt: Timestamp;
  /** Per-pillar findings + last-assessed timestamps. */
  pillars: Partial<Record<PillarId, PillarNotes>>;
  /** Coach-written narrative, persists across regenerations. */
  coachOverview?: string;
  /** Schema version for forward-compat. */
  schemaVersion: number;
}

export const COACH_NOTES_SCHEMA_VERSION = 1;
