/**
 * Privacy & sharing settings sheet — accessible from the client profile dropdown.
 * Lets clients toggle socialSharingConsented and monthlyEmailConsented after initial consent.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Share2, Mail } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getClientConsent, writeClientConsent } from '@/services/clientConsent';
import { logger } from '@/lib/utils/logger';

interface ClientConsentSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
}

export function ClientConsentSettings({
  open,
  onOpenChange,
  token,
}: ClientConsentSettingsProps) {
  const [socialSharing, setSocialSharing] = useState<boolean>(false);
  const [monthlyEmail, setMonthlyEmail] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getClientConsent(token)
      .then((prefs) => {
        setSocialSharing(prefs?.socialSharingConsented === true);
        setMonthlyEmail(prefs?.monthlyEmailConsented === true);
      })
      .catch((e) => logger.warn('[ClientConsentSettings] load failed', e))
      .finally(() => setLoading(false));
  }, [open, token]);

  const save = useCallback(
    async (social: boolean, email: boolean) => {
      setSaving(true);
      try {
        await writeClientConsent(token, {
          socialSharingConsented: social,
          monthlyEmailConsented: email,
        });
      } catch (e) {
        logger.warn('[ClientConsentSettings] save failed', e);
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const handleSocialToggle = (checked: boolean) => {
    setSocialSharing(checked);
    void save(checked, monthlyEmail);
  };

  const handleEmailToggle = (checked: boolean) => {
    setMonthlyEmail(checked);
    void save(socialSharing, checked);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">Privacy &amp; sharing</SheetTitle>
          <SheetDescription className="text-sm">
            Control how your results are used. Changes save instantly.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Share2 className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <div className="flex-1 space-y-1 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="toggle-social" className="text-sm font-medium leading-snug">
                    Share my results
                  </Label>
                  <Switch
                    id="toggle-social"
                    checked={socialSharing}
                    onCheckedChange={handleSocialToggle}
                    disabled={saving}
                    aria-label="Allow sharing my results on social media"
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Allows your coach to generate shareable progress cards with your name and
                  scores. You can also share your own wins from your report.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <div className="flex-1 space-y-1 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="toggle-email" className="text-sm font-medium leading-snug">
                    Monthly progress email
                  </Label>
                  <Switch
                    id="toggle-email"
                    checked={monthlyEmail}
                    onCheckedChange={handleEmailToggle}
                    disabled={saving}
                    aria-label="Receive monthly progress summary emails"
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  A monthly summary of your progress, wins, and what&apos;s coming next.
                  Sent to the email your coach has on file.
                </p>
              </div>
            </div>

            {saving && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Saving…
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
