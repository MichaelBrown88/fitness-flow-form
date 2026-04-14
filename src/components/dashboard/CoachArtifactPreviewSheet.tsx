/**
 * Coach Artefact Preview Sheet
 *
 * Opens when a coach clicks any artefact in the grid.
 * For reports: fetches the public report, computes pillar cards, renders the
 * social-ready preview with pillar tabs + square/story toggle + a Share button.
 * For roadmap / achievements: shows a compact info card with Share.
 */

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import {
  publicReportOpenGraphTitle,
  publicReportSocialPostCaption,
} from '@/constants/publicReportShare';
import { PillarScoreCardPreview } from '@/components/share/PillarScoreCard';
import { PillarStoryCardPreview } from '@/components/share/PillarStoryCard';
import type { PillarCardData } from '@/lib/share/pillarCardData';
import type { CoachShareablePreview } from '@/hooks/useCoachArtifacts';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { copyTextToClipboard } from '@/lib/utils/clipboard';
import { coachShareablePublicUrl } from '@/lib/utils/coachShareableUrls';
import { logger } from '@/lib/utils/logger';
import { UI_TOASTS } from '@/constants/ui';
import { cn } from '@/lib/utils';
import { CONFIG } from '@/config';

type CardFormat = 'card' | 'story';

interface CoachArtifactPreviewSheetProps {
  preview: CoachShareablePreview | null;
  onClose: () => void;
}

function previewClientName(p: CoachShareablePreview): string {
  if (p.kind === 'report') return p.report.clientName;
  return p.row.clientName;
}

function previewToken(p: CoachShareablePreview): string {
  if (p.kind === 'report') return p.report.token;
  return p.row.token;
}

/** Renders the social card preview for a report artefact. */
function ReportCardPreview({ token, clientName, onShare }: {
  token: string;
  clientName: string;
  onShare: (url: string, title: string) => void;
}) {
  const [cards, setCards] = useState<PillarCardData[]>([]);
  const [activePillarIndex, setActivePillarIndex] = useState(0);
  const [format, setFormat] = useState<CardFormat>('card');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setCards([]);
    setActivePillarIndex(0);
    setFormat('card');

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
        if (!report) {
          setError('Report not available.');
          return;
        }

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

        const built = buildPillarCards({
          scores,
          previousScores,
          clientName: report.clientName,
          snapshotCount,
          snapshotTypes,
          coachLogoUrl,
          coachName,
        });

        if (built.length === 0) {
          setError('No score cards available for this report.');
          return;
        }

        setCards(built);
      } catch (e) {
        logger.error('[ReportCardPreview] load failed', e);
        setError('Could not load score cards.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const activeCard = cards[activePillarIndex];

  const handleShare = useCallback(() => {
    if (!activeCard) return;
    const url = `${CONFIG.APP.HOST}/share/${token}/${activeCard.pillarId}/${format}`;
    const title = `${clientName} — ${activeCard.pillarTitle}`;
    onShare(url, title);
  }, [activeCard, format, token, clientName, onShare]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || cards.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">{error ?? 'No cards available.'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {/* Pillar tabs */}
      {cards.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {cards.map((card, i) => (
            <button
              key={card.pillarId}
              type="button"
              onClick={() => setActivePillarIndex(i)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                activePillarIndex === i
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {card.pillarTitle}
              {!card.isFirstAssessment && card.scoreDelta !== null && card.scoreDelta > 0 && (
                <span className="ml-1 text-emerald-500">+{card.scoreDelta}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Format toggle */}
      <div className="flex gap-1.5">
        {(['card', 'story'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              format === f
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/60',
            )}
          >
            {f === 'card' ? 'Square post' : 'Story'}
          </button>
        ))}
      </div>

      {/* Card preview */}
      {activeCard && (
        <div className="flex justify-center">
          {format === 'card' ? (
            <PillarScoreCardPreview data={activeCard} previewWidth={460} perspective="coach" />
          ) : (
            <PillarStoryCardPreview data={activeCard} previewWidth={260} perspective="coach" />
          )}
        </div>
      )}

      {/* Share action */}
      <Button className="w-full gap-2" onClick={handleShare}>
        <Share2 className="h-4 w-4" />
        Share
      </Button>
    </div>
  );
}

export function CoachArtifactPreviewSheet({ preview, onClose }: CoachArtifactPreviewSheetProps) {
  const { toast } = useToast();
  const { orgSettings } = useAuth();
  const open = preview !== null;

  const token = preview ? previewToken(preview) : '';
  const clientName = preview ? previewClientName(preview) : '';
  const coachBrandName = orgSettings?.name?.trim() || null;
  const revoked = preview?.kind === 'report' && preview.report.revoked;

  const dialogTitle = preview
    ? preview.kind === 'report'
      ? COACH_ASSISTANT_COPY.ARTIFACT_PREVIEW_TITLE(preview.report.clientName)
      : preview.kind === 'roadmap'
        ? COACH_ASSISTANT_COPY.ROADMAP_PREVIEW_TITLE(preview.row.clientName)
        : COACH_ASSISTANT_COPY.ACHIEVEMENTS_PREVIEW_TITLE(preview.row.clientName)
    : '';

  const url = preview
    ? preview.kind === 'report'
      ? coachShareablePublicUrl('report', token)
      : preview.kind === 'roadmap'
        ? coachShareablePublicUrl('roadmap', token)
        : coachShareablePublicUrl('achievements', token)
    : '';

  const handleCopyLink = useCallback(async (shareUrl: string) => {
    try {
      await copyTextToClipboard(shareUrl);
      toast({ title: UI_TOASTS.SUCCESS.LINK_COPIED, description: UI_TOASTS.SUCCESS.LINK_COPIED_DESC });
    } catch (e) {
      logger.warn('[CoachArtifactPreviewSheet] copy failed', e);
      toast({ title: UI_TOASTS.ERROR.COPY_FAILED, variant: 'destructive' });
    }
  }, [toast]);

  const handleShare = useCallback(async (shareUrl: string, shareTitle: string) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const caption = publicReportSocialPostCaption(clientName, shareUrl, coachBrandName, null);
        await navigator.share({ title: shareTitle, text: caption, url: shareUrl });
        toast({ title: UI_TOASTS.SUCCESS.SHARED_SUCCESSFULLY, description: UI_TOASTS.SUCCESS.SHARED_DESC });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        logger.warn('[CoachArtifactPreviewSheet] share failed', e);
      }
    }
    await handleCopyLink(shareUrl);
  }, [clientName, coachBrandName, toast, handleCopyLink]);

  // For non-report artefacts — simple share using the public URL
  const handleNonReportShare = useCallback(async () => {
    const title = publicReportOpenGraphTitle(clientName, coachBrandName);
    await handleShare(url, title);
  }, [url, clientName, coachBrandName, handleShare]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0 sm:rounded-xl',
          // Sized for card previews — wide enough on desktop to show the card at a good size
          'w-[calc(100vw-1.5rem)] max-w-[500px]',
          'max-h-[min(92vh,820px)]',
          '[&>button]:right-3 [&>button]:top-3',
        )}
      >
        {preview ? (
          <>
            <DialogHeader className="shrink-0 flex-row items-center justify-between border-b border-border px-4 py-2.5 pr-12">
              <DialogTitle className="text-sm font-medium">{dialogTitle}</DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                aria-label="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </DialogHeader>

            {revoked ? (
              <p className="p-6 text-sm text-foreground/80">{COACH_ASSISTANT_COPY.ARTIFACT_REVOKED}</p>
            ) : preview.kind === 'report' ? (
              <ReportCardPreview
                token={token}
                clientName={clientName}
                onShare={(shareUrl, shareTitle) => void handleShare(shareUrl, shareTitle)}
              />
            ) : (
              /* Roadmap / Achievements — simple share card */
              <div className="flex flex-1 flex-col items-center gap-4 p-6">
                <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 p-6 text-center">
                  <p className="text-base font-semibold">{clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {preview.kind === 'roadmap' ? 'ARC™ Plan' : 'Achievements'}
                  </p>
                </div>
                <Button className="w-full gap-2" onClick={() => void handleNonReportShare()}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
