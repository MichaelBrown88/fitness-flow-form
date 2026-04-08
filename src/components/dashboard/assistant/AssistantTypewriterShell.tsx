import { useEffect, useState } from 'react';
import { AssistantMessageMarkdown } from '@/components/dashboard/assistant/AssistantMessageMarkdown';

interface AssistantTypewriterShellProps {
  fullText: string;
  /** When false, full text shows immediately (no animation). */
  active: boolean;
  msPerChar: number;
  onComplete: () => void;
  /** Charts, tables, buttons — shown only after the typewriter finishes (or when inactive). */
  childrenAfterText?: React.ReactNode;
}

/**
 * Reveals assistant prose character-by-character; defers heavy blocks until done.
 */
export function AssistantTypewriterShell({
  fullText,
  active,
  msPerChar,
  onComplete,
  childrenAfterText,
}: AssistantTypewriterShellProps) {
  const [count, setCount] = useState(active ? 0 : fullText.length);

  useEffect(() => {
    if (!active) {
      setCount(fullText.length);
      return;
    }
    if (fullText.length === 0) {
      setCount(0);
      onComplete();
      return;
    }
    setCount(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      const next = Math.min(i, fullText.length);
      setCount(next);
      if (next >= fullText.length) {
        window.clearInterval(id);
        onComplete();
      }
    }, msPerChar);
    return () => window.clearInterval(id);
  }, [active, fullText, msPerChar, onComplete]);

  const slice = fullText.slice(0, count);
  const done = !active || count >= fullText.length;

  return (
    <>
      <div className="relative min-h-[1rem]" aria-live={active && !done ? 'off' : 'polite'}>
        {slice.length === 0 && active && !done ? (
          <span className="inline-block h-4 w-px align-middle bg-foreground/40 animate-pulse" aria-hidden />
        ) : (
          <AssistantMessageMarkdown content={slice} />
        )}
        {active && !done && slice.length > 0 && (
          <span
            className="ml-0.5 inline-block h-3.5 w-0.5 align-middle bg-foreground/55 animate-pulse"
            aria-hidden
          />
        )}
      </div>
      {done ? childrenAfterText : null}
    </>
  );
}
