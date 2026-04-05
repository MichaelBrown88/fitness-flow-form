import * as admin from 'firebase-admin';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { Resvg } from '@resvg/resvg-js';
import {
  SOCIAL_SHARE_PRODUCT_NAME,
  SOCIAL_SHARE_STORAGE_PREFIX,
  SOCIAL_SHARE_TEMPLATE_VERSION,
} from './socialShareArtifactConstants';

type Payload = { assessmentId?: string };

type PublicReportFields = {
  coachUid?: string;
  assessmentId?: string;
  organizationId?: string;
  clientName?: string;
  visibility?: string;
  revoked?: boolean;
  latestOverallScore?: number;
  snapshotSummaries?: Array<{ score?: number }>;
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(0, maxChars - 1))}…`;
}

function resolveOverallScore(data: PublicReportFields): number | null {
  const a = data.latestOverallScore;
  if (typeof a === 'number' && Number.isFinite(a)) return Math.round(a);
  const s = data.snapshotSummaries?.[0]?.score;
  if (typeof s === 'number' && Number.isFinite(s)) return Math.round(s);
  return null;
}

function buildShareSvg(params: {
  width: number;
  height: number;
  clientName: string;
  orgLine: string | null;
  overallScore: number | null;
  layout: 'landscape' | 'square' | 'story';
}): string {
  const { width, height, clientName, orgLine, overallScore, layout } = params;
  const scoreLabel =
    overallScore !== null ? String(overallScore) : '—';
  const sub =
    overallScore !== null ? 'Overall score' : 'Fitness report';

  const name = escapeXml(truncate(clientName, layout === 'landscape' ? 42 : 36));
  const org = orgLine ? escapeXml(truncate(orgLine, 40)) : '';
  const product = escapeXml(SOCIAL_SHARE_PRODUCT_NAME);

  if (layout === 'landscape') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#020617"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="72" y="120" fill="#94a3b8" font-size="22" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${product}</text>
  <text x="72" y="260" fill="#f8fafc" font-size="52" font-weight="700" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${name}</text>
  ${org ? `<text x="72" y="320" fill="#cbd5e1" font-size="26" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${org}</text>` : ''}
  <circle cx="1020" cy="315" r="108" fill="none" stroke="#38bdf8" stroke-width="6"/>
  <text x="1020" y="340" fill="#f8fafc" font-size="64" font-weight="700" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${escapeXml(scoreLabel)}</text>
  <text x="1020" y="390" fill="#94a3b8" font-size="20" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${escapeXml(sub)}</text>
</svg>`;
  }

  if (layout === 'square') {
    const cy = 420;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bgs" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#020617"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bgs)"/>
  <text x="540" y="100" fill="#94a3b8" font-size="24" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${product}</text>
  <text x="540" y="260" fill="#f8fafc" font-size="48" font-weight="700" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${name}</text>
  ${org ? `<text x="540" y="330" fill="#cbd5e1" font-size="26" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${org}</text>` : ''}
  <circle cx="540" cy="${cy}" r="120" fill="none" stroke="#38bdf8" stroke-width="6"/>
  <text x="540" y="${cy + 28}" fill="#f8fafc" font-size="72" font-weight="700" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${escapeXml(scoreLabel)}</text>
  <text x="540" y="${cy + 92}" fill="#94a3b8" font-size="22" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${escapeXml(sub)}</text>
</svg>`;
  }

  // story
  const cy = 1100;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bgst" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#020617"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bgst)"/>
  <text x="540" y="160" fill="#94a3b8" font-size="26" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${product}</text>
  <text x="540" y="360" fill="#f8fafc" font-size="56" font-weight="700" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${name}</text>
  ${org ? `<text x="540" y="440" fill="#cbd5e1" font-size="28" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${org}</text>` : ''}
  <circle cx="540" cy="${cy}" r="140" fill="none" stroke="#38bdf8" stroke-width="8"/>
  <text x="540" y="${cy + 36}" fill="#f8fafc" font-size="88" font-weight="700" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${escapeXml(scoreLabel)}</text>
  <text x="540" y="${cy + 110}" fill="#94a3b8" font-size="24" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif">${escapeXml(sub)}</text>
</svg>`;
}

function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

async function uploadPngAndSignUrl(
  bucket: import('@google-cloud/storage').Bucket,
  storagePath: string,
  buffer: Buffer,
): Promise<string> {
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    contentType: 'image/png',
    resumable: false,
    metadata: {
      cacheControl: 'public, max-age=3600',
    },
  });
  const [url] = await file.getSignedUrl({
    action: 'read',
    version: 'v4',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
  });
  return url;
}

async function findPublicReportToken(
  db: admin.firestore.Firestore,
  coachUid: string,
  assessmentId: string,
): Promise<{ token: string; data: PublicReportFields } | null> {
  const q = await db
    .collection('publicReports')
    .where('coachUid', '==', coachUid)
    .where('assessmentId', '==', assessmentId)
    .where('visibility', '==', 'public')
    .limit(1)
    .get();
  if (q.empty) return null;
  const doc = q.docs[0];
  return { token: doc.id, data: doc.data() as PublicReportFields };
}

export async function handleGeneratePublicReportSocialShareArtifacts(
  request: CallableRequest<Payload>,
): Promise<{
  socialShareArtifacts: {
    og1200x630Url: string;
    square1080Url: string;
    story1080x1920Url: string;
    contentHash: string;
  };
}> {
  const coachUid = request.auth?.uid;
  if (!coachUid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const assessmentId =
    typeof request.data?.assessmentId === 'string' ? request.data.assessmentId.trim() : '';
  if (!assessmentId) {
    throw new HttpsError('invalid-argument', 'assessmentId is required.');
  }

  const db = admin.firestore();
  const found = await findPublicReportToken(db, coachUid, assessmentId);
  if (!found) {
    throw new HttpsError('not-found', 'No public report found for this assessment.');
  }

  const { token, data } = found;
  if (data.revoked === true) {
    throw new HttpsError('failed-precondition', 'This share link has been revoked.');
  }
  if (data.coachUid !== coachUid) {
    throw new HttpsError('permission-denied', 'You cannot update this report.');
  }

  const profileSnap = await db.doc(`userProfiles/${coachUid}`).get();
  const profileOrg = profileSnap.exists
    ? (profileSnap.data() as { organizationId?: string }).organizationId
    : undefined;
  if (data.organizationId && profileOrg && data.organizationId !== profileOrg) {
    throw new HttpsError('permission-denied', 'Organization mismatch.');
  }

  const clientName =
    typeof data.clientName === 'string' && data.clientName.trim()
      ? data.clientName.trim()
      : 'Client';
  const overallScore = resolveOverallScore(data);

  let orgLine: string | null = null;
  const orgId = data.organizationId;
  if (orgId) {
    const orgSnap = await db.doc(`organizations/${orgId}`).get();
    if (orgSnap.exists) {
      const nm = (orgSnap.data() as { name?: string }).name;
      if (typeof nm === 'string' && nm.trim()) orgLine = nm.trim();
    }
  }

  const bucket = admin.storage().bucket();
  const base = `${SOCIAL_SHARE_STORAGE_PREFIX}/${token}/v${SOCIAL_SHARE_TEMPLATE_VERSION}`;

  const ogSvg = buildShareSvg({
    width: 1200,
    height: 630,
    clientName,
    orgLine,
    overallScore,
    layout: 'landscape',
  });
  const squareSvg = buildShareSvg({
    width: 1080,
    height: 1080,
    clientName,
    orgLine,
    overallScore,
    layout: 'square',
  });
  const storySvg = buildShareSvg({
    width: 1080,
    height: 1920,
    clientName,
    orgLine,
    overallScore,
    layout: 'story',
  });

  const [og1200x630Url, square1080Url, story1080x1920Url] = await Promise.all([
    uploadPngAndSignUrl(bucket, `${base}/og-1200x630.png`, svgToPng(ogSvg)),
    uploadPngAndSignUrl(bucket, `${base}/square-1080.png`, svgToPng(squareSvg)),
    uploadPngAndSignUrl(bucket, `${base}/story-1080x1920.png`, svgToPng(storySvg)),
  ]);

  const contentHash = SOCIAL_SHARE_TEMPLATE_VERSION;
  const socialShareArtifacts = {
    og1200x630Url,
    square1080Url,
    story1080x1920Url,
    contentHash,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.doc(`publicReports/${token}`).set({ socialShareArtifacts }, { merge: true });

  return {
    socialShareArtifacts: {
      og1200x630Url,
      square1080Url,
      story1080x1920Url,
      contentHash,
    },
  };
}
