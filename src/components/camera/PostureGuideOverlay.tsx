/**
 * Static framing guides for coach-held posture capture: head line, toe line,
 * and a vertical midline. Restrained styling — thin lines, no heavy chrome.
 */
export function PostureGuideOverlay() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* Vertical midline */}
      <line x1="50" y1="4" x2="50" y2="96" stroke="white" strokeOpacity="0.55" strokeWidth="0.25" strokeDasharray="1.5 1.5" />
      {/* Head line */}
      <line x1="12" y1="10" x2="88" y2="10" stroke="white" strokeOpacity="0.75" strokeWidth="0.3" />
      {/* Toe line */}
      <line x1="12" y1="92" x2="88" y2="92" stroke="white" strokeOpacity="0.75" strokeWidth="0.3" />
    </svg>
  );
}
