// Runs inside GitHub Actions — has full repo access, no timeout issues

const fs = require('fs');
const path = require('path');

const AUDIT_FILES = {
  assessment: [
    'src/lib/assessmentLogic.ts',
    'src/lib/assessmentRules.ts',
    'src/logic/decisionTable.ts',
    'src/lib/phases/index.ts',
    'src/lib/phases/phaseP0.ts',
    'src/lib/phases/phaseP1.ts',
    'src/hooks/useAssessmentFlow.ts',
    'src/hooks/useAssessmentSave.ts',
    'src/hooks/useAssessmentLogic.ts',
    'src/components/assessment/AssessmentResults.tsx',
    'src/components/MultiStepForm.tsx',
  ],
  posture: [
    'src/lib/ai/postureAnalysis.ts',
    'src/lib/ai/mediapipeSingleton.ts',
    'src/lib/ai/prompts/posturePrompts.ts',
    'src/hooks/usePoseDetection.ts',
    'src/hooks/usePostureCompanion.ts',
    'src/lib/posture/postureAlignmentFront.ts',
    'src/lib/posture/postureAlignmentSide.ts',
    'src/lib/posture/postureDeviationRenderer.ts',
    'src/lib/posture/postureOverlayCanvas.ts',
    'src/components/camera/CameraCapture.tsx',
    'src/components/camera/CameraWizard.tsx',
  ],
  reports: [
    'src/components/reports/CoachReport.tsx',
    'src/components/reports/ClientReport.tsx',
    'src/components/reports/ClientReportScoreOverview.tsx',
    'src/lib/scoring/computeScores.ts',
    'src/lib/scoring/index.ts',
    'src/lib/scoring/synthesisGenerator.ts',
    'src/lib/recommendations/index.ts',
    'src/lib/recommendations/coachPlanGenerator.ts',
    'src/components/reports/PostureAnalysisViewer.tsx',
  ],
  security: [
    'firestore.rules',
    'storage.rules',
    'functions/src/rateLimit.ts',
    'src/lib/security/validation.ts',
    'src/lib/security/errorHandling.ts',
    'src/contexts/AuthContext.tsx',
    'src/components/auth/RequireStaffAuth.tsx',
    'src/components/assessment/AssessmentGate.tsx',
  ],
  billing: [
    'functions/src/stripe.ts',
    'functions/src/webhooks.ts',
    'src/hooks/useCheckout.ts',
    'src/components/FeatureGate.tsx',
    'src/components/org/billing/PlanStatusCard.tsx',
    'src/components/org/billing/SeatUtilisationBar.tsx',
    'src/constants/pricing.ts',
    'src/lib/pricing.ts',
    'src/lib/pricing/config.ts',
  ],
  onboarding: [
    'src/hooks/useOnboarding.ts',
    'src/components/onboarding/OnboardingLayout.tsx',
    'src/components/onboarding/AccountCreationStep.tsx',
    'src/components/onboarding/BusinessInfoStep.tsx',
    'src/components/onboarding/PackageSelectionStep.tsx',
    'functions/src/invites.ts',
    'functions/src/onboardingAnalytics.ts',
  ],
  dashboard: [
    'src/pages/Dashboard.tsx',
    'src/hooks/dashboard/useDashboardDataOrchestrator.ts',
    'src/hooks/dashboard/useClientList.ts',
    'src/hooks/dashboard/useAssessmentList.ts',
    'src/hooks/dashboard/useDashboardActions.ts',
    'src/components/dashboard/sub-components/UnifiedClientTable.tsx',
    'src/components/dashboard/sub-components/DashboardHeader.tsx',
  ]
};

const CTO_SYSTEM = `You are the CTO Agent for One Assess — an AI fitness assessment SaaS.

STACK: React 18 + Vite + TypeScript + Tailwind + shadcn/ui (frontend). Firebase Firestore + Auth + Cloud Functions TypeScript (backend). MediaPipe WASM bundled locally — zero cost per posture analysis — this is a core business moat, protect it. Gemini AI for in-app narrative generation (NOT Claude — keep Gemini for app AI). Stripe for billing. Resend for email. 48 Cloud Functions deployed.

ARCHITECTURE: Multi-tenant (org→coaches→clients→assessments). 8-phase assessment (P0-P7) with clinical decision table. 6-pillar scoring engine (body comp, cardio, strength, movement, lifestyle, posture). Posture pipeline: camera→MediaPipe→landmark extraction→alignment analysis→overlay render. Offline sync, PWA, achievements system, roadmap builder. Public air-gap: dedicated viewer components for public routes.

NORTH STAR: Eliminate assessment admin burden for coaches. Mission metric: days to first paying customer.

CODING STANDARDS (from .cursorrules):
- TypeScript strict: no any, no ts-ignore without justification
- Every Firestore query must have limit() and organizationId scope
- No Firebase initialisation in components — import from @/services/firebase
- Sensitive operations (PDF, email, billing) in Cloud Functions only
- Components max 150 lines — extract to hooks and sub-components
- No console.log in committed code — use logger utility
- Analytics features must write summaries at write time
- MediaPipe singleton pattern only — never initialise multiple instances
- Air-gap public routes — dedicated viewer components, never flag-hiding

You are performing a DEEP CODE AUDIT reading actual source files line by line.

For every file check:
🔴 CRITICAL BUGS: null/undefined access without guards, missing error handling in async operations, race conditions in useEffect, memory leaks (unsubscribed listeners, uncleaned timers), incorrect dependency arrays, data loss scenarios, auth checks missing, organizationId not verified
🔴 SECURITY: secrets in client code, missing auth in Cloud Functions, Firestore queries missing organizationId, unsanitized user input in calculations, public routes exposing coach data
🟡 PERFORMANCE: unbounded Firestore queries, re-renders from object/array creation in render, missing useMemo/useCallback on expensive ops, MediaPipe initialised multiple times, N+1 query patterns
🟡 CODE QUALITY: any types, components over 150 lines, business logic in components, magic strings, console.log, commented-out code, TODO comments
🟡 ARCHITECTURE: Firebase init in components, sensitive ops client-side, missing loading/error states, analytics not at write time

RESPONSE FORMAT:
Produce a thorough, line-specific audit. For each file:
- File path and grade (A/B/C/D/F)
- Specific issues with line references where possible
- What's done well

Then:
- Overall system health score (0-100)
- Priority fix list (critical first)
- Cursor prompts section

CURSOR PROMPTS — MANDATORY at the end:
For each issue found, provide a ready-to-paste Cursor prompt:
---
File: \`path/to/file.tsx\`
Issue: [one line]
Cursor Prompt:
In [filename], [specific instruction referencing actual code]. Fix by [what to do].
---`;

async function callClaude(content, area) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: CTO_SYSTEM,
      messages: [{
        role: 'user',
        content: `Perform a deep audit of the ${area.toUpperCase()} system.\n\nI am giving you the ACTUAL SOURCE FILES — read every line carefully.\n\n${content}`
      }]
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

async function postToSlack(webhook, text) {
  // Slack has a 4000 char limit per block — split if needed
  const chunks = [];
  let current = text;
  while (current.length > 3800) {
    const splitAt = current.lastIndexOf('\n', 3800);
    chunks.push(current.slice(0, splitAt));
    current = current.slice(splitAt);
  }
  chunks.push(current);

  for (const chunk of chunks) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chunk })
    });
    await new Promise(r => setTimeout(r, 500));
  }
}

async function main() {
  const area = process.env.AUDIT_AREA || 'assessment';
  const runId = process.env.RUN_ID || Date.now().toString();

  console.log(`Starting ${area} audit (run: ${runId})`);

  // Get file list
  const filesToAudit = area === 'full'
    ? Object.values(AUDIT_FILES).flat()
    : (AUDIT_FILES[area] || AUDIT_FILES.assessment);

  // Read files from repo (GitHub Actions has full checkout)
  let fileContent = '';
  const filesRead = [];
  const filesMissing = [];

  for (const filePath of filesToAudit) {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      filesRead.push({ path: filePath, lines });
      fileContent += `\n${'='.repeat(60)}\nFILE: ${filePath}\nLINES: ${lines}\n${'─'.repeat(40)}\n${content}\n`;
      console.log(`✓ Read ${filePath} (${lines} lines)`);
    } else {
      filesMissing.push(filePath);
      console.log(`✗ Missing: ${filePath}`);
    }
  }

  console.log(`\nFiles read: ${filesRead.length}/${filesToAudit.length}`);
  if (filesMissing.length > 0) {
    console.log(`Missing: ${filesMissing.join(', ')}`);
  }

  // Run Claude audit
  console.log('\nRunning Claude analysis...');
  let auditResult;
  try {
    auditResult = await callClaude(fileContent, area);
    console.log('✓ Claude analysis complete');
  } catch (err) {
    console.error('Claude error:', err.message);
    auditResult = `Audit failed: ${err.message}`;
  }

  // Save result for APEX OS polling
  const resultData = {
    runId,
    area,
    status: 'complete',
    timestamp: new Date().toISOString(),
    filesRead: filesRead.length,
    filesMissing,
    result: auditResult
  };

  fs.writeFileSync('audit-result.json', JSON.stringify(resultData, null, 2));
  console.log('✓ Result saved to audit-result.json');

  // Post header to Slack
  const header = `*🔬 CTO Audit — ${area.toUpperCase()} System*\n_${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}_\n*Files analysed:* ${filesRead.length} source files${filesMissing.length > 0 ? `\n*Not found:* ${filesMissing.join(', ')}` : ''}\n\n`;

  if (process.env.SLACK_ENGINEERING) {
    await postToSlack(process.env.SLACK_ENGINEERING, header + auditResult);
    console.log('✓ Posted to Slack #01-engineering');
  }

  console.log('\nAudit complete.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
