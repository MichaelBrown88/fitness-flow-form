/**
 * Share Results Drawer — shown when a client taps "Share my results" in the PWA.
 *
 * Displays one tab per pillar that improved (or all pillars on first assessment).
 * Each tab shows a scaled preview of the square card and a toggle to view the story format.
 * Sharing uses Web Share API (files) on mobile, downloads image or opens card URL as fallback.
 */

import { useState, useCallback } from 'react';
import { Share2, Download, Loader2, ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PillarScoreCardPreview } from '@/components/share/PillarScoreCard';
import { PillarStoryCardPreview } from '@/components/share/PillarStoryCard';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import { cn } from '@/lib/utils';
import type { PillarCardData } from '@/lib/share/pillarCardData';
import { CONFIG } from '@/config';

interface ShareResultsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: PillarCardData[];
  token: string;
}

type CardFormat = 'card' | 'story';

function buildCardUrl(token: string, pillarId: string, format: CardFormat): string {
  return `${CONFIG.APP.HOST}/share/${token}/${pillarId}/${format}`;
}

async function tryShareCardFile(
  cardUrl: string,
  pillarTitle: string,
): Promise<'shared' | 'downloaded' | 'opened'> {
  // Attempt to fetch the rendered card page as a blob and share as a file
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      // The card page is an HTML document — check if canShare supports files
      const pngBlob = new Blob([blob], { type: 'image/png' });
      const file = new File([pngBlob], `${pillarTitle.toLowerCase()}-score.png`, {
        type: 'image/png',
      });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `My ${pillarTitle} results` });
        return 'shared';
      }
    } catch {
      // Fall through to URL share
    }

    // Fallback: share the URL directly
    try {
      await navigator.share({ url: cardUrl, title: `My ${pillarTitle} results` });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'opened';
    }
  }

  // Desktop / no Web Share API — open the card URL in a new tab
  window.open(cardUrl, '_blank', 'noopener,noreferrer');
  return 'opened';
}

export function ShareResultsDrawer({
  open,
  onOpenChange,
  cards,
  token,
}: ShareResultsDrawerProps) {
  const { toast } = useToast();
  const [activePillarIndex, setActivePillarIndex] = useState(0);
  const [format, setFormat] = useState<CardFormat>('card');
  const [sharing, setSharing] = useState(false);

  const activeCard = cards[activePillarIndex];

  const handleShare = useCallback(async () => {
    if (!activeCard) return;
    setSharing(true);
    try {
      const url = buildCardUrl(token, activeCard.pillarId, format);
      const result = await tryShareCardFile(url, activeCard.pillarTitle);
      if (result === 'shared') {
        toast({ title: 'Shared!', description: 'Your results card is ready to post.' });
      } else if (result === 'opened') {
        toast({
          title: 'Card opened',
          description: 'Screenshot it and post to your stories.',
        });
      }
    } catch (e) {
      logger.warn('[ShareResultsDrawer] share failed', e);
      toast({ title: 'Could not share', description: 'Try opening the card instead.' });
    } finally {
      setSharing(false);
    }
  }, [activeCard, format, token, toast]);

  const handleOpenCard = useCallback(() => {
    if (!activeCard) return;
    const url = buildCardUrl(token, activeCard.pillarId, format);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [activeCard, format, token]);

  if (cards.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-safe max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">Share your results</SheetTitle>
          <SheetDescription className="text-sm">
            {cards[0].isFirstAssessment
              ? 'Your baseline is set. Share it!'
              : 'Celebrate the progress. Pick a pillar and share.'}
          </SheetDescription>
        </SheetHeader>

        {/* Pillar tabs */}
        {cards.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {cards.map((card, i) => (
              <button
                key={card.pillarId}
                type="button"
                onClick={() => setActivePillarIndex(i)}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                  activePillarIndex === i
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {card.pillarTitle}
                {!card.isFirstAssessment && card.scoreDelta !== null && (
                  <span className="ml-1 text-score-green">
                    +{card.scoreDelta}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {activeCard && (
          <div className="space-y-4">
            {/* Format toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat('card')}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                  format === 'card'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60',
                )}
              >
                Square post
              </button>
              <button
                type="button"
                onClick={() => setFormat('story')}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                  format === 'story'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60',
                )}
              >
                Story
              </button>
            </div>

            {/* Card preview */}
            <div className="flex justify-center">
              {format === 'card' ? (
                <PillarScoreCardPreview data={activeCard} previewWidth={280} />
              ) : (
                <PillarStoryCardPreview data={activeCard} previewWidth={160} />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5">
              <Button
                className="flex-1 gap-2"
                onClick={() => void handleShare()}
                disabled={sharing}
              >
                {sharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Share2 className="h-4 w-4" aria-hidden />
                )}
                Share
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenCard}
                aria-label="Open card in new tab"
                title="Open card to screenshot"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              On mobile, tap Share → add to your story or save to photos.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
