/* eslint-disable react-refresh/only-export-components -- mobile tab config co-located with nav components */
import React from 'react';
import { Activity, BarChart3, Heart, Map } from 'lucide-react';

export const MOBILE_TAB_IDS = ['overview', 'analysis', 'movement', 'plan'] as const;
export type MobileTabId = (typeof MOBILE_TAB_IDS)[number];

export const MOBILE_TAB_META: Record<MobileTabId, { label: string; icon: React.ElementType }> = {
  overview: { label: 'Overview', icon: Activity },
  analysis: { label: 'Analysis', icon: BarChart3 },
  movement: { label: 'Movement', icon: Heart },
  plan: { label: 'Your Plan', icon: Map },
};

export function ActionPlanCTA({ clientName, standalone }: { clientName: string; standalone: boolean }) {
  if (standalone) {
    return (
      <div className="space-y-4 rounded-xl border border-gradient-medium/50 bg-gradient-to-br from-gradient-light via-white to-white p-8 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
          <Map className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Your Personalised Plan</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Your coach is building a personalised roadmap based on your assessment results. You&apos;ll be notified when
          it&apos;s ready to view.
        </p>
      </div>
    );
  }

  const roadmapUrl = `/coach/clients/${encodeURIComponent(clientName)}/roadmap`;
  return (
    <div className="space-y-3 rounded-xl border border-gradient-medium/50 bg-gradient-to-br from-gradient-light via-white to-white p-6 text-center">
      <Map className="mx-auto h-8 w-8 text-primary" />
      <h3 className="text-lg font-bold text-foreground">Client Roadmap</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Create or review this client&apos;s personalised action plan based on the assessment findings.
      </p>
      <a
        href={roadmapUrl}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
      >
        <Map className="h-4 w-4" />
        View Roadmap
      </a>
    </div>
  );
}

export interface MobileReportNavProps {
  activeTab: MobileTabId;
  onSelect: (id: MobileTabId) => void;
}

export function MobileReportNav({ activeTab, onSelect }: MobileReportNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)] pb-2 safe-area-pb md:hidden">
      <div className="flex items-stretch justify-around px-3">
        {MOBILE_TAB_IDS.map((id) => {
          const { icon: Icon, label } = MOBILE_TAB_META[id];
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`relative flex-1 flex flex-col items-center gap-1 py-3 transition-colors touch-manipulation ${
                isActive ? 'text-primary' : 'text-foreground-tertiary active:text-muted-foreground'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
              <Icon className={`h-[22px] w-[22px] ${isActive ? 'text-primary' : ''}`} />
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.15em] leading-tight ${
                  isActive ? 'text-primary' : 'text-foreground-tertiary'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileTabTitleBar({ activeTab }: { activeTab: MobileTabId }) {
  const { icon: TabIcon, label } = MOBILE_TAB_META[activeTab];
  return (
    <div className="flex items-center gap-2 py-1.5">
      <TabIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <h3 className="text-xs font-semibold text-foreground">{label}</h3>
    </div>
  );
}
