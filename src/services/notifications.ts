/**
 * Notification Service
 * 
 * Reads and manages notifications from Firestore.
 * Collection structure: notifications/{recipientUid}/items/{notificationId}
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import type { AppNotification } from '@/types/notifications';
import { logger } from '@/lib/utils/logger';

const NOTIFICATION_LIMIT = 50;

/**
 * Subscribe to real-time notifications for a user
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
      // Gracefully handle missing permissions (collection may not exist yet)
      if (error.message?.includes('Missing or insufficient permissions')) {
        logger.debug('[Notifications] Collection not yet accessible — notifications will appear once created');
        onUpdate([]); // Return empty array instead of erroring
      } else {
        logger.error('[Notifications] Subscription error:', error);
      }
      onError?.(error);
    }
  );
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(recipientUid: string, notificationId: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'notifications', recipientUid, 'items', notificationId);
  await updateDoc(ref, { read: true });
}

/**
 * Mark all unread notifications as read
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
