/**
 * Encapsulates report share logic: ensure share artifacts, copy link, email, system share, WhatsApp.
 * Used by AssessmentReport and ShareReportModal.
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { requestShareArtifacts, sendReportEmail, type ShareArtifacts } from '@/services/share';
import { UI_TOASTS } from '@/constants/ui';
import { logger } from '@/lib/utils/logger';
import { copyTextToClipboard } from '@/lib/utils/clipboard';
import type { FormData } from '@/contexts/FormContext';
import type { UserProfile } from '@/types/auth';

export interface UseReportShareParams {
  assessmentId: string | undefined;
  formData: FormData | null;
  user: { uid: string } | null;
  profile: UserProfile | null;
}

export function useReportShare({ assessmentId: id, formData, user, profile }: UseReportShareParams) {
  const { toast } = useToast();
  const [shareCache, setShareCache] = useState<Record<'client' | 'coach', ShareArtifacts | null>>({
    client: null,
    coach: null,
  });
  const [shareLoading, setShareLoading] = useState(false);

  const ensureShareArtifacts = useCallback(
    async (view: 'client' | 'coach' = 'client') => {
      if (!user || !id || !formData) throw new Error('Missing assessment reference.');
      if (shareCache[view]) return shareCache[view]!;
      const artifacts = await requestShareArtifacts({
        assessmentId: id,
        view,
        coachUid: user.uid,
        formData,
        organizationId: profile?.organizationId,
        profile: profile || null,
      });
      setShareCache((prev) => ({ ...prev, [view]: artifacts }));
      return artifacts;
    },
    [id, shareCache, user, formData, profile?.organizationId],
  );

  const handleCopyLink = useCallback(async () => {
    if (!id || !formData || !user) return;
    try {
      setShareLoading(true);
      const urlPromise = requestShareArtifacts({
        assessmentId: id,
        view: 'client',
        coachUid: user.uid,
        formData,
        organizationId: profile?.organizationId,
        profile: profile || null,
      }).then((a) => a.shareUrl);
      await copyTextToClipboard(urlPromise);
      toast({ title: UI_TOASTS.SUCCESS.LINK_COPIED, description: UI_TOASTS.SUCCESS.LINK_COPIED_DESC });
    } catch (e) {
      logger.error('Copy link failed', e);
      toast({ title: UI_TOASTS.ERROR.COPY_FAILED, variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [id, formData, user, profile?.organizationId, toast]);

  const handleEmailLink = useCallback(async () => {
    if (!formData || !id) return;
    const email = (formData.email || '').trim();
    if (!email) {
      toast({
        title: UI_TOASTS.ERROR.CLIENT_EMAIL_MISSING,
        description: UI_TOASTS.ERROR.CLIENT_EMAIL_MISSING_DESC,
        variant: 'destructive',
      });
      return;
    }
    try {
      setShareLoading(true);
      await sendReportEmail({
        assessmentId: id,
        view: 'client',
        to: email,
        clientName: formData.fullName,
      });
      toast({ title: UI_TOASTS.SUCCESS.REPORT_EMAILED, description: `Sent to ${email}` });
    } catch (e) {
      logger.error('Email share failed', e);
      toast({
        title: UI_TOASTS.ERROR.EMAIL_NOT_SENT,
        description: UI_TOASTS.ERROR.EMAIL_NOT_SENT_DESC,
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [formData, id, toast]);

  const handleSystemShare = useCallback(async () => {
    if (!id || !formData || !user || typeof window === 'undefined') return;
    try {
      setShareLoading(true);
      const artifacts = await requestShareArtifacts({
        assessmentId: id,
        view: 'client',
        coachUid: user.uid,
        formData,
        organizationId: profile?.organizationId,
        profile: profile || null,
      });
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${formData.fullName || 'Client'}'s Fitness Report`,
            text: 'Here is your interactive fitness assessment results.',
            url: artifacts.shareUrl,
          });
          toast({
            title: UI_TOASTS.SUCCESS.SHARED_SUCCESSFULLY,
            description: UI_TOASTS.SUCCESS.SHARED_DESC,
          });
        } catch (shareError) {
          if ((shareError as Error).name !== 'AbortError') {
            logger.error('Share failed:', shareError);
          }
        }
      } else {
        await handleCopyLink();
      }
    } catch (e) {
      logger.error('System share failed', e);
      toast({
        title: UI_TOASTS.ERROR.UNABLE_TO_SHARE,
        description: UI_TOASTS.ERROR.UNABLE_TO_SHARE_DESC,
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [id, formData, user, profile?.organizationId, toast, handleCopyLink]);

  const handleWhatsAppShare = useCallback(async () => {
    if (!id || !formData || !user || typeof window === 'undefined') return;
    try {
      setShareLoading(true);
      const artifacts = await requestShareArtifacts({
        assessmentId: id,
        view: 'client',
        coachUid: user.uid,
        formData,
        organizationId: profile?.organizationId,
        profile: profile || null,
      });
      const url = `https://wa.me/?text=${encodeURIComponent(artifacts.whatsappText)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      logger.error('WhatsApp share failed', e);
      toast({
        title: UI_TOASTS.ERROR.UNABLE_TO_SHARE_WHATSAPP,
        description: UI_TOASTS.ERROR.UNABLE_TO_SHARE_WHATSAPP_DESC,
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [id, formData, user, profile?.organizationId, toast]);

  return {
    ensureShareArtifacts,
    handleCopyLink,
    handleEmailLink,
    handleSystemShare,
    handleWhatsAppShare,
    shareLoading,
  };
}
