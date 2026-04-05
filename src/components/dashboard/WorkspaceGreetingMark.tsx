import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface WorkspaceGreetingMarkProps {
  className?: string;
}

/**
 * Product favicon or org logo for the main workspace greeting row (not the header).
 */
export function WorkspaceGreetingMark({ className }: WorkspaceGreetingMarkProps) {
  const { orgSettings } = useAuth();
  const customBrandingEnabled =
    orgSettings?.customBrandingEnabled === true || orgSettings?.customBrandingEnabled === undefined;
  const rawLogo = orgSettings?.logoUrl?.trim();
  const logoUrl =
    customBrandingEnabled && rawLogo && rawLogo.length > 0 ? rawLogo : null;

  return (
    <img
      src={logoUrl ?? '/favicon.svg'}
      alt=""
      className={cn('h-9 w-9 shrink-0 object-contain', className)}
      width={36}
      height={36}
      decoding="async"
    />
  );
}
