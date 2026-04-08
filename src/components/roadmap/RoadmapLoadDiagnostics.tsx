import { useCallback } from 'react';
import { readRoadmapLoadDebugLog } from '@/services/roadmaps';
import { PUBLIC_CLIENT_URL_QUERY } from '@/constants/routes';
import { UI_PUBLIC_ROADMAP_SUPPORT, UI_TOASTS } from '@/constants/ui';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { copyTextToClipboard } from '@/lib/utils/clipboard';

type RoadmapLoadDiagnosticsProps = {
  variant: 'error' | 'success';
};

/**
 * Opt-in via `?roadmapDebug=1` on the public roadmap URL. Shows ring-buffer JSON from `getRoadmapByShareToken` (no secrets).
 */
export function RoadmapLoadDiagnostics({ variant }: RoadmapLoadDiagnosticsProps) {
  const { toast } = useToast();
  const text = readRoadmapLoadDebugLog();

  const handleCopy = useCallback(() => {
    void (async () => {
      try {
        await copyTextToClipboard(text);
        toast({
          title: UI_TOASTS.SUCCESS.DIAGNOSTICS_COPIED,
          description: UI_TOASTS.SUCCESS.DIAGNOSTICS_COPIED_DESC,
        });
      } catch {
        toast({
          title: UI_TOASTS.ERROR.COPY_FAILED,
          variant: 'destructive',
        });
      }
    })();
  }, [text, toast]);

  if (variant === 'error') {
    return (
      <details className="mt-6 text-left max-w-xl mx-auto rounded-lg border border-border bg-muted/30 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-foreground">ARC™ load diagnostics</summary>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Share this JSON with support. Add{' '}
          <span className="font-mono text-foreground/80">?{PUBLIC_CLIENT_URL_QUERY.ROADMAP_DEBUG}=1</span> to the URL if
          you do not see this block.
        </p>
        <div className="mt-2 flex justify-end">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleCopy}>
            {UI_PUBLIC_ROADMAP_SUPPORT.COPY_DIAGNOSTICS}
          </Button>
        </div>
        <pre className="mt-2 font-mono whitespace-pre-wrap break-all text-muted-foreground max-h-52 overflow-auto">
          {text}
        </pre>
      </details>
    );
  }
  return (
    <details className="mt-8 text-left rounded-lg border border-border bg-muted/30 p-3 text-xs">
      <summary className="cursor-pointer font-medium text-foreground">ARC™ load diagnostics</summary>
      <div className="mt-2 flex justify-end">
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleCopy}>
          {UI_PUBLIC_ROADMAP_SUPPORT.COPY_DIAGNOSTICS}
        </Button>
      </div>
      <pre className="mt-2 font-mono whitespace-pre-wrap break-all text-muted-foreground max-h-40 overflow-auto">
        {text}
      </pre>
    </details>
  );
}
