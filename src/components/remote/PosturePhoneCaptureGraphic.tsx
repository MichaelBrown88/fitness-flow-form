import { cn } from '@/lib/utils';

export interface PosturePhoneCaptureGraphicProps {
  className?: string;
}

/**
 * Inviting posture-scan invite — viewfinder + figure + scan line (coach marketing style).
 */
export function PosturePhoneCaptureGraphic({ className }: PosturePhoneCaptureGraphicProps) {
  return (
    <div
      className={cn('mx-auto w-full max-w-[13rem] shrink-0', className)}
      role="img"
      aria-label="Stand in frame while your phone scans your posture"
    >
      <svg
        viewBox="0 0 200 220"
        className="h-auto w-full text-foreground"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="24"
          y="16"
          width="152"
          height="188"
          rx="20"
          className="fill-muted/40 stroke-border"
          strokeWidth="2"
        />
        <path
          d="M44 52h24v24H44zM132 52h24v24H132zM44 144h24v24H44zM132 144h24v24H132z"
          className="stroke-primary/70"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="100" cy="52" r="14" className="stroke-foreground/35" strokeWidth="3" />
        <path
          d="M100 66v58M72 98h56"
          className="stroke-foreground/30"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M88 138c0-8 5-14 12-14s12 6 12 14v22H88V138z"
          className="stroke-foreground/30"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M38 102h124"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M48 102h8M144 102h8"
          className="stroke-primary/60"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Guided standing scan
      </p>
    </div>
  );
}
