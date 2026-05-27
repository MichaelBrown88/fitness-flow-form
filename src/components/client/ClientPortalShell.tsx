import { Link, useLocation } from 'react-router-dom';
import { FileText, Map, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ClientPortalTab = 'axis' | 'arc' | 'wins';

const TAB_META: Record<
  ClientPortalTab,
  { label: string; subtitle?: string; path: (token: string) => string; icon: typeof FileText }
> = {
  axis: {
    label: 'AXIS',
    subtitle: 'Your report',
    path: (t) => `/r/${t}`,
    icon: FileText,
  },
  arc: { label: 'ARC', subtitle: 'Your journey', path: (t) => `/r/${t}/roadmap`, icon: Map },
  wins: {
    label: 'Milestones',
    subtitle: 'Your progress',
    path: (t) => `/r/${t}/achievements`,
    icon: Trophy,
  },
};

export interface ClientPortalShellProps {
  token: string;
  activeTab: ClientPortalTab;
  children: React.ReactNode;
}

export function ClientPortalShell({ token, activeTab, children }: ClientPortalShellProps) {
  const location = useLocation();

  return (
    <div className="min-h-0 flex flex-col">
      <div className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">{children}</div>
      <nav
        className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom,0px)]"
        aria-label="Client portal"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
          {(Object.keys(TAB_META) as ClientPortalTab[]).map((tab) => {
            const { label, path, icon: Icon } = TAB_META[tab];
            const subtitle = TAB_META[tab].subtitle;
            const href = path(token);
            const isActive =
              tab === activeTab ||
              (tab === 'axis' && location.pathname === `/r/${token}`);
            return (
              <Link
                key={tab}
                to={href}
                className={cn(
                  'relative flex flex-1 flex-col items-center gap-0 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors touch-manipulation',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
                title={subtitle}
              >
                {isActive ? (
                  <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                ) : null}
                <Icon className="h-5 w-5" aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
