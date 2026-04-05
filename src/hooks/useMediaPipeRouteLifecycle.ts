import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { destroyPoseInstance } from '@/lib/ai/mediapipeSingleton';

function isMediaPipeHeavyPath(pathname: string): boolean {
  if (pathname === ROUTES.ASSESSMENT || pathname.startsWith(`${ROUTES.ASSESSMENT}/`)) {
    return true;
  }
  if (pathname.startsWith('/companion/')) {
    return true;
  }
  return false;
}

/**
 * Releases the shared PoseLandmarker when navigating away from camera-heavy routes
 * so GPU/WASM resources and camera tracks can be torn down reliably.
 */
export function useMediaPipeRouteLifecycle(): void {
  const location = useLocation();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathRef.current;
    const curr = location.pathname;
    if (prev !== null && isMediaPipeHeavyPath(prev) && !isMediaPipeHeavyPath(curr)) {
      destroyPoseInstance();
    }
    prevPathRef.current = curr;
  }, [location.pathname]);
}
