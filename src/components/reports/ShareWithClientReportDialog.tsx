/**
 * Share actions for coach-facing assessment / client report surfaces.
 */

import { Share2, Link as LinkIcon, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ShareWithClientReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareLoading: boolean;
  onCopyLink: () => void | Promise<void>;
  onEmailLink: () => void | Promise<void>;
  onSystemShare: () => void | Promise<void>;
  onWhatsAppShare: () => void | Promise<void>;
}

export function ShareWithClientReportDialog({
  open,
  onOpenChange,
  shareLoading,
  onCopyLink,
  onEmailLink,
  onSystemShare,
  onWhatsAppShare,
}: ShareWithClientReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Share with client</DialogTitle>
          <DialogDescription>
            Copy the report link, send by email, or open in WhatsApp.
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
