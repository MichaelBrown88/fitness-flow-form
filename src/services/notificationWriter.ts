/**
 * Notification Writer
 *
 * Writes notification documents to Firestore.
 *
 * Two modes:
 *   1. Token-scoped (client): publicReports/{shareToken}/notifications/{autoId}
 *   2. UID-scoped (coach):    notifications/{recipientUid}/items/{autoId}
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import type { NotificationType, NotificationPriority } from '@/types/notifications';
import { logger } from '@/lib/utils/logger';

interface WriteNotificationParams {
  /** Token-scoped path for client notifications (preferred for client-facing) */
  shareToken?: string;
  /** UID-scoped path for coach notifications (legacy, still used for coach-to-coach) */
  recipientUid?: string;
  type: NotificationType;
  title: string;
  body?: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  meta?: Record<string, unknown>;
}

/**
 * Write a notification to a user's notification inbox.
 * Uses shareToken path for clients, recipientUid path for coaches.
 * Fire-and-forget safe -- errors are caught and logged, never thrown.
 */
export async function writeNotification(params: WriteNotificationParams): Promise<void> {
  try {
    // Determine collection path based on params
    let collectionRef;
    if (params.shareToken) {
      // Token-scoped: publicReports/{shareToken}/notifications
      collectionRef = collection(
        getDb(),
        COLLECTIONS.PUBLIC_REPORTS,
        params.shareToken,
        COLLECTIONS.NOTIFICATIONS,
      );
    } else if (params.recipientUid) {
      // UID-scoped: notifications/{recipientUid}/items
      collectionRef = collection(getDb(), 'notifications', params.recipientUid, 'items');
    } else {
      logger.warn('[Notifications] writeNotification called without shareToken or recipientUid');
      return;
    }

    await addDoc(collectionRef, {
      type: params.type,
      title: params.title,
      body: params.body ?? '',
      priority: params.priority ?? 'medium',
      read: false,
      createdAt: serverTimestamp(),
      actionUrl: params.actionUrl ?? null,
      meta: params.meta ?? null,
      // Include identifiers for debugging
      ...(params.shareToken ? { shareToken: params.shareToken } : {}),
      ...(params.recipientUid ? { recipientUid: params.recipientUid } : {}),
    });
  } catch (error) {
    logger.warn('[Notifications] Failed to write notification (non-fatal):', error);
  }
}
