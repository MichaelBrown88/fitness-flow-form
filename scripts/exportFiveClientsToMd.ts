/**
 * Export assessment inputs + posture storage hints for selected clients.
 * Run: npm run export:clients-md
 *
 * Env: EXPORT_ORG_ID (default: org-ZEdbxasiQ3X3HFCDVwIs6HlHM923)
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Bucket } from '@google-cloud/storage';
import admin from 'firebase-admin';

import { buildFormDataExportLayout, type FormDataExportRow } from '../src/lib/phases/buildFormDataExportLayout';
import { phaseDefinitions } from '../src/lib/phases/index';
import type { PhaseField } from '../src/lib/phases/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const CRED_PATH = join(REPO_ROOT, 'service-account.json');
const OUT_DIR = join(REPO_ROOT, 'docs', 'client-exports');

const DEFAULT_ORG = 'org-ZEdbxasiQ3X3HFCDVwIs6HlHM923';
const ORG_ID = process.env.EXPORT_ORG_ID?.trim() || DEFAULT_ORG;

const TARGET_FIRST_NAMES = new Set([
  'fawaz',
  'hisham',
  'mohammad',
  'michael',
  'noaf',
]);

const STORAGE_BUCKET = 'assessment-engine-8f633.firebasestorage.app';
const POSTURE_VIEWS = ['front', 'back', 'side-left', 'side-right'] as const;

/** Insert after last manual posture multiselect; then OHS, hinge, … match typical flow after AI capture. */
const INSERT_P4_AI_AFTER_FIELD = 'postureKneesOverall';

const P4_AI_STORAGE_FIELDS: { key: string; label: string }[] = [
  { key: 'postureSeverity', label: 'Posture severity (legacy scale)' },
  { key: 'postureForwardHead', label: 'Forward head (legacy)' },
  { key: 'postureRoundedShoulders', label: 'Rounded shoulders (legacy)' },
  { key: 'postureImages', label: 'Posture images (embedded previews)' },
  { key: 'postureImagesStorage', label: 'Posture images (Firebase Storage URLs)' },
  { key: 'postureAiResults', label: 'Posture AI analysis (structured)' },
];

/** Matches `ParQQuestionnaire` visible questions (parq8–11 are legacy schema only). */
const PARQ_YES_NO: NonNullable<PhaseField['options']> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const PARQ_DETAIL_SPEC: { key: string; label: string; conditional?: PhaseField['conditional'] }[] = [
  { key: 'parq1', label: 'PAR-Q — Heart condition / doctor activity restriction' },
  { key: 'parq2', label: 'PAR-Q — Chest pain during activity' },
  { key: 'parq3', label: 'PAR-Q — Chest pain at rest (past month)' },
  { key: 'parq4', label: 'PAR-Q — Balance / dizziness / loss of consciousness' },
  { key: 'parq5', label: 'PAR-Q — Bone or joint problem worsened by activity' },
  { key: 'parq6', label: 'PAR-Q — BP/heart medication prescribed' },
  { key: 'parq7', label: 'PAR-Q — Any other reason to avoid activity' },
  {
    key: 'parq12',
    label: 'PAR-Q — Currently pregnant',
    conditional: { showWhen: { field: 'gender', value: 'female' } },
  },
  {
    key: 'parq13',
    label: 'PAR-Q — Gave birth in last 6 months',
    conditional: { showWhen: { field: 'gender', value: 'female' } },
  },
];

function conditionalDisplayNote(field: PhaseField): string | null {
  const c = field.conditional?.showWhen;
  if (!c || !c.field) return null;
  if (c.value !== undefined) {
    return `_Shown only when **${c.field}** is \`${c.value}\`._`;
  }
  if (c.exists && c.notValue !== undefined) {
    return `_Shown only when **${c.field}** is set and not \`${c.notValue}\`._`;
  }
  if (c.exists) {
    return `_Shown only when **${c.field}** has a value._`;
  }
  if (c.notValue !== undefined) {
    return `_Shown only when **${c.field}** is not \`${c.notValue}\`._`;
  }
  if (c.includes !== undefined) {
    return `_Shown only when **${c.field}** includes \`${c.includes}\`._`;
  }
  return null;
}

function mergeExportLayout(): FormDataExportRow[] {
  let rows = buildFormDataExportLayout();
  const p0 = phaseDefinitions.find((p) => p.id === 'P0');
  const p0Title = p0?.title ?? 'Basic Client Info';

  const parqRows: FormDataExportRow[] = PARQ_DETAIL_SPEC.map(({ key, label, conditional }) => ({
    phaseId: 'P0',
    phaseTitle: p0Title,
    sectionTitle: 'PAR-Q (questionnaire answers)',
    fieldKey: key,
    label,
    field: {
      id: key as never,
      type: 'select',
      label,
      options: PARQ_YES_NO,
      ...(conditional ? { conditional } : {}),
    } as PhaseField,
  }));

  const parqMetaIdx = rows.findIndex((r) => r.fieldKey === 'parqQuestionnaire');
  if (parqMetaIdx !== -1) {
    rows = [...rows.slice(0, parqMetaIdx + 1), ...parqRows, ...rows.slice(parqMetaIdx + 1)];
  } else {
    rows = [...parqRows, ...rows];
  }

  const p4 = phaseDefinitions.find((p) => p.id === 'P4');
  const p4Title = p4?.title ?? 'Movement & Posture';
  const extras: FormDataExportRow[] = P4_AI_STORAGE_FIELDS.map(({ key, label }) => ({
    phaseId: 'P4',
    phaseTitle: p4Title,
    sectionTitle: 'Posture — AI capture & analysis',
    fieldKey: key,
    label,
    field: { id: key as never, type: 'textarea', label } as PhaseField,
  }));

  const idx = rows.findIndex((r) => r.fieldKey === INSERT_P4_AI_AFTER_FIELD);
  if (idx === -1) {
    return [...rows, ...extras];
  }
  return [...rows.slice(0, idx + 1), ...extras, ...rows.slice(idx + 1)];
}

const EXPORT_LAYOUT = mergeExportLayout();
const LAYOUT_KEY_SET = new Set(EXPORT_LAYOUT.map((r) => r.fieldKey));

function firstTokenLower(name: string): string {
  return (name || '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
}

function matchesTarget(clientName: string): boolean {
  if (TARGET_FIRST_NAMES.has(firstTokenLower(clientName))) return true;
  const lower = (clientName || '').toLowerCase();
  for (const t of TARGET_FIRST_NAMES) {
    if (lower.includes(t)) return true;
  }
  return false;
}

function urlToStoragePath(url: string): string | null {
  try {
    const noQuery = url.split('?')[0];
    const marker = '/o/';
    const idx = noQuery.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(noQuery.slice(idx + marker.length));
  } catch {
    return null;
  }
}

function sanitizeForMarkdown(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (
      value.startsWith('data:image') ||
      (value.length > 500 && /^[A-Za-z0-9+/=]+$/.test(value.slice(0, 200)))
    ) {
      return `[omitted binary/base64 string, length ${value.length}]`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeForMarkdown);
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'postureImages' && v && typeof v === 'object') {
        const img: Record<string, string> = {};
        for (const [view, data] of Object.entries(v as Record<string, string>)) {
          const s = typeof data === 'string' ? data : '';
          img[view] =
            s.startsWith('data:') || s.length > 500
              ? `[omitted image, length ${s.length}]`
              : s;
        }
        out[k] = img;
        continue;
      }
      out[k] = sanitizeForMarkdown(v);
    }
    return out;
  }
  return value;
}

function collectPostureRefsFromSession(data: Record<string, unknown>): { storageUrls: string[] } {
  const storageUrls: string[] = [];
  for (const view of POSTURE_VIEWS) {
    for (const key of [`postureImagesStorage_${view}`, `postureImagesFull_${view}`]) {
      const u = data[key];
      if (typeof u === 'string' && u.startsWith('http')) storageUrls.push(u);
    }
  }
  const nested = data.postureImagesStorage;
  if (nested && typeof nested === 'object') {
    for (const u of Object.values(nested as Record<string, unknown>)) {
      if (typeof u === 'string' && u.startsWith('http')) storageUrls.push(u);
    }
  }
  return { storageUrls: [...new Set(storageUrls)] };
}

async function listPrefixFiles(bucket: Bucket, prefix: string): Promise<string[]> {
  const [files] = await bucket.getFiles({ prefix, maxResults: 100 });
  return files.map((f) => f.name);
}

function hasMeaningfulValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') {
    const vals = Object.values(v as Record<string, unknown>);
    return vals.length > 0 && vals.some((x) => hasMeaningfulValue(x));
  }
  return true;
}

function optionLabel(field: PhaseField, raw: string): string {
  const opts = field.options;
  if (!opts) return raw;
  const hit = opts.find((o) => o.value === raw);
  return hit?.label ?? raw;
}

function formatMultiselect(field: PhaseField, arr: unknown): string {
  if (!Array.isArray(arr)) return String(arr);
  return arr.map((v) => optionLabel(field, String(v))).join(', ');
}

function escapeMdInline(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r\n/g, '\n');
}

function formatScalarForList(value: string): string {
  const t = value.trim();
  if (t.length > 200 || t.includes('\n')) {
    return `\n\n  \`\`\`\n  ${escapeMdInline(t).split('\n').join('\n  ')}\n  \`\`\`\n`;
  }
  if (/^[a-z0-9._-]+$/i.test(t) && t.length < 80) {
    return `\`${t}\``;
  }
  return `\`${escapeMdInline(t).replace(/`/g, '\\`')}\``;
}

function formatFieldValue(fieldKey: string, value: unknown, field: PhaseField): string {
  if (fieldKey === 'postureImagesStorage' && value && typeof value === 'object') {
    const o = value as Record<string, string>;
    const parts = Object.keys(o)
      .sort()
      .map((k) => {
        const u = o[k];
        return `  - **${k}:** ${typeof u === 'string' ? u : String(u)}`;
      });
    return parts.length ? `\n${parts.join('\n')}` : '_(empty)_';
  }

  if (fieldKey === 'postureImages' && value && typeof value === 'object') {
    const o = value as Record<string, string>;
    const parts = Object.keys(o)
      .sort()
      .map((k) => {
        const s = o[k];
        const omitted =
          typeof s === 'string' && (s.startsWith('data:') || s.length > 500)
            ? `[omitted image, length ${s.length}]`
            : typeof s === 'string'
              ? s
              : String(s);
        return `  - **${k}:** ${omitted}`;
      });
    return parts.length ? `\n${parts.join('\n')}` : '_(empty)_';
  }

  if (fieldKey === 'postureAiResults' || (typeof value === 'object' && value !== null && !Array.isArray(value))) {
    const sanitized = sanitizeForMarkdown(value);
    const json = JSON.stringify(sanitized, null, 2);
    return `\n\n  \`\`\`json\n  ${json.split('\n').join('\n  ')}\n  \`\`\`\n`;
  }

  if (field.type === 'multiselect' && Array.isArray(value)) {
    const s = formatMultiselect(field, value);
    return s ? formatScalarForList(s) : '_(empty)_';
  }

  if ((field.type === 'select' || field.type === 'choice') && typeof value === 'string') {
    return formatScalarForList(optionLabel(field, value));
  }

  if (typeof value === 'string') {
    return formatScalarForList(value);
  }

  if (Array.isArray(value)) {
    return formatScalarForList(value.join(', '));
  }

  return formatScalarForList(JSON.stringify(value));
}

function renderAssessmentMarkdown(formData: Record<string, unknown>): string[] {
  const lines: string[] = [
    '## Assessment inputs',
    '',
    '_Same order as the coach assessment (phases P0–P7). Only fields with a saved value are listed. Select/multiselect values use the app label. Italic lines under a field describe **conditional visibility** (when the coach would see that input). PAR-Q per-question rows mirror the live questionnaire (including items shown only for **female**)._',
    '',
  ];

  let currentPhase = '';
  let currentSection = '';

  for (const row of EXPORT_LAYOUT) {
    const raw = formData[row.fieldKey];
    if (!hasMeaningfulValue(raw)) continue;

    if (row.phaseTitle !== currentPhase) {
      currentPhase = row.phaseTitle;
      lines.push(`### ${row.phaseId} — ${row.phaseTitle}`, '');
      currentSection = '';
    }
    if (row.sectionTitle !== currentSection) {
      currentSection = row.sectionTitle;
      lines.push(`#### ${row.sectionTitle}`, '');
    }

    const formatted = formatFieldValue(row.fieldKey, raw, row.field);
    const cond = conditionalDisplayNote(row.field);
    const lead = `- **${row.label}** (\`${row.fieldKey}\`):`;
    if (formatted.startsWith('\n')) {
      lines.push(lead);
      if (cond) lines.push(`  ${cond}`);
      lines.push(formatted, '');
    } else {
      lines.push(`${lead} ${formatted}`);
      if (cond) lines.push(`  ${cond}`);
      lines.push('');
    }
  }

  const extraKeys = Object.keys(formData)
    .filter((k) => !LAYOUT_KEY_SET.has(k))
    .filter((k) => hasMeaningfulValue(formData[k]))
    .sort((a, b) => a.localeCompare(b));

  if (extraKeys.length > 0) {
    lines.push('### Other saved fields', '');
    lines.push(
      '_These keys exist on `formData` but are not part of the static phase field list (timestamps, flags, or app-internal data)._',
      '',
    );
    for (const k of extraKeys) {
      const v = formData[k];
      const sanitized = sanitizeForMarkdown(v);
      if (typeof sanitized === 'object' && sanitized !== null) {
        lines.push(`- **\`${k}\`**`, '', '  ```json', `  ${JSON.stringify(sanitized, null, 2).split('\n').join('\n  ')}`, '  ```', '');
      } else {
        lines.push(`- **\`${k}\`:** ${String(sanitized)}`, '');
      }
    }
  }

  return lines;
}

async function main(): Promise<void> {
  const cred = JSON.parse(readFileSync(CRED_PATH, 'utf8')) as { project_id?: string };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(CRED_PATH),
      storageBucket: STORAGE_BUCKET,
    });
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket(STORAGE_BUCKET);

  const clientsCol = db.collection('organizations').doc(ORG_ID).collection('clients');
  const snap = await clientsCol.get();

  const allClients: { docId: string; clientName: string }[] = [];
  for (const doc of snap.docs) {
    const d = doc.data() as { clientName?: string };
    const name = typeof d.clientName === 'string' ? d.clientName : doc.id;
    allClients.push({ docId: doc.id, clientName: name });
  }
  allClients.sort((a, b) => a.clientName.localeCompare(b.clientName));

  const seenIds = new Set<string>();
  const matched: { docId: string; clientName: string }[] = [];
  for (const row of allClients) {
    if (matchesTarget(row.clientName) && !seenIds.has(row.docId)) {
      seenIds.add(row.docId);
      matched.push(row);
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const listLines = [
    '# All clients in organization',
    '',
    `- **Organization:** \`${ORG_ID}\``,
    `- **Count:** ${allClients.length}`,
    '',
    '| Client name | Firestore doc id |',
    '|-------------|------------------|',
    ...allClients.map((c) => `| ${c.clientName.replace(/\|/g, '\\|')} | \`${c.docId}\` |`),
    '',
  ];
  writeFileSync(join(OUT_DIR, 'organization-clients-list.md'), listLines.join('\n'), 'utf8');

  const indexLines: string[] = [
    '# Client export index',
    '',
    `- **Organization:** \`${ORG_ID}\``,
    `- **Project:** \`${cred.project_id ?? 'unknown'}\``,
    `- **Storage bucket:** \`${STORAGE_BUCKET}\``,
    `- **Generated:** ${new Date().toISOString()}`,
    '',
    'Full org directory: [organization-clients-list.md](./organization-clients-list.md)',
    '',
    '## Matched clients (first name or substring: fawaz, hisham, mohammad, michael, noaf)',
    '',
  ];

  if (matched.length === 0) {
    indexLines.push('_No clients matched._', '');
    writeFileSync(join(OUT_DIR, 'README.md'), indexLines.join('\n'), 'utf8');
    process.stderr.write('No matching clients found.\n');
    return;
  }

  for (const { docId, clientName } of matched) {
    const safeFile = `client-${docId.replace(/[/\\]/g, '-')}.md`;
    const currentRef = clientsCol.doc(docId).collection('current').doc('state');
    const currentSnap = await currentRef.get();
    const currentData = currentSnap.exists ? (currentSnap.data() as Record<string, unknown>) : null;
    const formData = (currentData?.formData as Record<string, unknown> | undefined) ?? undefined;

    const sessionsCol = clientsCol.doc(docId).collection('sessions');
    const sessionsSnap = await sessionsCol.limit(50).get();
    const sessionDocs = [...sessionsSnap.docs].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 20);

    const sessionPostureSummary: string[] = [];
    for (const sdoc of sessionDocs) {
      const sd = sdoc.data() as Record<string, unknown>;
      const { storageUrls } = collectPostureRefsFromSession(sd);
      if (storageUrls.length > 0) {
        sessionPostureSummary.push(`- Session \`${sdoc.id}\`: ${storageUrls.length} storage URL(s)`);
      }
    }

    let bucketFiles: string[] = [];
    try {
      bucketFiles = await listPrefixFiles(
        bucket,
        `organizations/${ORG_ID}/clients/${docId}/sessions/`,
      );
    } catch {
      bucketFiles = [];
    }

    const formPostureStorage =
      formData && typeof formData.postureImagesStorage === 'object'
        ? (formData.postureImagesStorage as Record<string, string>)
        : {};

    const decodedFromForm: { view: string; path: string }[] = [];
    for (const k of Object.keys(formPostureStorage)) {
      const url = formPostureStorage[k];
      if (typeof url !== 'string') continue;
      const p = urlToStoragePath(url);
      if (p) decodedFromForm.push({ view: k, path: p });
    }

    const lines: string[] = [
      `# ${clientName}`,
      '',
      `- **Firestore client doc id:** \`${docId}\``,
      `- **Organization:** \`${ORG_ID}\``,
      '',
      '## Posture images in Storage',
      '',
    ];

    if (bucketFiles.length > 0) {
      lines.push(`Objects under \`organizations/${ORG_ID}/clients/${docId}/sessions/\`:**`);
      for (const f of bucketFiles.sort()) {
        lines.push(`- \`${f}\``);
      }
      lines.push('');
    } else {
      lines.push(
        `_No objects listed under client doc id prefix \`organizations/${ORG_ID}/clients/${docId}/sessions/\`. URLs in formData may point at another path (e.g. \`current-client\`). See existence check below._`,
        '',
      );
    }

    lines.push('### Decoded paths from `postureImagesStorage` URLs (bucket existence)', '');
    if (decodedFromForm.length === 0) {
      lines.push('_No decodable URLs._', '');
    } else {
      for (const { view, path: storagePath } of decodedFromForm.sort((a, b) =>
        a.view.localeCompare(b.view),
      )) {
        let exists = false;
        try {
          const [ex] = await bucket.file(storagePath).exists();
          exists = Boolean(ex);
        } catch {
          exists = false;
        }
        lines.push(`- **${view}:** \`${storagePath}\` → **${exists ? 'exists' : 'missing'}**`);
      }
      lines.push('');
    }

    lines.push('### References on latest `current/state` formData', '');
    const keys = Object.keys(formPostureStorage);
    if (keys.length === 0) {
      lines.push('_No `postureImagesStorage` entries on current state._', '');
    } else {
      for (const k of keys.sort()) {
        const url = formPostureStorage[k];
        lines.push(`- **${k}:** ${typeof url === 'string' ? url : String(url)}`);
      }
      lines.push('');
    }

    lines.push('### References in recent session documents (live / companion uploads)', '');
    if (sessionPostureSummary.length === 0) {
      lines.push(
        '_No `postureImagesStorage_*` / `postureImagesFull_*` URLs in the 20 most recent sessions._',
        '',
      );
    } else {
      lines.push(...sessionPostureSummary, '');
    }

    if (!formData || Object.keys(formData).length === 0) {
      lines.push('## Assessment inputs', '', '_No formData on current state (missing doc or empty)._', '');
    } else {
      lines.push(...renderAssessmentMarkdown(formData), '');
    }

    writeFileSync(join(OUT_DIR, safeFile), lines.join('\n'), 'utf8');

    const anyDecodedExists =
      decodedFromForm.length > 0
        ? (
            await Promise.all(
              decodedFromForm.map(async ({ path: storagePath }) => {
                try {
                  const [ex] = await bucket.file(storagePath).exists();
                  return Boolean(ex);
                } catch {
                  return false;
                }
              }),
            )
          ).some(Boolean)
        : false;

    indexLines.push(
      `- [${clientName}](./${safeFile}) — doc \`${docId}\`, prefix listing: **${bucketFiles.length}** file(s), posture URLs in form: **${decodedFromForm.length}**, any of those objects exist: **${anyDecodedExists ? 'yes' : 'no'}**`,
    );
  }

  const requested = [...TARGET_FIRST_NAMES];
  const notFound = requested.filter(
    (t) => !matched.some((m) => m.clientName.toLowerCase().includes(t)),
  );
  indexLines.push('', '### Requested names with no dedicated client row match', '');
  if (notFound.length === 0) {
    indexLines.push('_All five name tokens appear in at least one matched client name._', '');
  } else {
    indexLines.push(
      'These tokens had **no** client whose name starts with or contains the token (see full list in organization-clients-list.md):',
      '',
      notFound.map((t) => `- \`${t}\``).join('\n'),
      '',
    );
  }

  indexLines.push(
    '---',
    '',
    '_Assessment section follows phase order (P0–P7). Regenerate: `npm run export:clients-md`._',
    '',
  );

  writeFileSync(join(OUT_DIR, 'README.md'), indexLines.join('\n'), 'utf8');
  process.stdout.write(
    `Wrote ${matched.length} client file(s) + README + organization-clients-list under ${OUT_DIR}\n`,
  );
}

main().catch((e) => {
  process.stderr.write(String(e) + '\n');
  process.exit(1);
});
