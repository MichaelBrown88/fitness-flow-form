/**
 * DataAssetSummary — Section 1 of the Data Intelligence tab
 *
 * Five headline KPIs that tell the "what do we have?" story at a glance,
 * followed by a single efficacy callout sentence that anchors the M&A pitch.
 */

import { Database, Users, GitBranch, CheckSquare, Calendar } from 'lucide-react';
import type { PopulationAnalytics, DataCompleteness } from '@/types/analytics';

interface KpiTileProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub?: string;
  accent?: boolean;
}

function KpiTile({ icon, value, label, sub, accent }: KpiTileProps) {
  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-2 ${
        accent
          ? 'border-indigo-500/30 bg-indigo-600/10'
          : 'border-admin-border bg-admin-card/50'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        accent ? 'bg-indigo-600/20 text-indigo-400' : 'bg-admin-border/60 text-admin-fg-muted'
      }`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-admin-fg tabular-nums leading-none">{value}</p>
        <p className="text-xs font-medium text-admin-fg mt-1">{label}</p>
        {sub && <p className="text-[11px] text-admin-fg-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

interface Props {
  populationData: PopulationAnalytics;
  efficacyPct: number | null;
  dataCompleteness: DataCompleteness | undefined;
}

export function DataAssetSummary({ populationData, efficacyPct, dataCompleteness }: Props) {
  const totalSessions = populationData.totalScoredAssessments;
  const uniqueClients =
    populationData.uniqueClientCount ??
    populationData.assessmentPatterns?.uniqueClientCount ??
    0;

  // Longitudinal clients = clients with 2+ sessions (returnRate × uniqueClients)
  const returnRate = dataCompleteness?.returnRate ?? null;
  const longitudinalClients =
    returnRate !== null ? Math.round((returnRate / 100) * uniqueClients) : null;

  // Data quality %
  const completeness = dataCompleteness?.pct5Pillars ?? null;

  // Platform span — earliest session to today
  const spanLabel = (() => {
    const earliest = populationData.earliestSessionDate;
    if (!earliest) return null;
    const start = new Date(earliest);
    const now = new Date();
    const months =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());
    if (months < 1) return 'Less than a month';
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
    const yrs = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${yrs}y ${rem}mo` : `${yrs} year${yrs !== 1 ? 's' : ''}`;
  })();

  // MoM trend — compare last two months in monthlyAssessmentVolume
  const momLabel = (() => {
    const vol = populationData.monthlyAssessmentVolume ?? {};
    const months = Object.keys(vol).sort();
    if (months.length < 2) return null;
    const last = vol[months[months.length - 1]] ?? 0;
    const prev = vol[months[months.length - 2]] ?? 0;
    if (prev === 0) return null;
    const pct = Math.round(((last - prev) / prev) * 100);
    return pct >= 0 ? `+${pct}% MoM` : `${pct}% MoM`;
  })();

  return (
    <div className="space-y-4">
      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiTile
          icon={<Database className="w-4 h-4" />}
          value={totalSessions.toLocaleString()}
          label="Assessment Sessions"
          sub={momLabel ?? undefined}
        />
        <KpiTile
          icon={<Users className="w-4 h-4" />}
          value={uniqueClients.toLocaleString()}
          label="Unique Clients Assessed"
          sub={completeness !== null ? `${completeness}% full 5-pillar coverage` : undefined}
        />
        <KpiTile
          icon={<GitBranch className="w-4 h-4" />}
          value={longitudinalClients !== null ? longitudinalClients.toLocaleString() : '—'}
          label="Longitudinal Clients"
          sub="2+ sessions — the moat metric"
          accent
        />
        <KpiTile
          icon={<CheckSquare className="w-4 h-4" />}
          value={completeness !== null ? `${completeness}%` : '—'}
          label="Data Completeness"
          sub="Sessions with all 5 pillars scored"
        />
        <KpiTile
          icon={<Calendar className="w-4 h-4" />}
          value={spanLabel ?? '—'}
          label="Platform Data Span"
          sub={populationData.earliestSessionDate
            ? `Since ${populationData.earliestSessionDate}`
            : 'Age of dataset'}
        />
      </div>

      {/* Efficacy callout */}
      {efficacyPct !== null && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4">
          <p className="text-sm text-emerald-300 font-medium leading-relaxed">
            <span className="text-emerald-200 font-bold text-base">{efficacyPct}%</span>
            {' '}of clients who complete two or more assessments show measurable improvement — proof
            that structured, multi-domain tracking translates to better outcomes.
          </p>
        </div>
      )}
    </div>
  );
}
