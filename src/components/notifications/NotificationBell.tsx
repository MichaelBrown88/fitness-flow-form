/**
 * Notification Bell
 * 
 * Displays an icon with unread count badge.
 * Opens a dropdown with recent notifications.
 * 
 * Supports two modes:
 *   - Coach (default): uses useNotifications (UID-scoped)
 *   - Client (shareToken): uses useTokenNotifications (token-scoped)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { useTokenNotifications } from '@/hooks/useTokenNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Bell,
  CheckCircle2,
  Activity,
  Calendar,
  ClipboardList,
  UserPlus,
  FileText,
  Info,
} from 'lucide-react';
import type { NotificationType, AppNotification } from '@/types/notifications';

const ICON_MAP: Partial<Record<NotificationType, React.ElementType>> = {
  assessment_complete: CheckCircle2,
  reassessment_due: Calendar,
  lifestyle_reminder: ClipboardList,
  new_client: UserPlus,
  client_submission: FileText,
  schedule_review: Calendar,
  system: Info,
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (id: string, actionUrl?: string) => void;
}) {
  const Icon = ICON_MAP[notification.type] || Activity;
  const isUnread = !notification.read;

  return (
    <button
      onClick={() => onRead(notification.id, notification.actionUrl)}
      className={`w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors min-h-[44px] ${
        isUnread ? 'bg-primary/5 dark:bg-primary/10' : ''
      }`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUnread
            ? 'bg-primary/12 text-on-brand-tint dark:bg-primary/20 dark:text-on-brand-tint'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-tight ${
            isUnread ? 'font-semibold text-foreground' : 'text-foreground-secondary'
          }`}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}
        {notification.createdAt && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {notification.createdAt.toDate?.().toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
      {isUnread && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
      )}
    </button>
  );
}

interface NotificationBellProps {
  /** When provided, uses token-scoped notifications (client mode) */
  shareToken?: string;
}

export function NotificationBell({ shareToken }: NotificationBellProps) {
  // Use token-scoped hook for clients, UID-scoped for coaches
  const tokenHook = useTokenNotifications(shareToken || null);
  const uidHook = useNotifications();
  
  const { notifications, unreadCount, markAsRead, markAllAsRead } = shareToken
    ? tokenHook
    : uidHook;

  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleRead = async (id: string, actionUrl?: string) => {
    await markAsRead(id);
    if (actionUrl) {
      setOpen(false);
      navigate(actionUrl);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 sm:h-9 sm:w-9 rounded-full"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="w-4 h-4 text-foreground-secondary" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 rounded-xl shadow-xl border border-border/60 max-h-[70vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-xs text-primary font-medium hover:opacity-80"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[50vh] divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={handleRead}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
