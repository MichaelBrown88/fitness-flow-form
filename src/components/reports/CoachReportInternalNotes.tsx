/**
 * CoachReport Key Findings & Priorities
 * Merged Internal Notes + Session Script action items and outlook
 */

import React from 'react';
import { Target, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import type { CoachPlan } from '@/lib/recommendations';

interface CoachReportInternalNotesProps {
  plan: CoachPlan;
}

function ItemCard({
  icon: Icon,
  title,
  items,
  borderClass,
  itemBorderClass,
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
  borderClass: string;
  itemBorderClass?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={`rounded-xl border border-border bg-card p-4 shadow-sm ${borderClass}`}>
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        {title}
      </h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className={`flex gap-2 text-sm text-foreground-secondary ${itemBorderClass ? `pl-3 ${itemBorderClass}` : ''}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CoachReportInternalNotes({ plan }: CoachReportInternalNotesProps) {
  const priorityItems = [...plan.keyIssues, ...plan.internalNotes.needsAttention];
  const hasContent =
    priorityItems.length > 0 ||
    plan.internalNotes.doingWell.length > 0 ||
    plan.clientScript.actionPlan.length > 0 ||
    plan.clientScript.threeMonthOutlook.length > 0;

  if (!hasContent) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary p-2 rounded-lg">
          <Target className="h-5 w-5 text-primary-foreground" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Priorities & limitations</h3>
      </div>

      <div className="space-y-4">
        <ItemCard
          icon={AlertCircle}
          title="Priority Issues"
          items={priorityItems}
          borderClass="border-l-4 border-l-amber-500"
          itemBorderClass="border-l-2 border-l-amber-400/70"
        />
        <ItemCard
          icon={CheckCircle}
          title="Client Strengths"
          items={plan.internalNotes.doingWell}
          borderClass="border-l-4 border-l-green-500"
          itemBorderClass="border-l-2 border-l-green-400/70"
        />
        <ItemCard
          icon={ArrowRight}
          title="Action Items"
          items={plan.clientScript.actionPlan}
          borderClass="border-l-4 border-l-border-medium"
        />
        {plan.clientScript.threeMonthOutlook.length > 0 && (
          <div className="rounded-xl border border-border border-l-4 border-l-primary bg-card p-4 shadow-sm">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              <Target className="h-4 w-4 shrink-0" />
              Outlook
            </h4>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              {plan.clientScript.threeMonthOutlook.join(' ')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
