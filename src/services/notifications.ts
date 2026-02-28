/**
 * Notification Service
 * 
 * Reads and manages notifications from Firestore.
 * 
 * Two paths:
 *   1. Token-scoped (client): publicReports/{shareToken}/notifications
 *   2. UID-scoped (coach):    notifications/{recipientUid}/items
 */

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import type { AppNotification } from '@/types/notifications';
import { logger } from '@/lib/utils/logger';

const NOTIFICATION_LIMIT = 50;

/**
 * Subscribe to real-time notifications for a coach (UID-scoped)
 */
export function subscribeToNotifications(
  recipientUid: string,
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getDb();
  const itemsRef = collection(db, 'notifications', recipientUid, 'items');
  const q = query(
    itemsRef,
    orderBy('createdAt', 'desc'),
    limit(NOTIFICATION_LIMIT)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications: AppNotification[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AppNotification[];
      onUpdate(notifications);
    },
    (error) => {
      if (error.message?.includes('Missing or insufficient permissions')) {
        logger.debug('[Notifications] Collection not yet accessible — notifications will appear once created');
        onUpdate([]);
      } else {
        logger.error('[Notifications] Subscription error:', error);
      }
      onError?.(error);
    }
  );
}

/**
 * Subscribe to real-time notifications for a client (token-scoped)
 * Path: publicReports/{shareToken}/notifications
 */
export function subscribeToTokenNotifications(
  shareToken: string,
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getDb();
  const itemsRef = collection(
    db,
    COLLECTIONS.PUBLIC_REPORTS,
    shareToken,
    COLLECTIONS.NOTIFICATIONS,
  );
  const q = query(
    itemsRef,
    orderBy('createdAt', 'desc'),
    limit(NOTIFICATION_LIMIT)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications: AppNotification[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AppNotification[];
      onUpdate(notifications);
    },
    (error) => {
      if (error.message?.includes('Missing or insufficient permissions')) {
        logger.debug('[TokenNotifications] Collection not yet accessible');
        onUpdate([]);
      } else {
        logger.error('[TokenNotifications] Subscription error:', error);
      }
      onError?.(error);
    }
  );
}

/**
 * Mark a single notification as read (UID-scoped path)
 */
export async function markAsRead(recipientUid: string, notificationId: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'notifications', recipientUid, 'items', notificationId);
  await updateDoc(ref, { read: true });
}

/**
 * Mark a single token-scoped notification as read
 */
export async function markTokenNotificationAsRead(shareToken: string, notificationId: string): Promise<void> {
  const db = getDb();
  const ref = doc(
    db,
    COLLECTIONS.PUBLIC_REPORTS,
    shareToken,
    COLLECTIONS.NOTIFICATIONS,
    notificationId,
  );
  await updateDoc(ref, { read: true });
}

/**
 * Mark all unread notifications as read (UID-scoped)
 */
export async function markAllAsRead(
  recipientUid: string,
  notifications: AppNotification[]
): Promise<void> {
  const db = getDb();
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;

  const batch = writeBatch(db);
  for (const n of unread) {
    const ref = doc(db, 'notifications', recipientUid, 'items', n.id);
    batch.update(ref, { read: true });
  }
  await batch.commit();
  logger.debug(`[Notifications] Marked ${unread.length} as read`);
}

/**
 * Mark all token-scoped unread notifications as read
 */
export async function markAllTokenNotificationsAsRead(
  shareToken: string,
  notifications: AppNotification[]
): Promise<void> {
  const db = getDb();
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;

  const batch = writeBatch(db);
  for (const n of unread) {
    const ref = doc(
      db,
      COLLECTIONS.PUBLIC_REPORTS,
      shareToken,
      COLLECTIONS.NOTIFICATIONS,
      n.id,
    );
    batch.update(ref, { read: true });
  }
  await batch.commit();
  logger.debug(`[TokenNotifications] Marked ${unread.length} as read`);
}
