/** Simple inline graphic: four guided standing views for remote intake. */
export function RemotePostureIntroIllustration() {
  const views = [
    { label: 'Front', rotate: 0 },
    { label: 'Back', rotate: 180 },
    { label: 'Side', rotate: 90 },
    { label: 'Side', rotate: -90 },
  ] as const;

  return (
    <div
      className="mx-auto w-full max-w-xs"
      role="img"
      aria-label="Four guided standing photos: front, back, and both sides"
    >
      <div className="grid grid-cols-4 gap-2">
        {views.map((v, i) => (
          <div
            key={`${v.label}-${i}`}
            className="flex flex-col items-center gap-2 rounded-2xl bg-muted/50 px-1 py-3"
          >
            <svg
              viewBox="0 0 48 72"
              className="h-16 w-10 text-muted-foreground"
              aria-hidden
            >
              <ellipse cx="24" cy="10" rx="8" ry="9" fill="currentColor" opacity="0.35" />
              <rect
                x="18"
                y="18"
                width="12"
                height="28"
                rx="4"
                fill="currentColor"
                opacity="0.5"
                transform={`rotate(${v.rotate} 24 32)`}
              />
              <line
                x1="24"
                y1="46"
                x2="16"
                y2="68"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.45"
              />
              <line
                x1="24"
                y1="46"
                x2="32"
                y2="68"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.45"
              />
            </svg>
            <span className="text-[10px] font-medium text-muted-foreground">{v.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
          <rect
            x="5"
            y="2"
            width="14"
            height="20"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="19" r="1.25" fill="currentColor" />
        </svg>
        <span className="text-xs leading-snug">On-screen guides help you line up each shot</span>
      </div>
    </div>
  );
}
