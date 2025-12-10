import PDFDocument from 'pdfkit';
import type { AssessmentDoc } from './types';

type PdfView = 'client' | 'coach';

type PdfOptions = {
  assessment: AssessmentDoc;
  view: PdfView;
};

function docToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

const PRIMARY_COLOR = '#0f172a';
const MUTED_COLOR = '#475569';

function renderHeader(doc: InstanceType<typeof PDFDocument>, title: string, subtitle?: string) {
  doc
    .fillColor(PRIMARY_COLOR)
    .fontSize(20)
    .text(title, { underline: false });

  if (subtitle) {
    doc.moveDown(0.3).fontSize(11).fillColor(MUTED_COLOR).text(subtitle);
  }

  doc.moveDown(0.8);
}

function renderKeyMetrics(doc: InstanceType<typeof PDFDocument>, assessment: AssessmentDoc) {
  const goals = Array.isArray(assessment.goals) ? assessment.goals : [];
  const goalLines = goals.length ? goals.join('\n• ') : 'Not provided';

  doc
    .fontSize(13)
    .fillColor(PRIMARY_COLOR)
    .text('Key goals', { continued: false })
    .moveDown(0.2)
    .fontSize(11)
    .fillColor(MUTED_COLOR)
    .text(`• ${goalLines}`);

  doc.moveDown(0.4);

  const overall = typeof assessment.overallScore === 'number' ? assessment.overallScore : null;
  if (overall !== null) {
    doc
      .fontSize(13)
      .fillColor(PRIMARY_COLOR)
      .text('Overall readiness score')
      .moveDown(0.2)
      .fontSize(28)
      .fillColor(PRIMARY_COLOR)
      .text(`${overall}/100`, { lineGap: 6 });
  }

  doc.moveDown(0.6);
}

function renderCoachInsights(doc: InstanceType<typeof PDFDocument>) {
  const bullets = [
    'Focus on the primary limitations highlighted in the assessment summary.',
    'Bias unilateral work when lean-mass imbalances exceed 6% between limbs.',
    'Stack roadmap actions into a 4–6 week block, progressing volume cautiously.',
  ];

  doc
    .fontSize(13)
    .fillColor(PRIMARY_COLOR)
    .text('Coaching focus', { continued: false })
    .moveDown(0.2)
    .fontSize(11)
    .fillColor(MUTED_COLOR);

  bullets.forEach((line) => {
    doc.text(`• ${line}`).moveDown(0.1);
  });

  doc.moveDown(0.6);
}

export async function buildReportPdf(options: PdfOptions): Promise<Buffer> {
  const { assessment, view } = options;
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  doc.registerFont('Helvetica', 'Helvetica');

  const name = (assessment.clientName || 'One Fitness client').trim();
  const subtitle =
    view === 'coach'
      ? 'Coach-facing summary: readiness, issues, and next actions.'
      : 'Client-facing overview of your One Fitness assessment.';

  renderHeader(doc, `${name} — ${view === 'coach' ? 'coaching overview' : 'your fitness report'}`, subtitle);

  renderKeyMetrics(doc, assessment);

  if (view === 'coach') {
    renderCoachInsights(doc);
  } else {
    doc
      .fontSize(13)
      .fillColor(PRIMARY_COLOR)
      .text('What happens next')
      .moveDown(0.2)
      .fontSize(11)
      .fillColor(MUTED_COLOR)
      .text(
        'Your coach will walk you through a personalised action plan covering movement quality, conditioning, and lifestyle checkpoints. Expect follow-up notes inside the One Fitness app.',
      )
      .moveDown(0.4)
      .text(
        'Stay active on the agreed daily step goal, complete the recommended Zone 2 sessions, and log your sleep so we can track recovery trends.',
      );
  }

  doc.moveDown(0.6).fontSize(9).fillColor(MUTED_COLOR).text('Generated automatically by One Fitness Assessment Platform.');

  doc.end();
  return docToBuffer(doc);
}

