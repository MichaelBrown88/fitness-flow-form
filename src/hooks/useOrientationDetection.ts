/**
 * Hook for device orientation detection
 * Extracted from Companion.tsx to improve maintainability
 * 
 * Includes 500ms hysteresis to prevent jittery state transitions
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Hysteresis duration - device must be vertical for this long before state changes
const VERTICAL_HYSTERESIS_MS = 500;

interface UseOrientationDetectionResult {
  isVertical: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<void>;
}

export function useOrientationDetection(
  isAuthorized: boolean,
  mode: 'posture' | 'bodycomp'
): UseOrientationDetectionResult {
  const [isVertical, setIsVertical] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(() => {
    const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    return typeof DeviceOrientationEventAny.requestPermission !== 'function';
  });

  const isVerticalRef = useRef(false);
  // Hysteresis tracking - when did the device first become vertical?
  const verticalStartTimeRef = useRef<number | null>(null);
  const hysteresisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (event.beta === null || event.gamma === null) return;

    const beta = event.beta;
    const gamma = Math.abs(event.gamma);

    // Phone is "vertical" (upright in portrait mode for taking photos):
    // - beta ~90° means phone is upright (not tilted forward/back)
    // - gamma ~0° means phone is level (not tilted left/right)
    // Allow generous tolerance for natural hand movement
    const vertical = beta > 50 && beta < 130 && gamma < 35;
    
    // Hysteresis logic: require 500ms of continuous vertical state
    if (vertical && !isVerticalRef.current) {
      // Device just became vertical - start tracking
      if (!verticalStartTimeRef.current) {
        verticalStartTimeRef.current = Date.now();
        
        // Set a timeout to check after hysteresis period
        if (hysteresisTimeoutRef.current) {
          clearTimeout(hysteresisTimeoutRef.current);
        }
        hysteresisTimeoutRef.current = setTimeout(() => {
          // If still vertical after hysteresis period, update state
          if (isVerticalRef.current || (verticalStartTimeRef.current && 
              Date.now() - verticalStartTimeRef.current >= VERTICAL_HYSTERESIS_MS)) {
            setIsVertical(true);
          }
        }, VERTICAL_HYSTERESIS_MS);
      } else if (Date.now() - verticalStartTimeRef.current >= VERTICAL_HYSTERESIS_MS) {
        // Already past hysteresis period, update state
        isVerticalRef.current = true;
        setIsVertical(true);
      }
      // Track raw vertical state in ref for timeout callback
      isVerticalRef.current = true;
    } else if (!vertical) {
      // Device is no longer vertical - reset immediately
      verticalStartTimeRef.current = null;
      isVerticalRef.current = false;
      setIsVertical(false);
      
      // Clear pending timeout
      if (hysteresisTimeoutRef.current) {
        clearTimeout(hysteresisTimeoutRef.current);
        hysteresisTimeoutRef.current = null;
      }
    }
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
    if (!isAuthorized || !hasPermission || mode === 'bodycomp') return;
    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      // Clean up hysteresis timeout on unmount
      if (hysteresisTimeoutRef.current) {
        clearTimeout(hysteresisTimeoutRef.current);
        hysteresisTimeoutRef.current = null;
      }
    };
  }, [isAuthorized, hasPermission, handleOrientation, mode]);

  return {
    isVertical,
    hasPermission,
    requestPermission,
  };
}

