/**
 * Device orientation for companion: portrait-upright detection with time-stable boundary.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CONFIG } from '@/config';
import { logger } from '@/lib/utils/logger';

interface UseOrientationDetectionResult {
  isVertical: boolean;
  hasPermission: boolean;
  permissionDenied: boolean;
  requestPermission: () => Promise<void>;
}

export function useOrientationDetection(
  isAuthorized: boolean,
  mode: 'posture' | 'bodycomp'
): UseOrientationDetectionResult {
  const stableMs =
    mode === 'posture'
      ? CONFIG.COMPANION.ORIENTATION.STABLE_VERTICAL_MS_POSTURE
      : CONFIG.COMPANION.ORIENTATION.STABLE_VERTICAL_MS_BODYCOMP;

  const [isVertical, setIsVertical] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(() => {
    const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    return typeof DeviceOrientationEventAny.requestPermission !== 'function';
  });

  const verticalStableStartRef = useRef<number | null>(null);
  const stableTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVerticalRef = useRef(false);
  const stableMsRef = useRef(stableMs);

  useEffect(() => {
    stableMsRef.current = stableMs;
  }, [stableMs]);

  const clearStableTimeout = useCallback(() => {
    if (stableTimeoutRef.current != null) {
      clearTimeout(stableTimeoutRef.current);
      stableTimeoutRef.current = null;
    }
  }, []);

  const handleOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;

      const beta = event.beta;
      const gamma = Math.abs(event.gamma);

      const portrait =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(orientation: portrait)')?.matches === true;
      const vertical =
        mode === 'posture'
          ? beta > 30 && beta < 150 && gamma < 65 && (portrait || gamma < 58)
          : beta > 45 && beta < 140 && gamma < 52 && (portrait || gamma < 45);

      if (!vertical) {
        verticalStableStartRef.current = null;
        clearStableTimeout();
        isVerticalRef.current = false;
        setIsVertical(false);
        return;
      }

      if (verticalStableStartRef.current === null) {
        verticalStableStartRef.current = Date.now();
        clearStableTimeout();
        stableTimeoutRef.current = setTimeout(() => {
          stableTimeoutRef.current = null;
          if (verticalStableStartRef.current === null) return;
          const need = stableMsRef.current;
          if (Date.now() - verticalStableStartRef.current >= need) {
            isVerticalRef.current = true;
            setIsVertical(true);
          }
        }, stableMsRef.current);
      }
    },
    [clearStableTimeout, mode]
  );

  const requestPermission = async () => {
    const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    const requiresExplicitOrientationPermission =
      typeof DeviceOrientationEventAny.requestPermission === 'function';
    logger.warn('[COMPANION_PERM] useOrientationDetection.requestPermission: enter', {
      requiresExplicitOrientationPermission,
      mode,
    });
    try {
      if (typeof DeviceOrientationEventAny.requestPermission === 'function') {
        const state = await DeviceOrientationEventAny.requestPermission();
        logger.warn('[COMPANION_PERM] DeviceOrientationEvent.requestPermission result', { state });
        if (state === 'granted') {
          setHasPermission(true);
        } else {
          setPermissionDenied(true);
          logger.warn(
            '[COMPANION_PERM] orientation denied — combined hasPermission stays false; Enable will not dismiss'
          );
        }
      } else {
        logger.warn('[COMPANION_PERM] no orientation prompt API — granting orientation permission');
        setHasPermission(true);
      }
    } catch (e) {
      logger.error('[COMPANION_PERM] orientation requestPermission threw', e);
    }
  };

  useEffect(() => {
    if (!isAuthorized || !hasPermission) {
      clearStableTimeout();
      verticalStableStartRef.current = null;
      isVerticalRef.current = false;
      setIsVertical(false);
      return;
    }
    if (mode === 'posture' && CONFIG.COMPANION.ORIENTATION.POSTURE_RELAX_UPRIGHT) {
      setIsVertical(true);
      return;
    }
    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      clearStableTimeout();
      verticalStableStartRef.current = null;
      isVerticalRef.current = false;
    };
  }, [isAuthorized, hasPermission, mode, handleOrientation, clearStableTimeout]);

  return {
    isVertical,
    hasPermission,
    permissionDenied,
    requestPermission,
  };
}
