import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { subscribeToLiveSession, type LiveSession } from '@/services/liveSessions';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import { UI_TOASTS } from '@/constants/ui';
import type { ConnectionState } from './types';

export interface UsePostureCompanionConnectionArgs {
  isOpen: boolean;
  session: LiveSession | null;
  setSession: Dispatch<SetStateAction<LiveSession | null>>;
}

export interface UsePostureCompanionConnectionResult {
  isOnline: boolean;
  connectionState: ConnectionState;
}

export function usePostureCompanionConnection({
  isOpen,
  session,
  setSession,
}: UsePostureCompanionConnectionArgs): UsePostureCompanionConnectionResult {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline');
  const heartbeatCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsOnline(false);
      setConnectionState('offline');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!session?.id) return;

    const unsubscribe = subscribeToLiveSession(session.id, (updatedSession) => {
      setSession(updatedSession);
      if (updatedSession.companionJoined) {
        setIsOnline(true);
      }

      if (updatedSession.companionLogs && Array.isArray(updatedSession.companionLogs)) {
        const newLogs = updatedSession.companionLogs.slice(-5);
        newLogs.forEach(
          (log: { timestamp: unknown; message: string; level: 'info' | 'warn' | 'error' }) => {
            const logMethod =
              log.level === 'error' ? logger.error : log.level === 'warn' ? logger.warn : logger.info;
            logMethod(`[MOBILE ${session.id}] ${log.message}`);
          },
        );
      }
    });

    return () => unsubscribe();
  }, [session?.id, setSession]);

  useEffect(() => {
    if (!session?.id || !isOnline) {
      setConnectionState('offline');
      return;
    }

    const checkHeartbeat = () => {
      const lastHeartbeat = session?.lastHeartbeat as { toMillis?: () => number } | undefined;
      if (!lastHeartbeat?.toMillis) {
        if (session?.companionJoined) {
          setConnectionState('online');
        }
        return;
      }

      const now = Date.now();
      const heartbeatTime = lastHeartbeat.toMillis();
      const staleness = now - heartbeatTime;

      if (staleness < 10000) {
        setConnectionState('online');
      } else if (staleness < 20000) {
        setConnectionState('unstable');
      } else {
        setConnectionState('disconnected');
        if (isOnline) {
          logger.debug('[HEARTBEAT] Connection lost - mobile companion disconnected');
          toast({
            title: UI_TOASTS.ERROR.CONNECTION_LOST,
            description: UI_TOASTS.ERROR.CONNECTION_LOST_DESC,
            variant: 'destructive',
          });
        }
        setIsOnline(false);
      }
    };

    checkHeartbeat();
    heartbeatCheckIntervalRef.current = setInterval(checkHeartbeat, 2000);

    return () => {
      if (heartbeatCheckIntervalRef.current) {
        clearInterval(heartbeatCheckIntervalRef.current);
        heartbeatCheckIntervalRef.current = null;
      }
    };
  }, [session?.id, session?.lastHeartbeat, session?.companionJoined, isOnline, toast]);

  return { isOnline, connectionState };
}
