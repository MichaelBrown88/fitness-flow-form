/**
 * Parse Gemini JSON assistant replies into thread blocks + enrich charts from roster data.
 */

import { getPillarLabel } from '@/constants/pillars';
import {
  resolveAssistantActionPath,
  type AssistantActionIds,
} from '@/constants/coachAssistantActionRoutes';
import type { ClientGroup } from '@/hooks/dashboard/types';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import type {
  AssistantChartVisual,
  CoachAssistantActionButton,
  CoachAssistantBlock,
  CoachAssistantActionUnion,
} from '@/types/coachAssistant';

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const body = fence ? fence[1].trim() : trimmed;

  const attempt = (s: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(s) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* fall through */
    }
    return null;
  };

  const direct = attempt(body);
  if (direct) return direct;

  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return attempt(body.slice(start, end + 1));
  }
  return null;
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findClientByVisualTitle(title: string, clients: ClientGroup[]): ClientGroup | null {
  const t = normalizeName(title);
  if (!t) return null;
  for (const c of clients) {
    const display = normalizeName(formatClientDisplayName(c.name));
    const raw = normalizeName(c.name);
    if (t.includes(display) || t.includes(raw) || display.includes(t) || raw.includes(t)) {
      return c;
    }
  }
  return null;
}

function isRadarBarLineVisual(v: Record<string, unknown>): v is Extract<
  AssistantChartVisual,
  { type: 'radar_chart' | 'bar_chart' | 'line_chart' }
> {
  const t = v.type;
  if (t !== 'radar_chart' && t !== 'bar_chart' && t !== 'line_chart') return false;
  const data = v.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.labels) || !d.labels.every((x) => typeof x === 'string')) return false;
  if (!Array.isArray(d.datasets)) return false;
  for (const ds of d.datasets) {
    if (!ds || typeof ds !== 'object') return false;
    const row = ds as Record<string, unknown>;
    if (typeof row.label !== 'string' || !Array.isArray(row.data)) return false;
    if (!row.data.every((n) => typeof n === 'number' && Number.isFinite(n))) return false;
  }
  return typeof v.title === 'string';
}

function coerceDataTableVisual(v: Record<string, unknown>): Extract<AssistantChartVisual, { type: 'data_table' }> | null {
  if (v.type !== 'data_table' || typeof v.title !== 'string') return null;
  const data = v.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.columns) || d.columns.length === 0 || !d.columns.every((x) => typeof x === 'string')) {
    return null;
  }
  if (!Array.isArray(d.rows)) return null;
  const columns = d.columns as string[];
  const colCount = columns.length;
  const rows: Array<Array<string | number>> = [];
  for (const row of d.rows) {
    if (!Array.isArray(row)) continue;
    const out: Array<string | number> = [];
    for (let i = 0; i < colCount; i += 1) {
      const cell = row[i];
      if (typeof cell === 'number' && Number.isFinite(cell)) {
        out.push(cell);
      } else if (typeof cell === 'string') {
        out.push(cell);
      } else if (cell === null || cell === undefined) {
        out.push('');
      } else {
        out.push(String(cell));
      }
    }
    rows.push(out);
  }
  if (rows.length === 0) return null;
  return { type: 'data_table', title: v.title.trim(), data: { columns, rows } };
}

function isStatCardsVisual(v: Record<string, unknown>): v is Extract<AssistantChartVisual, { type: 'stat_cards' }> {
  if (v.type !== 'stat_cards') return false;
  const data = v.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.cards)) return false;
  for (const c of d.cards) {
    if (!c || typeof c !== 'object') return false;
    const card = c as Record<string, unknown>;
    if (typeof card.label !== 'string') return false;
    if (typeof card.sub !== 'string') return false;
    if (typeof card.value !== 'string' && typeof card.value !== 'number') return false;
  }
  return typeof v.title === 'string';
}

function coerceVisual(visual: unknown, clients: ClientGroup[]): AssistantChartVisual | null {
  if (visual === null || visual === undefined) return null;
  if (typeof visual !== 'object' || Array.isArray(visual)) return null;
  const v = visual as Record<string, unknown>;

  const asTable = coerceDataTableVisual(v);
  if (asTable) return asTable;

  if (v.type === 'radar_chart') {
    const client = typeof v.title === 'string' ? findClientByVisualTitle(v.title, clients) : null;
    const latest = client?.assessments?.[0]?.scoresSummary?.categories;
    if (client && latest && latest.length > 0) {
      const assessed = latest.filter((c) => c.assessed);
      if (assessed.length > 0) {
        return {
          type: 'radar_chart',
          title: formatClientDisplayName(client.name),
          data: {
            labels: assessed.map((c) => getPillarLabel(c.id)),
            datasets: [{ label: 'AXIS pillar scores', data: assessed.map((c) => c.score) }],
          },
        };
      }
    }
    if (isRadarBarLineVisual(v)) return v;
    return null;
  }

  if (isRadarBarLineVisual(v)) return v;
  if (isStatCardsVisual(v)) return v;
  return null;
}

function extractFetchClientIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (r.intent !== 'fetch_client_data') continue;
    const cid = typeof r.clientId === 'string' ? r.clientId.trim() : '';
    if (cid) ids.push(cid);
  }
  return ids;
}

function mapActions(raw: unknown): CoachAssistantActionUnion[] {
  if (!Array.isArray(raw)) return [];
  const out: CoachAssistantActionUnion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const label = typeof r.label === 'string' ? r.label.trim() : '';
    const intent = typeof r.intent === 'string' ? r.intent.trim() : '';
    const clientId = typeof r.clientId === 'string' ? r.clientId.trim() : null;
    const assessmentId = typeof r.assessmentId === 'string' ? r.assessmentId.trim() : null;
    const variant: 'primary' | 'secondary' = r.style === 'secondary' ? 'secondary' : 'primary';
    if (!label || !intent) continue;

    if (intent === 'fetch_client_data') continue;

    const ids: AssistantActionIds = { clientId, assessmentId };

    if (intent === 'start_assessment' && clientId) {
      out.push({ kind: 'start_assessment', label, clientName: clientId, variant });
      continue;
    }

    const to = resolveAssistantActionPath(intent, ids);
    if (to) {
      out.push({ kind: 'navigate', label, to, variant });
    }
  }
  return out;
}

export type ParsedAssistantModelOutput = {
  blocks: CoachAssistantBlock[];
  fetchClientIds: string[];
};

/**
 * Turn model output into blocks. If JSON parse fails, returns a single text block with the raw string.
 */
export function modelOutputToAssistantBlocks(
  rawModelText: string,
  clients: ClientGroup[],
): ParsedAssistantModelOutput {
  const trimmed = rawModelText.trim();
  const obj = tryParseJsonObject(trimmed);

  if (!obj) {
    return {
      blocks: [{ type: 'text', content: trimmed.length > 0 ? trimmed : '…' }],
      fetchClientIds: [],
    };
  }

  const fetchClientIds = extractFetchClientIds(obj.actions);

  const message = typeof obj.message === 'string' ? obj.message.trim() : '';
  const visual = coerceVisual(obj.visual, clients);
  const actions = mapActions(obj.actions);

  const blocks: CoachAssistantBlock[] = [];
  if (message.length > 0) {
    blocks.push({ type: 'text', content: message });
  }
  if (visual) {
    blocks.push({ type: 'visual', visual });
  }
  if (actions.length > 0) {
    blocks.push({ type: 'actions', actions });
  }

  if (blocks.length === 0) {
    return {
      blocks: [{ type: 'text', content: trimmed.length > 0 ? trimmed : '…' }],
      fetchClientIds,
    };
  }

  return { blocks, fetchClientIds };
}
