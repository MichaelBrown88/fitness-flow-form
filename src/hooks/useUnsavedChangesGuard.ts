/**
 * BrowserRouter-safe guard for unsaved changes: tab close/refresh (beforeunload)
 * and same-origin <a> navigations (capture phase). Does not use useBlocker (data router only).
 */

import { useEffect, useRef, useCallback } from 'react';
import type { NavigateFunction } from 'react-router-dom';

const DEFAULT_MESSAGE = 'You have unsaved changes. Leave anyway?';

export function useUnsavedChangesGuard(
  active: boolean,
  navigate: NavigateFunction,
  message: string = DEFAULT_MESSAGE,
): { guardedNavigate: NavigateFunction } {
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const anchor = el.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.download) return;
      const hrefAttr = anchor.getAttribute('href');
      if (!hrefAttr || hrefAttr === '#' || hrefAttr.startsWith('#')) return;
      if (hrefAttr.startsWith('mailto:') || hrefAttr.startsWith('tel:')) return;

      let pathToNavigate: string;
      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        pathToNavigate = `${url.pathname}${url.search}${url.hash}`;
      } catch {
        return;
      }

      const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (pathToNavigate === here) return;

      e.preventDefault();
      e.stopPropagation();
      if (window.confirm(message)) {
        navigateRef.current(pathToNavigate);
      }
    };
    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [active, message]);

  const guardedNavigate = useCallback<NavigateFunction>(
    (to, options) => {
      if (active && !window.confirm(message)) return;
      navigateRef.current(to, options);
    },
    [active, message],
  );

  return { guardedNavigate };
}
