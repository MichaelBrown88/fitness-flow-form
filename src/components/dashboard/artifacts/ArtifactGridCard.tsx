import { useEffect, useState } from 'react';
import { Map, Trophy } from 'lucide-react';
import { PillarScoreCardPreview } from '@/components/share/PillarScoreCard';
import type { PillarCardData } from '@/lib/share/pillarCardData';
import { logger } from '@/lib/utils/logger';
import type { ArtifactsGridItem } from '@/lib/dashboard/artifactsGridItems';

/**
 * Physical phone width on a typical laptop screen (~96 CSS px/inch).
 * Hold your phone up to the screen — this should match.
 * 4:5 aspect ratio (Instagram portrait post).
 */
const POST_W = 260;
const POST_H = Math.round(POST_W * 5 / 4); // 325

interface ArtifactGridCardProps {
  item: ArtifactsGridItem;
  onOpen: (item: ArtifactsGridItem) => void;
}

/** Renders the actual PillarScoreCard design at Instagram post size. */
function ReportCardThumbnail({ token }: { token: string }) {
  const [card, setCard] = useState<PillarCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [
          { getPublicReportByToken },
          { computeScores },
          { buildPillarCards },
        ] = await Promise.all([
          import('@/services/publicReports'),
          import('@/lib/scoring'),
          import('@/lib/share/pillarCardData'),
        ]);

        const report = await getPublicReportByToken(token);
        if (!report) return;

        const scores = computeScores(report.formData);
        const previousScores = report.previousFormData
          ? computeScores(report.previousFormData)
          : null;
        const snapshotCount = report.snapshotSummaries?.length ?? 1;
        const snapshotTypes = report.snapshotSummaries?.map((s) => s.type) ?? [];

        let coachLogoUrl: string | null = null;
        let coachName: string | null = null;
        if (report.organizationId) {
          try {
            const { getOrgSettings } = await import('@/services/organizations');
            const org = await getOrgSettings(report.organizationId);
            if (org.customBrandingEnabled) {
              coachLogoUrl = org.logoUrl ?? null;
              coachName = org.name ?? null;
            }
          } catch { /* non-fatal */ }
        }

        const cards = buildPillarCards({
          scores,
          previousScores,
          clientName: report.clientName,
          snapshotCount,
          snapshotTypes,
          coachLogoUrl,
          coachName,
        });

        if (cards.length > 0) setCard(cards[0]);
      } catch (e) {
        logger.warn('[ArtifactGridCard] failed to load card', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div style={{ width: POST_W, height: POST_W, background: '#0f172a', overflow: 'hidden' }}>
      {!loading && card ? (
        <PillarScoreCardPreview data={card} previewWidth={POST_W} perspective="coach" />
      ) : (
        <div className="h-full w-full animate-pulse" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }} />
      )}
    </div>
  );
}

export function ArtifactGridCard({ item, onOpen }: ArtifactGridCardProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="group overflow-hidden rounded-xl border border-white/10 text-left shadow-md transition-all hover:scale-[1.02] hover:border-white/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ background: '#0f172a', display: 'block', width: POST_W }}
      >
        {item.kind === 'report' && item.report ? (
          <ReportCardThumbnail token={item.report.token} />
        ) : (
          /* Roadmap / Achievements — placeholder until we have card designs for these */
          <div
            className="relative flex flex-col items-center justify-center gap-3"
            style={{
              width: POST_W,
              height: POST_W,
              background:
                item.kind === 'roadmap'
                  ? 'linear-gradient(135deg, #0c1a2e 0%, #0f172a 60%, #0c1a2e 100%)'
                  : 'linear-gradient(135deg, #1a110a 0%, #0f172a 60%, #1a110a 100%)',
            }}
          >
            <div
              className="absolute inset-0 opacity-15"
              style={{
                background:
                  item.kind === 'roadmap'
                    ? 'radial-gradient(circle at 30% 70%, #0ea5e9 0%, transparent 60%)'
                    : 'radial-gradient(circle at 60% 30%, #f59e0b 0%, transparent 60%)',
              }}
              aria-hidden
            />
            {item.kind === 'roadmap' ? (
              <Map className="h-12 w-12 text-sky-400/60" aria-hidden />
            ) : (
              <Trophy className="h-12 w-12 text-amber-400/60" aria-hidden />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              {item.kind === 'roadmap' ? 'ARC™' : 'Milestones'}
            </span>
          </div>
        )}

        {/* Bottom strip — fills the 4:5 height beyond the square card */}
        <div
          className="flex flex-col justify-center px-4"
          style={{ height: POST_H - POST_W, background: '#070d18' }}
        >
          <p className="truncate text-sm font-semibold text-white/85">{item.clientName}</p>
          {item.updatedAt && (
            <p className="mt-0.5 text-[11px] text-white/35">
              {item.updatedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      </button>
    </li>
  );
}
