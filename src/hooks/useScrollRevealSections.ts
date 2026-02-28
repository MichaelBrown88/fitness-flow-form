import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Progressively reveals collapsible sections as the user scrolls down.
 * - Sections auto-open when their header enters the viewport
 * - If a user manually collapses a section, it stays collapsed (scroll won't reopen it)
 * - Click-to-toggle always works
 */
export function useScrollRevealSections<T extends string>(
  sectionIds: readonly T[],
  defaultOpen: readonly T[] = [],
) {
  const [openSections, setOpenSections] = useState<Set<T>>(() => new Set(defaultOpen));
  const manuallyCollapsed = useRef(new Set<T>());
  const sectionRefs = useRef<Map<T, HTMLElement>>(new Map());

  const setRef = useCallback((id: T) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el);
    else sectionRefs.current.delete(id);
  }, []);

  const toggle = useCallback((id: T) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        manuallyCollapsed.current.add(id);
      } else {
        next.add(id);
        manuallyCollapsed.current.delete(id);
      }
      return next;
    });
  }, []);

  const isOpen = useCallback((id: T) => openSections.has(id), [openSections]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const toOpen: T[] = [];
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute('data-section-id') as T | null;
          if (!id) return;
          if (manuallyCollapsed.current.has(id)) return;
          toOpen.push(id);
        });

        if (toOpen.length > 0) {
          setOpenSections(prev => {
            const next = new Set(prev);
            toOpen.forEach(id => next.add(id));
            return next;
          });
        }
      },
      { rootMargin: '0px 0px -20% 0px', threshold: 0.1 },
    );

    sectionRefs.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sectionIds]);

  return { isOpen, toggle, setRef };
}
