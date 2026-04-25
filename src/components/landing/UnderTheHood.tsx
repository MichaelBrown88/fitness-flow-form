import { Activity } from 'lucide-react';
import SectionHeader from '@/components/landing/SectionHeader';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { LANDING_H2_ACCENT_ON_DARK } from '@/constants/landingCopy';

export function UnderTheHood() {
  // Apple-style stagger: header → text → visual
  const headerRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 0 });
  const contentRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 1 });
  const visualRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 2 });

  return (
    <section className="relative overflow-hidden bg-landing-contrast-bg px-6 py-24 text-landing-contrast-fg sm:py-32">
      {/* Local noise texture — avoids 403 from third-party CDN in production */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-full w-full opacity-[0.18]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Centered header — Apple style */}
        <div ref={headerRef}>
          <SectionHeader
            pill="Movement Analysis Engine"
            pillIcon={<Activity size={12} />}
            title={
              <>
                Data, Not Just{' '}
                <span className={LANDING_H2_ACCENT_ON_DARK}>Pretty Pictures.</span>
              </>
            }
            subtitle="360+ data points analysed across posture, movement, and body composition — feeding AXIS Score™, pillar detail, and coach-facing SIGNAL™ themes."
            dark
          />
        </div>

        <div className="grid items-center gap-16 md:grid-cols-2">
          {/* Left: Numbered list (appears second) */}
          <div ref={contentRef} className="space-y-6">
            {[
              {
                title: 'Normative Comparison',
                desc: 'Compare client metrics against age/gender matched population averages.',
              },
              {
                title: 'Pattern Recognition',
                desc: 'Support better movement habits between sessions.',
              },
              {
                title: 'Trend Analysis',
                desc: 'Detect micro-improvements that standard scales miss.',
              },
            ].map((item, i) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-landing-contrast-border bg-landing-contrast-surface font-bold text-primary">
                  {i + 1}
                </div>
                <div>
                  <h4 className="mb-1 text-balance font-bold text-landing-contrast-fg">{item.title}</h4>
                  <p className="text-balance text-sm text-landing-contrast-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Terminal visual (appears last) */}
          <div ref={visualRef} className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/15 blur-[100px]" />
            <div className="relative rounded-lg border border-landing-contrast-border bg-landing-contrast-surface/50 p-8 backdrop-blur-lg">
              <div className="mb-8 flex items-center justify-between border-b border-landing-contrast-border pb-4">
                <span className="font-mono text-sm text-landing-contrast-subtle">PROCESSING_job_ID_8829</span>
                <span className="flex items-center gap-2 text-xs font-bold text-score-green">
                  <span className="size-2 animate-pulse rounded-full bg-score-green" />
                  LIVE
                </span>
              </div>

              <div className="space-y-4 font-mono text-sm">
                <div className="flex items-center gap-3 text-landing-contrast-subtle">
                  <span className="text-primary">➜</span>
                  <span>Ingesting image data...</span>
                  <span className="ml-auto text-landing-contrast-muted">Done</span>
                </div>
                <div className="flex items-center gap-3 text-landing-contrast-subtle">
                  <span className="text-primary">➜</span>
                  <span>Extracting landmarks...</span>
                  <span className="ml-auto text-landing-contrast-muted">32pts</span>
                </div>
                <div className="flex items-center gap-3 text-landing-contrast-subtle">
                  <span className="text-primary">➜</span>
                  <span>Calculating craniovertebral angle...</span>
                  <span className="ml-auto text-score-amber">42° (Low)</span>
                </div>
                <div className="flex items-center gap-3 text-landing-contrast-subtle">
                  <span className="text-primary">➜</span>
                  <span>Generating recommendations...</span>
                  <span className="ml-auto text-landing-contrast-muted">3 items</span>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-primary/35 bg-landing-contrast-surface-elevated/80 p-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-primary">
                  Insight Generated
                </p>
                <p className="text-balance font-medium text-landing-contrast-fg">
                  &quot;Forward head posture detected. Recommend chin tucks and thoracic extension exercises.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
