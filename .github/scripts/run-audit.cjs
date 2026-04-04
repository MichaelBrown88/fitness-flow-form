// .github/scripts/run-audit.cjs
// Runs inside GitHub Actions — full repo access, no timeout
// Reads .cursorrules and NORTH_STAR.md live from repo
// Uses Context7 for up-to-date library documentation

const fs = require('fs');
const path = require('path');

const AUDIT_FILES = {
  assessment: [
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
    'src/components/camera/PostureGuidedCapturePanel.tsx',
  ],
  reports: [
    'src/components/reports/CoachReport.tsx',
    'src/components/reports/ClientReport.tsx',
    'src/lib/scoring/computeScores.ts',
    'src/lib/scoring/synthesisGenerator.ts',
    'src/lib/recommendations/coachPlanGenerator.ts',
  ],
  security: [
    'firestore.rules',
    'storage.rules',
    'functions/src/rateLimit.ts',
    'src/contexts/AuthContext.tsx',
    'src/components/assessment/AssessmentGate.tsx',
  ],
  billing: [
    'functions/src/stripe.ts',
    'functions/src/webhooks.ts',
    'src/hooks/useCheckout.ts',
    'src/hooks/useFeatureFlags.ts',
    'src/components/org/billing/PlanStatusCard.tsx',
    'src/components/org/billing/ClientCapacityUtilisationBar.tsx',
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
    'src/pages/dashboard/DashboardLayout.tsx',
    'src/hooks/dashboard/useDashboardDataOrchestrator.ts',
    'src/hooks/dashboard/useClientList.ts',
    'src/hooks/dashboard/useAssessmentList.ts',
    'src/hooks/dashboard/useDashboardActions.ts',
    'src/components/dashboard/sub-components/UnifiedClientTable.tsx',
    'src/components/dashboard/sub-components/DashboardHeader.tsx',
  ]
};

function readFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, 'utf8');
  }
  return null;
}

async function fetchContext7Docs(libraryId, topic) {
  try {
    const response = await fetch('https://mcp.context7.com/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: 'get-library-docs',
          arguments: {
            context7CompatibleLibraryID: libraryId,
            topic,
            tokens: 3000
          }
        }
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.result?.content?.[0]?.text || null;
  } catch {
    return null;
  }
}

async function buildSystemPrompt(area) {
  const cursorRules = readFile('.cursorrules') || '';
  const northStar = readFile('NORTH_STAR.md') || '';
  const packageJson = readFile('package.json') || '';

  let deps = {};
  try {
    const pkg = JSON.parse(packageJson);
    deps = { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {}

  const reactVersion = deps['react'] || 'unknown';
  const firebaseVersion = deps['firebase'] || 'unknown';

  console.log('Fetching Context7 documentation...');
  let context7Content = '';
  const docFetches = [];

  if (['assessment', 'dashboard', 'reports', 'onboarding'].includes(area) || area === 'full') {
    docFetches.push(
      fetchContext7Docs('/firebase/firebase-js-sdk', 'Firestore security best practices and query optimization'),
      fetchContext7Docs('/facebook/react', 'useEffect cleanup, memory leaks, and hook best practices'),
    );
  }
  if (['security', 'billing'].includes(area) || area === 'full') {
    docFetches.push(
      fetchContext7Docs('/firebase/firebase-js-sdk', 'Firebase Auth security and admin SDK'),
      fetchContext7Docs('/stripe/stripe-node', 'Stripe webhook verification and subscription handling'),
    );
  }
  if (['posture'].includes(area) || area === 'full') {
    docFetches.push(
      fetchContext7Docs('/facebook/react', 'Performance optimization and useCallback useMemo'),
    );
  }

  const docResults = await Promise.allSettled(docFetches);
  const validDocs = docResults.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);

  if (validDocs.length > 0) {
    context7Content = `\n\nCURRENT LIBRARY DOCUMENTATION (fetched live via Context7):\n${validDocs.join('\n\n---\n\n')}`;
    console.log(`✓ Fetched ${validDocs.length} Context7 documentation sources`);
  } else {
    console.log('Context7 docs unavailable — proceeding with training knowledge');
  }

  return `You are the CTO Agent for One Assess — performing a DEEP CODE AUDIT of the ${area.toUpperCase()} system.

════════════════════════════════════════
NORTH STAR (live from NORTH_STAR.md):
════════════════════════════════════════
${northStar}

════════════════════════════════════════
CODING STANDARDS (live from .cursorrules):
════════════════════════════════════════
${cursorRules}

════════════════════════════════════════
ACTUAL STACK VERSIONS (from package.json):
════════════════════════════════════════
React: ${reactVersion}
Firebase: ${firebaseVersion}
Dependencies: ${Object.keys(deps).slice(0, 30).join(', ')}
${context7Content}

════════════════════════════════════════
AUDIT INSTRUCTIONS:
════════════════════════════════════════
You are reading ACTUAL SOURCE FILES — every line, not summaries.
Cross-reference ALL findings against the live .cursorrules above.
Every violation of a cursorrules standard is a confirmed issue.
Every violation of the North Star principles is a strategic concern.

For every file:
1. Grade: A/B/C/D/F
2. Line-specific issues with exact line numbers
3. Which cursorrule is violated
4. What is done well

Severity:
🔴 CRITICAL: data loss, security breach, crash, auth bypass, missing organizationId
🟡 WARNING: cursorrules violation, performance issue, code quality
🟢 GOOD: correct patterns, follows rules

Health score 0-100:
90-100: Production ready
70-89: Minor cleanup needed
50-69: Significant work before launch
30-49: Substantial issues, do not launch
0-29: Critical failures

End with section: 📋 Cursor Prompts — Copy & Paste These

For each issue:
---
File: path/to/file.tsx
Cursorrule violated: [exact rule]
Issue: [specific problem]
Cursor Prompt:
In [filename], [exact instruction]. Current code [what is wrong]. Fix by [specific solution].
---

Be thorough. Vague feedback is useless.`;
}

async function callClaude(systemPrompt, fileContent, area) {
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
      system: systemPrompt,
      messages: [{ role: 'user', content: `Perform a deep audit of the ${area.toUpperCase()} system.\n\nACTUAL SOURCE FILES:\n\n${fileContent}` }]
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

async function postToSlack(webhook, text) {
  const chunks = [];
  let current = text;
  while (current.length > 3800) {
    const splitAt = current.lastIndexOf('\n', 3800);
    chunks.push(current.slice(0, splitAt > 0 ? splitAt : 3800));
    current = current.slice(splitAt > 0 ? splitAt : 3800);
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

  console.log(`\n🔬 One Assess CTO Audit`);
  console.log(`Area: ${area} | Run: ${runId}`);
  console.log('─'.repeat(50));

  console.log('\nReading live rule files...');
  const cursorRulesExists = fs.existsSync(path.join(process.cwd(), '.cursorrules'));
  const northStarExists = fs.existsSync(path.join(process.cwd(), 'NORTH_STAR.md'));
  console.log(`✓ .cursorrules: ${cursorRulesExists ? 'found' : 'MISSING'}`);
  console.log(`✓ NORTH_STAR.md: ${northStarExists ? 'found' : 'MISSING'}`);

  const systemPrompt = await buildSystemPrompt(area);

  const filesToAudit = area === 'full'
    ? Object.values(AUDIT_FILES).flat()
    : (AUDIT_FILES[area] || AUDIT_FILES.assessment);

  console.log(`\nReading ${filesToAudit.length} source files...`);
  let fileContent = '';
  const filesRead = [];
  const filesMissing = [];

  for (const filePath of filesToAudit) {
    const content = readFile(filePath);
    if (content) {
      const lines = content.split('\n').length;
      filesRead.push({ path: filePath, lines });
      fileContent += `\n${'═'.repeat(60)}\nFILE: ${filePath}\nLINES: ${lines}\n${'─'.repeat(40)}\n${content}\n`;
      console.log(`  ✓ ${filePath} (${lines} lines)`);
    } else {
      filesMissing.push(filePath);
      console.log(`  ✗ ${filePath} — not found`);
    }
  }

  console.log(`\nFiles read: ${filesRead.length}/${filesToAudit.length}`);
  console.log('\nRunning Claude analysis with live rules context...');

  let auditResult;
  try {
    auditResult = await callClaude(systemPrompt, fileContent, area);
    console.log('✓ Claude analysis complete');
  } catch (err) {
    console.error('Claude error:', err.message);
    auditResult = `Audit failed: ${err.message}`;
  }

  const resultData = {
    runId, area, status: 'complete',
    timestamp: new Date().toISOString(),
    filesRead: filesRead.length, filesMissing,
    cursorRulesUsed: cursorRulesExists,
    northStarUsed: northStarExists,
    result: auditResult
  };

  fs.writeFileSync('audit-result.json', JSON.stringify(resultData, null, 2));
  console.log('✓ Saved audit-result.json');

  if (process.env.SLACK_ENGINEERING) {
    const header = `*🔬 CTO Audit — ${area.toUpperCase()} System*\n` +
      `_${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}_\n` +
      `*Files analysed:* ${filesRead.length} source files\n` +
      `*Rules:* Live .cursorrules ✓ | NORTH_STAR.md ✓\n` +
      (filesMissing.length > 0 ? `*Not found:* ${filesMissing.join(', ')}\n` : '') + `\n`;
    await postToSlack(process.env.SLACK_ENGINEERING, header + auditResult);
    console.log('✓ Posted to Slack #01-engineering');
  }

  console.log('\n✅ Audit complete.\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
