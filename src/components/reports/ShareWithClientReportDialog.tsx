/**
 * Share actions for coach-facing assessment / client report surfaces.
 */

import {
  Share2,
  Link as LinkIcon,
  Link2,
  Mail,
  MessageCircle,
  Facebook,
  Type,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import { SOCIAL_SHARE_ARTIFACTS_COPY } from '@/constants/socialShareArtifactsCopy';
import type { SocialShareArtifacts } from '@/constants/socialShareArtifacts';
import { useToast } from '@/hooks/use-toast';
import { UI_TOASTS } from '@/constants/ui';
import { copyTextToClipboard } from '@/lib/utils/clipboard';
import { logger } from '@/lib/utils/logger';

export interface ShareWithClientReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareLoading: boolean;
  onCopyLink: () => void | Promise<void>;
  onEmailLink: () => void | Promise<void>;
  onSystemShare: () => void | Promise<void>;
  onWhatsAppShare: () => void | Promise<void>;
  /** Shown under the main description (e.g. Instagram / Facebook tips). */
  socialHint?: string;
  onCopySocialCaption?: () => void | Promise<void>;
  onFacebookShare?: () => void;
  /** When set with onGenerateSocialShareArtifacts, shows social image section. */
  assessmentId?: string;
  socialShareGenerating?: boolean;
  socialShareArtifacts?: SocialShareArtifacts | null;
  onGenerateSocialShareArtifacts?: () => void | Promise<void>;
}

export function ShareWithClientReportDialog({
  open,
  onOpenChange,
  shareLoading,
  onCopyLink,
  onEmailLink,
  onSystemShare,
  onWhatsAppShare,
  socialHint,
  onCopySocialCaption,
  onFacebookShare,
  assessmentId,
  socialShareGenerating = false,
  socialShareArtifacts = null,
  onGenerateSocialShareArtifacts,
}: ShareWithClientReportDialogProps) {
  const { toast } = useToast();
  const showSocialSection = Boolean(assessmentId && onGenerateSocialShareArtifacts);

  const copyImageLink = (url: string) => {
    void (async () => {
      try {
        await copyTextToClipboard(url);
        toast({
          title: UI_TOASTS.SUCCESS.LINK_COPIED,
          description: UI_TOASTS.SUCCESS.LINK_COPIED_DESC,
        });
      } catch (e) {
        logger.warn('[ShareWithClientReportDialog] copy image url failed', e);
        toast({ title: UI_TOASTS.ERROR.COPY_FAILED, variant: 'destructive' });
      }
    })();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[min(90vh,720px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share with client</DialogTitle>
          <DialogDescription>
            Copy the report link, send by email, or open in WhatsApp.
            {socialHint ? ` ${socialHint}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            className="justify-start gap-2 h-11"
            onClick={() => {
              void onCopyLink();
              onOpenChange(false);
            }}
            disabled={shareLoading}
          >
            <LinkIcon className="h-4 w-4" />
            Copy link
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2 h-11"
            onClick={() => {
              void onEmailLink();
              onOpenChange(false);
            }}
            disabled={shareLoading}
          >
            <Mail className="h-4 w-4" />
            Email report
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2 h-11"
            onClick={() => {
              void onSystemShare();
              onOpenChange(false);
            }}
            disabled={shareLoading}
          >
            <Share2 className="h-4 w-4" />
            Share (device)
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2 h-11"
            onClick={() => {
              void onWhatsAppShare();
              onOpenChange(false);
            }}
            disabled={shareLoading}
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
          {onCopySocialCaption ? (
            <Button
              variant="outline"
              className="justify-start gap-2 h-11"
              onClick={() => {
                void onCopySocialCaption();
                onOpenChange(false);
              }}
              disabled={shareLoading}
            >
              <Type className="h-4 w-4" />
              {COACH_ASSISTANT_COPY.ARTIFACT_COPY_SOCIAL_CAPTION}
            </Button>
          ) : null}
          {onFacebookShare ? (
            <Button
              variant="outline"
              className="justify-start gap-2 h-11"
              onClick={() => {
                onFacebookShare();
                onOpenChange(false);
              }}
              disabled={shareLoading}
            >
              <Facebook className="h-4 w-4" />
              {COACH_ASSISTANT_COPY.ARTIFACT_OPEN_FACEBOOK}
            </Button>
          ) : null}

          {showSocialSection ? (
            <div className="mt-3 space-y-3 border-t border-border pt-4">
              <div className="flex items-start gap-2">
                <ImageIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {SOCIAL_SHARE_ARTIFACTS_COPY.SECTION_TITLE}
                  </p>
                  <p className="text-xs text-muted-foreground">{SOCIAL_SHARE_ARTIFACTS_COPY.SECTION_DESC}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full h-11"
                onClick={() => {
                  void onGenerateSocialShareArtifacts?.();
                }}
                disabled={socialShareGenerating}
              >
                {socialShareGenerating
                  ? SOCIAL_SHARE_ARTIFACTS_COPY.GENERATING
                  : SOCIAL_SHARE_ARTIFACTS_COPY.GENERATE}
              </Button>
              {socialShareArtifacts ? (
                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
                  <SocialImageRow
                    label={SOCIAL_SHARE_ARTIFACTS_COPY.OG_LABEL}
                    url={socialShareArtifacts.og1200x630Url}
                    onCopy={() => copyImageLink(socialShareArtifacts.og1200x630Url)}
                  />
                  <SocialImageRow
                    label={SOCIAL_SHARE_ARTIFACTS_COPY.SQUARE_LABEL}
                    url={socialShareArtifacts.square1080Url}
                    onCopy={() => copyImageLink(socialShareArtifacts.square1080Url)}
                  />
                  <SocialImageRow
                    label={SOCIAL_SHARE_ARTIFACTS_COPY.STORY_LABEL}
                    url={socialShareArtifacts.story1080x1920Url}
                    onCopy={() => copyImageLink(socialShareArtifacts.story1080x1920Url)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SocialImageRow({
  label,
  url,
  onCopy,
}: {
  label: string;
  url: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={onCopy}>
          <Link2 className="h-3.5 w-3.5 mr-1" aria-hidden />
          {SOCIAL_SHARE_ARTIFACTS_COPY.COPY_IMAGE_LINK}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-9" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            {SOCIAL_SHARE_ARTIFACTS_COPY.OPEN_IMAGE}
          </a>
        </Button>
      </div>
    </div>
  );
}
