import { CheckCircle, Clock, Droplets, Shirt, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PWA_UI_COPY } from '@/constants/pwaUiCopy';

export function RemoteIntakeSuccess() {
  return (
    <div className="mx-auto max-w-md space-y-8 px-4 py-10">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
          <CheckCircle className="h-9 w-9 text-emerald-600 dark:text-emerald-400" aria-hidden />
        </div>
        <h2 className="text-xl font-bold text-foreground">You&apos;re all set</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your coach has your answers and posture photos. They&apos;ll review everything before your
          studio session.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">What happens next</h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Your coach reviews your intake and prepares your session.</li>
          <li>They&apos;ll confirm your appointment and any follow-up questions.</li>
          <li>In studio: body composition on our equipment, plus fitness tests with your coach.</li>
        </ol>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Before you arrive</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Shirt className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            Wear comfortable, form-fitting workout clothes.
          </p>
          <p className="flex items-start gap-2">
            <Clock className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            Avoid large meals for 2 hours before your session.
          </p>
          <p className="flex items-start gap-2">
            <Droplets className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            Stay hydrated on the day of your visit.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{PWA_UI_COPY.installTitle}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{PWA_UI_COPY.installBody}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Add One Assess to your home screen now — you&apos;ll use it for future check-ins and your AXIS
          report after assessments.
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-2xl h-11 text-base"
          onClick={() => {
            window.dispatchEvent(new Event('oneassess-show-install-prompt'));
          }}
        >
          {PWA_UI_COPY.installCta}
        </Button>
      </div>
    </div>
  );
}
