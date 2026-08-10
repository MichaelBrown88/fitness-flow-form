import { useCallback } from 'react';
import type { FormData } from '@/contexts/FormContext';
import { sendReportEmail, type ShareArtifacts } from '@/services/share';
import { copyTextToClipboard } from '@/lib/utils/clipboard';

type ShareView = 'client' | 'coach';

type ShareHandlersParams = {
  formData: FormData;
  user: { uid: string } | null;
  savingId: string | null;
  ensureShareArtifacts: (view: ShareView) => Promise<ShareArtifacts>;
  setShareLoading: (value: boolean) => void;
  toast: (opts: { title: string; description?: string; variant?: 'destructive' }) => void;
};

export function useAssessmentShareHandlers({
  formData,
  user,
  savingId,
  ensureShareArtifacts,
  setShareLoading,
  toast,
}: ShareHandlersParams) {
  const handleShare = useCallback(async (view: ShareView) => {
    if (!user || !savingId) {
      toast({
        title: 'Report still saving',
        description: 'Give it a moment, then try sharing again.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setShareLoading(true);
      // Share the same public /r/:token URL that Copy link uses — the legacy
      // /share/:uid/:id route no longer exists.
      const artifacts = await ensureShareArtifacts(view);
      if (navigator.share) {
        await navigator.share({ title: 'Assessment Report', url: artifacts.shareUrl });
      } else {
        await copyTextToClipboard(artifacts.shareUrl);
        toast({ title: 'Link copied' });
      }
    } catch (error) {
      // Ignore user-cancelled native share sheets
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast({ title: 'Share failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, savingId, setShareLoading, toast, user]);

  const handleEmailLink = useCallback(async (view: ShareView) => {
    const email = (formData.email || '').trim();
    if (!email) {
      toast({ title: 'Client email missing', variant: 'destructive' });
      return;
    }
    if (!savingId) return;
    try {
      setShareLoading(true);
      await sendReportEmail({ assessmentId: savingId, view, to: email, clientName: formData.fullName });
      toast({ title: 'Report emailed', description: `Sent to ${email}` });
    } catch (error) {
      toast({ title: 'Email failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [formData.email, formData.fullName, savingId, setShareLoading, toast]);

  const handleWhatsAppShare = useCallback(async (view: ShareView) => {
    try {
      setShareLoading(true);
      const artifacts = await ensureShareArtifacts(view);
      window.open(`https://wa.me/?text=${encodeURIComponent(artifacts.whatsappText)}`, '_blank');
    } catch (error) {
      toast({ title: 'WhatsApp share failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, setShareLoading, toast]);

  const handleCopyLink = useCallback(async (view: ShareView) => {
    try {
      setShareLoading(true);
      // Pass a Promise to copyTextToClipboard so Safari preserves the user gesture
      const urlPromise = ensureShareArtifacts(view).then(a => a.shareUrl);
      await copyTextToClipboard(urlPromise);
      toast({ 
        title: 'Link Copied!', 
        description: 'Send this URL to your client. They can view it on any device.' 
      });
    } catch (error) {
      toast({ title: 'Copy failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, setShareLoading, toast]);

  return { handleShare, handleEmailLink, handleWhatsAppShare, handleCopyLink };
}
