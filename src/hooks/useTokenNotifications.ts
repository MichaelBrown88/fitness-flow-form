/**
 * Token-scoped Notifications Hook
 *
 * Reads notifications from publicReports/{shareToken}/notifications.
 * Used for client-facing views via the share link.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToTokenNotifications,
  markTokenNotificationAsRead,
  markAllTokenNotificationsAsRead,
} from '@/services/notifications';
import type { AppNotification } from '@/types/notifications';

export function useTokenNotifications(shareToken: string | null | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareToken) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToTokenNotifications(
      shareToken,
      (items) => {
        setNotifications(items);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => unsubscribe();
  }, [shareToken]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!shareToken) return;
      await markTokenNotificationAsRead(shareToken, notificationId);
    },
    [shareToken],
  );

  const markAllAsRead = useCallback(async () => {
    if (!shareToken) return;
    await markAllTokenNotificationsAsRead(shareToken, notifications);
  }, [shareToken, notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
