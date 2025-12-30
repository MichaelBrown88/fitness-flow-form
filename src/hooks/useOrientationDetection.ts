/**
 * Hook for device orientation detection
 * Extracted from Companion.tsx to improve maintainability
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseOrientationDetectionResult {
  isVertical: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<void>;
}

export function useOrientationDetection(
  isAuthorized: boolean,
  mode: 'posture' | 'inbody'
): UseOrientationDetectionResult {
  const [isVertical, setIsVertical] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(() => {
    const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    return typeof DeviceOrientationEventAny.requestPermission !== 'function';
  });

  const isVerticalRef = useRef(false);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (event.beta === null || event.gamma === null) return;

    const beta = Math.abs(event.beta);
    const gamma = Math.abs(event.gamma);

    // Phone is vertical if beta (pitch) is close to 0 and gamma (roll) is close to 90
    // Allow some tolerance for natural hand movement
    const vertical = beta < 30 && gamma > 60 && gamma < 120;
    isVerticalRef.current = vertical;
    setIsVertical(vertical);
  }, []);

  const requestPermission = async () => {
    const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DeviceOrientationEventAny.requestPermission === 'function') {
      const state = await DeviceOrientationEventAny.requestPermission();
      if (state === 'granted') setHasPermission(true);
    } else {
      setHasPermission(true);
    }
  };

  useEffect(() => {
    if (!isAuthorized || !hasPermission || mode === 'inbody') return;
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isAuthorized, hasPermission, handleOrientation, mode]);

  return {
    isVertical,
    hasPermission,
    requestPermission,
  };
}

