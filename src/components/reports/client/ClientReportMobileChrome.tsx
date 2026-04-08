/* eslint-disable react-refresh/only-export-components -- mobile tab config co-located with nav components */
import React from 'react';
import { Activity, Scale, Dumbbell, Heart, Zap, Sun } from 'lucide-react';
import { SECTION_IDS, type SectionId } from './clientReportSections';

export type MobileTabId = SectionId;
export const MOBILE_TAB_IDS = SECTION_IDS;

export const MOBILE_TAB_META: Record<MobileTabId, { label: string; icon: React.ElementType }> = {
  'starting-point': { label: 'Overview', icon: Activity },
  'body-comp': { label: 'Body', icon: Scale },
  strength: { label: 'Strength', icon: Dumbbell },
  cardio: { label: 'Cardio', icon: Heart },
  'movement-quality': { label: 'Movement', icon: Zap },
  lifestyle: { label: 'Lifestyle', icon: Sun },
};

export interface MobileReportNavProps {
  activeTab: MobileTabId;
  onSelect: (id: MobileTabId) => void;
}

export function MobileReportNav({ activeTab, onSelect }: MobileReportNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)] pb-2 safe-area-pb md:hidden">
      <div className="flex items-stretch justify-around px-1">
        {MOBILE_TAB_IDS.map((id) => {
          const { icon: Icon, label } = MOBILE_TAB_META[id];
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`relative flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors touch-manipulation ${
                isActive ? 'text-primary' : 'text-foreground-tertiary active:text-muted-foreground'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
              )}
              <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-primary' : ''}`} />
              <span
                className={`text-[9px] font-bold uppercase tracking-[0.1em] leading-tight ${
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
