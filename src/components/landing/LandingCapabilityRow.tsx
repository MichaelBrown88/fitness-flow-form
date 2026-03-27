import { forwardRef } from 'react';
import type { LandingCapabilityRowCopy } from '@/constants/landingCopy';
import { LandingCapabilityVisual } from '@/components/landing/LandingCapabilityVisual';

export type LandingCapabilityRowProps = {
  row: LandingCapabilityRowCopy;
};

export const LandingCapabilityRow = forwardRef<HTMLDivElement, LandingCapabilityRowProps>(
  function LandingCapabilityRow({ row }, ref) {
    const copyBlock = (
      <div className="flex flex-col justify-center space-y-4 lg:space-y-5">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-foreground-tertiary">
          {row.eyebrow}
        </p>
        <h3 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {row.title}
        </h3>
        <ul className="space-y-3 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
          {row.bullets.map((b) => (
            <li key={b} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span className="text-balance">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    );

    const visualBlock = (
      <div className="flex items-center justify-center py-2">
        <LandingCapabilityVisual visualId={row.visualId} />
      </div>
    );

    return (
      <div
        ref={ref}
        className="grid items-center gap-10 rounded-2xl border border-border/90 bg-card/80 p-6 shadow-sm backdrop-blur-sm sm:p-8 lg:grid-cols-2 lg:gap-16 lg:p-10 dark:border-border dark:bg-card/40"
      >
        {row.imageSide === 'left' ? (
          <>
            <div className="order-2 lg:order-1">{visualBlock}</div>
            <div className="order-1 lg:order-2">{copyBlock}</div>
          </>
        ) : (
          <>
            <div className="order-1 lg:order-1">{copyBlock}</div>
            <div className="order-2 lg:order-2">{visualBlock}</div>
          </>
        )}
      </div>
    );
  },
);
