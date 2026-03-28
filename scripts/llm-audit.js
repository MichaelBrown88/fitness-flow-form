#!/usr/bin/env node
/**
 * GitHub Actions: chunk .ts/.tsx under AUDIT_SCOPE, call Anthropic Haiku per chunk,
 * merge findings, write audit-results/llm-findings.json, POST tasks to Supabase.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'audit-results');
const OUT_FILE = path.join(OUT_DIR, 'llm-findings.json');

const MODEL = 'claude-haiku-4-5-20251001';
const CHUNK_SIZE = 3;
const MAX_CHARS_PER_FILE = 12000;

const SYSTEM = `You are a code auditor. For each issue found respond with JSON only:
{"findings": [{"file": "", "line": 0, "severity": "CRITICAL|HIGH|MEDIUM|LOW", "issue": "", "cursor_prompt": ""}]}
If there are no issues, return {"findings": []}.
Do not wrap in markdown fences. Output raw JSON only.`;

function getEnv(name, fallback = '') {
  const v = process.env[name];
  return v != null && String(v).trim() !== '' ? String(v).trim() : fallback;
}

/**
 * @param {string} scopeDir
 * @returns {Promise<string[]>}
 */
async function collectTsFiles(scopeDir) {
  const abs = path.join(REPO_ROOT, scopeDir);
  /** @type {string[]} */
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
        await walk(full);
      } else if (/\.(tsx?)$/i.test(e.name)) {
        out.push(full);
      }
    }
  }
  await walk(abs);
  return out.sort();
}

/**
 * @param {string[]} arr
 * @param {number} size
 * @returns {string[][]}
 */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * @param {string} text
 * @returns {Record<string, unknown> | null}
 */
function parseJsonLoose(text) {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(t.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/**
 * @param {unknown} o
 * @returns {{ file: string, line: number, severity: string, issue: string, cursor_prompt: string }[]}
 */
function normalizeFindings(o) {
  if (!o || typeof o !== 'object') return [];
  const raw = o.findings;
  if (!Array.isArray(raw)) return [];
  /** @type {{ file: string, line: number, severity: string, issue: string, cursor_prompt: string }[]} */
  const out = [];
  for (const f of raw) {
    if (!f || typeof f !== 'object') continue;
    const file = typeof f.file === 'string' ? f.file : '';
    const line = typeof f.line === 'number' && Number.isFinite(f.line) ? Math.max(0, Math.floor(f.line)) : 0;
    const severity = typeof f.severity === 'string' ? f.severity.toUpperCase() : 'MEDIUM';
    const issue = typeof f.issue === 'string' ? f.issue : '';
    const cursor_prompt = typeof f.cursor_prompt === 'string' ? f.cursor_prompt : '';
    if (!file && !issue) continue;
    out.push({ file, line, severity, issue, cursor_prompt });
  }
  return out;
}

/**
 * @param {string} sev
 */
function severityToPriority(sev) {
  const s = String(sev).toUpperCase();
  if (s === 'CRITICAL') return 'critical';
  if (s === 'HIGH') return 'high';
  if (s === 'LOW') return 'low';
  return 'medium';
}

/**
 * @param {{ file: string, line: number, severity: string, issue: string, cursor_prompt: string }} f
 */
function taskTitle(f) {
  const loc = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : 'finding';
  const bit = (f.issue || 'Audit finding').slice(0, 120);
  return `[LLM audit] ${loc} — ${bit}`;
}

/**
 * @param {{ file: string, line: number, severity: string, issue: string, cursor_prompt: string }} f
 */
function taskDescription(f) {
  const parts = [];
  if (f.issue) parts.push(`Issue:\n${f.issue}`);
  if (f.cursor_prompt) parts.push(`Cursor prompt:\n${f.cursor_prompt}`);
  return parts.join('\n\n') || '(no detail)';
}

/**
 * @param {string} baseUrl
 * @param {string} serviceKey
 * @param {string} project
 * @param {ReturnType<typeof normalizeFindings>} findings
 */
async function postTasksToSupabase(baseUrl, serviceKey, project, findings) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/tasks`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Prefer: 'return=minimal'
  };

  for (const f of findings) {
    const full = {
      project,
      title: taskTitle(f).slice(0, 500),
      status: 'todo',
      priority: severityToPriority(f.severity),
      epic_id: 'audit-llm',
      agent_owner: 'cto',
      tags: ['llm-audit', f.file || 'unknown'].filter(Boolean),
      description: taskDescription(f).slice(0, 8000)
    };

    let res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(full) });
    if (!res.ok) {
      const errText = await res.text();
      console.warn('[llm-audit] Full task insert failed, retrying minimal row:', res.status, errText.slice(0, 400));
      const minimal = {
        project: full.project,
        title: full.title,
        status: full.status,
        priority: full.priority,
        epic_id: full.epic_id,
        agent_owner: full.agent_owner,
        tags: full.tags
      };
      res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(minimal) });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('[llm-audit] Supabase task insert failed:', res.status, errText.slice(0, 2000));
      throw new Error(`Supabase tasks insert failed: ${res.status}`);
    }
  }
}

/**
 * @param {string} apiKey
 * @param {string} userContent
 */
async function callAnthropic(apiKey, userContent) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }]
    })
  });

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Anthropic non-JSON response: ${raw.slice(0, 500)}`);
  }

  if (!res.ok) {
    const msg = data?.error?.message || raw.slice(0, 500);
    throw new Error(`Anthropic API error ${res.status}: ${msg}`);
  }

  const blocks = data.content;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('');
}

async function main() {
  const apiKey = getEnv('ANTHROPIC_API_KEY');
  const supabaseUrl = getEnv('SUPABASE_URL');
  const supabaseKey = getEnv('SUPABASE_SERVICE_KEY');
  const scope = getEnv('AUDIT_SCOPE', 'src/').replace(/\/+$/, '') || 'src';
  const project = getEnv('PROJECT_SLUG', 'one-assess');

  await fs.mkdir(OUT_DIR, { recursive: true });

  if (!apiKey) {
    console.error('[llm-audit] Missing ANTHROPIC_API_KEY');
    process.exit(1);
  }

  const files = await collectTsFiles(scope);
  console.log(`[llm-audit] Scope ${scope}: ${files.length} TypeScript files`);

  /** @type {{ file: string, line: number, severity: string, issue: string, cursor_prompt: string }[]} */
  const allFindings = [];
  const chunks = chunk(files, CHUNK_SIZE);
  let chunkIndex = 0;

  for (const group of chunks) {
    chunkIndex += 1;
    const parts = [];
    for (const abs of group) {
      const rel = path.relative(REPO_ROOT, abs).split(path.sep).join('/');
      let body = '';
      try {
        body = await fs.readFile(abs, 'utf8');
      } catch (e) {
        body = `<<read error: ${e instanceof Error ? e.message : String(e)}>>`;
      }
      if (body.length > MAX_CHARS_PER_FILE) {
        body = body.slice(0, MAX_CHARS_PER_FILE) + '\n... [truncated for audit]';
      }
      parts.push(`FILE: ${rel}\n${'='.repeat(60)}\n${body}`);
    }

    const userContent =
      `Audit these files together. Report issues as specified in your system instructions.\n\n${parts.join('\n\n')}`;

    console.log(`[llm-audit] Chunk ${chunkIndex}/${chunks.length} (${group.length} files)`);
    const text = await callAnthropic(apiKey, userContent);
    const parsed = parseJsonLoose(text);
    const findings = normalizeFindings(parsed);
    allFindings.push(...findings);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    scope,
    model: MODEL,
    chunkSize: CHUNK_SIZE,
    filesScanned: files.length,
    chunks: chunks.length,
    findings: allFindings
  };

  await fs.writeFile(OUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[llm-audit] Wrote ${OUT_FILE} (${allFindings.length} findings)`);

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[llm-audit] Skipping Supabase (missing SUPABASE_URL or SUPABASE_SERVICE_KEY)');
    return;
  }

  if (allFindings.length === 0) {
    console.log('[llm-audit] No findings to post to Supabase');
    return;
  }

  await postTasksToSupabase(supabaseUrl, supabaseKey, project, allFindings);
  console.log(`[llm-audit] Posted ${allFindings.length} tasks to Supabase (project=${project})`);
}

main().catch((e) => {
  console.error('[llm-audit]', e);
  process.exit(1);
});
