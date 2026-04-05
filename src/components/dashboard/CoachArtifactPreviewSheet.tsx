import { useCallback, useEffect, useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { ExternalLink, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShareWithClientReportDialog } from '@/components/reports/ShareWithClientReportDialog';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import { SOCIAL_SHARE_ARTIFACTS_COPY } from '@/constants/socialShareArtifactsCopy';
import type { SocialShareArtifacts } from '@/constants/socialShareArtifacts';
import {
  publicReportOpenGraphDescription,
  publicReportOpenGraphTitle,
  publicReportSocialPostCaption,
} from '@/constants/publicReportShare';
import type { CoachShareablePreview } from '@/hooks/useCoachArtifacts';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { copyTextToClipboard } from '@/lib/utils/clipboard';
import { coachShareablePublicUrl } from '@/lib/utils/coachShareableUrls';
import { logger } from '@/lib/utils/logger';
import { UI_TOASTS } from '@/constants/ui';
import { generatePublicReportSocialShareArtifacts } from '@/services/socialShareArtifacts';
import { cn } from '@/lib/utils';

function previewClientName(p: CoachShareablePreview): string {
  if (p.kind === 'report') return p.report.clientName;
  return p.row.clientName;
}

function previewToken(p: CoachShareablePreview): string {
  if (p.kind === 'report') return p.report.token;
  return p.row.token;
}

interface CoachArtifactPreviewSheetProps {
  /** What to preview — report, roadmap, or achievements public URL. */
  preview: CoachShareablePreview | null;
  onClose: () => void;
}

function isFirebaseFunctionsError(e: unknown): e is { code: string } {
  return typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'string';
}

export function CoachArtifactPreviewSheet({ preview, onClose }: CoachArtifactPreviewSheetProps) {
  const { toast } = useToast();
  const { orgSettings, user } = useAuth();
  const open = preview !== null;
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [socialShareArtifacts, setSocialShareArtifacts] = useState<SocialShareArtifacts | null>(null);
  const [socialShareGenerating, setSocialShareGenerating] = useState(false);

  const kind = preview?.kind ?? 'report';
  const url = useMemo(() => {
    if (!preview) return '';
    if (preview.kind === 'report') return coachShareablePublicUrl('report', preview.report.token);
    if (preview.kind === 'roadmap') return coachShareablePublicUrl('roadmap', preview.row.token);
    return coachShareablePublicUrl('achievements', preview.row.token);
  }, [preview]);

  const clientName = preview ? previewClientName(preview) : '';
  const coachBrandName = orgSettings?.name?.trim() || null;
  const revoked = preview?.kind === 'report' && preview.report.revoked;

  const dialogTitle = useMemo(() => {
    if (!preview) return '';
    if (preview.kind === 'report') return COACH_ASSISTANT_COPY.ARTIFACT_PREVIEW_TITLE(preview.report.clientName);
    if (preview.kind === 'roadmap') return COACH_ASSISTANT_COPY.ROADMAP_PREVIEW_TITLE(preview.row.clientName);
    return COACH_ASSISTANT_COPY.ACHIEVEMENTS_PREVIEW_TITLE(preview.row.clientName);
  }, [preview]);

  const dialogSub = useMemo(() => {
    if (!preview) return '';
    if (preview.kind === 'report') return COACH_ASSISTANT_COPY.ARTIFACT_PREVIEW_SUB;
    if (preview.kind === 'roadmap') return COACH_ASSISTANT_COPY.ROADMAP_PREVIEW_SUB;
    return COACH_ASSISTANT_COPY.ACHIEVEMENTS_PREVIEW_SUB;
  }, [preview]);

  const socialCaption = useMemo(() => {
    if (!preview || !url) return '';
    if (preview.kind === 'report') {
      return publicReportSocialPostCaption(clientName, url, coachBrandName, null);
    }
    if (preview.kind === 'roadmap') {
      return COACH_ASSISTANT_COPY.ROADMAP_SOCIAL_CAPTION(clientName, url);
    }
    return COACH_ASSISTANT_COPY.ACHIEVEMENTS_SOCIAL_CAPTION(clientName, url);
  }, [preview, url, clientName, coachBrandName]);

  const ogTitlePreview = useMemo(() => {
    if (kind !== 'report' || !clientName) return '';
    return publicReportOpenGraphTitle(clientName, coachBrandName);
  }, [kind, clientName, coachBrandName]);

  const ogDescPreview = useMemo(() => publicReportOpenGraphDescription(null), []);

  const shareTitle = useMemo(() => {
    if (!preview) return '';
    if (preview.kind === 'report') return publicReportOpenGraphTitle(clientName, coachBrandName);
    if (preview.kind === 'roadmap') return COACH_ASSISTANT_COPY.ROADMAP_PREVIEW_TITLE(clientName);
    return COACH_ASSISTANT_COPY.ACHIEVEMENTS_PREVIEW_TITLE(clientName);
  }, [preview, clientName, coachBrandName]);

  const previewFrameKey = preview ? `${preview.kind}-${previewToken(preview)}` : '';
  useEffect(() => {
    setIframeLoaded(false);
  }, [previewFrameKey]);

  useEffect(() => {
    setSocialShareArtifacts(null);
    setSocialShareGenerating(false);
  }, [previewFrameKey]);

  const assessmentIdForSocial =
    preview?.kind === 'report' && preview.report.assessmentId && !preview.report.revoked
      ? preview.report.assessmentId
      : undefined;

  const handleGenerateSocialShareArtifacts = useCallback(async () => {
    if (!assessmentIdForSocial || !user) return;
    setSocialShareGenerating(true);
    try {
      const out = await generatePublicReportSocialShareArtifacts({ assessmentId: assessmentIdForSocial });
      setSocialShareArtifacts({
        ...out.socialShareArtifacts,
        generatedAt: Timestamp.now(),
      });
      toast({
        title: SOCIAL_SHARE_ARTIFACTS_COPY.SUCCESS_TITLE,
        description: SOCIAL_SHARE_ARTIFACTS_COPY.SUCCESS_DESC,
      });
    } catch (e) {
      logger.warn('[CoachArtifactPreviewSheet] social share generation failed', e);
      if (isFirebaseFunctionsError(e) && e.code === 'functions/resource-exhausted') {
        toast({
          title: SOCIAL_SHARE_ARTIFACTS_COPY.ERROR_TITLE,
          description: SOCIAL_SHARE_ARTIFACTS_COPY.RATE_LIMIT_DESC,
          variant: 'destructive',
        });
      } else {
        toast({
          title: SOCIAL_SHARE_ARTIFACTS_COPY.ERROR_TITLE,
          description: SOCIAL_SHARE_ARTIFACTS_COPY.ERROR_DESC,
          variant: 'destructive',
        });
      }
    } finally {
      setSocialShareGenerating(false);
    }
  }, [assessmentIdForSocial, user, toast]);

  const handleCopyLink = useCallback(async () => {
    if (!url) return;
    try {
      await copyTextToClipboard(url);
      toast({ title: UI_TOASTS.SUCCESS.LINK_COPIED, description: UI_TOASTS.SUCCESS.LINK_COPIED_DESC });
    } catch (e) {
      logger.warn('[CoachShareablePreview] copy failed', e);
      toast({ title: UI_TOASTS.ERROR.COPY_FAILED, variant: 'destructive' });
    }
  }, [url, toast]);

  const handleCopySocialCaption = useCallback(async () => {
    if (!socialCaption) return;
    try {
      await copyTextToClipboard(socialCaption);
      toast({
        title: UI_TOASTS.SUCCESS.SOCIAL_CAPTION_COPIED,
        description: UI_TOASTS.SUCCESS.SOCIAL_CAPTION_COPIED_DESC,
      });
    } catch (e) {
      logger.warn('[CoachShareablePreview] caption copy failed', e);
      toast({ title: UI_TOASTS.ERROR.COPY_FAILED, variant: 'destructive' });
    }
  }, [socialCaption, toast]);

  const handleFacebookShare = useCallback(() => {
    if (!url) return;
    const u = encodeURIComponent(url);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, '_blank', 'noopener,noreferrer');
  }, [url]);

  const handleEmailLink = useCallback(() => {
    if (!url || !preview) return;
    let subject: string;
    let body: string;
    if (preview.kind === 'report') {
      subject = `Your fitness report — ${clientName}`;
      body = `View your report:\n\n${url}`;
    } else if (preview.kind === 'roadmap') {
      subject = COACH_ASSISTANT_COPY.EMAIL_ROADMAP_SUBJECT(clientName);
      body = `View your roadmap:\n\n${url}`;
    } else {
      subject = COACH_ASSISTANT_COPY.EMAIL_ACHIEVEMENTS_SUBJECT(clientName);
      body = `View achievements:\n\n${url}`;
    }
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [url, clientName, preview]);

  const handleSystemShare = useCallback(async () => {
    if (!url) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: socialCaption || publicReportOpenGraphDescription(null),
          url,
        });
        toast({ title: UI_TOASTS.SUCCESS.SHARED_SUCCESSFULLY, description: UI_TOASTS.SUCCESS.SHARED_DESC });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          logger.warn('[CoachShareablePreview] share failed', e);
          await handleCopyLink();
        }
      }
    } else {
      await handleCopyLink();
    }
  }, [url, shareTitle, socialCaption, toast, handleCopyLink]);

  const handleWhatsAppShare = useCallback(() => {
    if (!url) return;
    const text = socialCaption || `${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }, [url, socialCaption]);

  const showOgBlock = preview?.kind === 'report' && !preview.report.revoked && Boolean(ogTitlePreview);
  const showSocialActions = !revoked;

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent
          className={cn(
            'flex max-h-[min(92vh,900px)] w-[calc(100vw-1.5rem)] max-w-[min(100vw-1.5rem,920px)] flex-col gap-0 overflow-hidden p-0 sm:rounded-xl',
            '[&>button]:right-3 [&>button]:top-3',
          )}
        >
          {preview ? (
            <>
              <DialogHeader className="shrink-0 space-y-2 border-b border-border px-4 py-3 pr-12 text-left">
                <DialogTitle className="text-base font-semibold">{dialogTitle}</DialogTitle>
                <DialogDescription className="text-xs text-foreground/70">{dialogSub}</DialogDescription>

                {showOgBlock ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {COACH_ASSISTANT_COPY.ARTIFACT_LINK_PREVIEW_LABEL}
                    </p>
                    <div className="mt-2 overflow-hidden rounded-md border border-border bg-card text-left shadow-sm">
                      <div className="flex aspect-[1200/630] max-h-28 items-center justify-center bg-muted px-2 sm:max-h-32">
                        <span className="text-center text-[10px] text-muted-foreground">
                          {COACH_ASSISTANT_COPY.ARTIFACT_LINK_PREVIEW_IMAGE_NOTE}
                        </span>
                      </div>
                      <div className="space-y-1 p-2.5">
                        <p className="text-xs font-semibold leading-snug text-foreground line-clamp-2">{ogTitlePreview}</p>
                        <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">{ogDescPreview}</p>
                        <p className="truncate text-[10px] text-muted-foreground/80">{url}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-sm text-xs"
                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {COACH_ASSISTANT_COPY.ARTIFACT_OPEN_NEW_TAB}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm text-xs" onClick={() => void handleCopyLink()}>
                    {COACH_ASSISTANT_COPY.ARTIFACT_COPY_LINK}
                  </Button>
                  {showSocialActions ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-sm text-xs"
                        onClick={() => void handleCopySocialCaption()}
                      >
                        {COACH_ASSISTANT_COPY.ARTIFACT_COPY_SOCIAL_CAPTION}
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm text-xs" onClick={handleFacebookShare}>
                        {COACH_ASSISTANT_COPY.ARTIFACT_OPEN_FACEBOOK}
                      </Button>
                    </>
                  ) : null}
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm text-xs" onClick={() => setShareDialogOpen(true)}>
                    {COACH_ASSISTANT_COPY.ARTIFACT_SHARE_MORE}
                  </Button>
                </div>
              </DialogHeader>

              <div className="relative min-h-0 flex-1 bg-muted/20 dark:bg-muted/10">
                {revoked ? (
                  <p className="p-6 text-sm text-foreground/80">{COACH_ASSISTANT_COPY.ARTIFACT_REVOKED}</p>
                ) : (
                  <>
                    {!iframeLoaded && (
                      <div
                        className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background/80 text-sm text-foreground/70"
                        aria-busy
                      >
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                        {COACH_ASSISTANT_COPY.ARTIFACT_LOADING_PREVIEW}
                      </div>
                    )}
                    <iframe
                      title={dialogTitle}
                      src={url}
                      className="h-full min-h-[min(50vh,420px)] w-full border-0 bg-background"
                      onLoad={() => setIframeLoaded(true)}
                    />
                  </>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ShareWithClientReportDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        shareLoading={false}
        onCopyLink={() => void handleCopyLink()}
        onEmailLink={() => handleEmailLink()}
        onSystemShare={() => void handleSystemShare()}
        onWhatsAppShare={() => handleWhatsAppShare()}
        socialHint={COACH_ASSISTANT_COPY.SHARE_DIALOG_SOCIAL_HINT}
        onCopySocialCaption={() => void handleCopySocialCaption()}
        onFacebookShare={handleFacebookShare}
        assessmentId={assessmentIdForSocial}
        socialShareGenerating={socialShareGenerating}
        socialShareArtifacts={socialShareArtifacts}
        onGenerateSocialShareArtifacts={handleGenerateSocialShareArtifacts}
      />
    </>
  );
}
