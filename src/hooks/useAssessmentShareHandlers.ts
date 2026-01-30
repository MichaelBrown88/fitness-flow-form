import { useCallback } from 'react';
import type { FormData } from '@/contexts/FormContext';
import { sendReportEmail, type ShareArtifacts } from '@/services/share';

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
    try {
      setShareLoading(true);
      let shareUrl = window.location.origin;
      if (user && savingId) {
        await ensureShareArtifacts(view);
        shareUrl = `${window.location.origin}/share/${user.uid}/${savingId}`;
      }
      if (navigator.share) {
        await navigator.share({ title: 'Assessment Report', url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied' });
      }
    } catch (error) {
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
      // Use the share artifacts to get the proper /r/:token URL
      const artifacts = await ensureShareArtifacts(view);
      await navigator.clipboard.writeText(artifacts.shareUrl);
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
