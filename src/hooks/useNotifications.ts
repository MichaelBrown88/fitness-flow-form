/**
 * Notifications Hook
 * 
 * Real-time subscription to the current user's notifications.
 * Automatically subscribes/unsubscribes based on auth state.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  subscribeToNotifications,
  markAsRead as markAsReadService,
  markAllAsRead as markAllAsReadService,
} from '@/services/notifications';
import type { AppNotification } from '@/types/notifications';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToNotifications(
      user.uid,
      (items) => {
        setNotifications(items);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;
      await markAsReadService(user.uid, notificationId);
    },
    [user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await markAllAsReadService(user.uid, notifications);
  }, [user, notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
