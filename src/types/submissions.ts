/**
 * Client Submission Types
 * 
 * Data model for client self-service captures.
 * Stored in Firestore: clientSubmissions/{clientUid}/items/{submissionId}
 * 
 * These are reviewed by coaches before being applied to assessments.
 */

import type { Timestamp } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';

export type SubmissionType = 'body_comp_scan' | 'posture_images' | 'lifestyle_checkin';
export type SubmissionStatus = 'pending' | 'reviewed' | 'applied' | 'rejected';

export interface ClientSubmission {
  id: string;
  /** The client's user ID */
  clientUid: string;
  /** Organization ID for multi-tenant scoping */
  organizationId: string;
  /** Type of submission */
  type: SubmissionType;
  /** Review status */
  status: SubmissionStatus;
  /** When the client submitted */
  createdAt: Timestamp;
  /** When a coach reviewed (if applicable) */
  reviewedAt?: Timestamp;
  /** Coach who reviewed */
  reviewedBy?: string;
  /** Coach notes on review */
  reviewNotes?: string;
}

/** Body composition scan submission */
export interface BodyCompSubmission extends ClientSubmission {
  type: 'body_comp_scan';
  /** The scanned image (base64 or Storage URL) */
  imageUrl: string;
  /** OCR-extracted fields (client-verified) */
  extractedData: Partial<FormData>;
  /** OCR confidence score */
  ocrConfidence: number;
}

/** Posture image submission */
export interface PostureSubmission extends ClientSubmission {
  type: 'posture_images';
  /** Posture images by view */
  images: {
    front?: string;
    right?: string;
    back?: string;
    left?: string;
  };
  /** Number of views captured */
  viewCount: number;
}

/** Lifestyle check-in submission */
export interface LifestyleSubmission extends ClientSubmission {
  type: 'lifestyle_checkin';
  /** Lifestyle form data */
  responses: Partial<FormData>;
}

export type AnySubmission = BodyCompSubmission | PostureSubmission | LifestyleSubmission;
