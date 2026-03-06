/**
 * Notification Types
 * 
 * Data model for the in-app notification system.
 * Notifications are stored in Firestore under:
 *   notifications/{recipientUid}/items/{notificationId}
 * 
 * Supports both coach and client recipients.
 */

import type { Timestamp } from 'firebase/firestore';

/** Categories of notifications */
export type NotificationType =
  | 'assessment_complete'    // Client: your assessment is ready
  | 'roadmap_ready'          // Client: your personalised plan is ready
  | 'reassessment_due'       // Client: time for a retest
  | 'lifestyle_reminder'     // Client: complete your lifestyle check-in
  | 'new_client'             // Coach: a new client was added
  | 'client_submission'      // Coach: a client submitted body comp / posture
  | 'pause_request'          // Coach: a client requested a pause
  | 'pause_approved'         // Client: your pause request was approved
  | 'pause_denied'           // Client: your pause request was denied
  | 'account_paused'         // Client: your account has been paused by coach
  | 'account_unpaused'       // Client: your account has been unpaused
  | 'schedule_review'        // Coach: review a new client's follow-up schedule
  | 'system';                // System: general announcements

/** Priority affects visual treatment */
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface AppNotification {
  id: string;
  /** The recipient's user ID */
  recipientUid: string;
  /** Notification type for icon/routing */
  type: NotificationType;
  /** Display title */
  title: string;
  /** Optional body text */
  body?: string;
  /** Priority (affects visual treatment) */
  priority: NotificationPriority;
  /** Whether the user has read this notification */
  read: boolean;
  /** When the notification was created */
  createdAt: Timestamp;
  /** Optional deep link path (e.g. /portal, /client/JohnDoe) */
  actionUrl?: string;
  /** Optional metadata for custom rendering */
  meta?: Record<string, unknown>;
}

/**
 * Create a notification object (for use in services/Cloud Functions)
 */
export function createNotification(
  recipientUid: string,
  type: NotificationType,
  title: string,
  opts?: Partial<Pick<AppNotification, 'body' | 'priority' | 'actionUrl' | 'meta'>>
): Omit<AppNotification, 'id' | 'createdAt'> {
  return {
    recipientUid,
    type,
    title,
    body: opts?.body,
    priority: opts?.priority ?? 'medium',
    read: false,
    actionUrl: opts?.actionUrl,
    meta: opts?.meta,
  };
}
