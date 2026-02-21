import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { stableEvidenceNormalize } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');

// Pipeline steps in exact order
const steps = [
  { name: 'sources', script: 'scripts/edge/edge_lab/edge_sources.mjs', npm: 'edge:sources' },
  { name: 'registry', script: 'scripts/edge/edge_lab/edge_registry.mjs', npm: 'edge:registry' },
  { name: 'profit:candidates', script: 'scripts/edge/edge_lab/edge_profit_candidates.mjs', npm: 'edge:profit:candidates' },
  { name: 'paper:ingest', script: 'scripts/edge/edge_lab/edge_paper_ingest.mjs', npm: 'edge:paper:ingest' },
  { name: 'paper:evidence', script: 'scripts/edge/edge_lab/edge_paper_evidence.mjs', npm: 'edge:paper:evidence' },
  { name: 'expectancy:ci', script: 'scripts/edge/edge_lab/edge_expectancy_ci.mjs', npm: 'edge:expectancy:ci' },
  { name: 'multi:hypothesis', script: 'scripts/edge/edge_lab/edge_multi_hypothesis_mvp.mjs', npm: 'edge:multi:hypothesis' },
  { name: 'portfolio', script: 'scripts/edge/edge_lab/edge_portfolio_court.mjs', npm: 'edge:portfolio' },
  { name: 'dataset', script: 'scripts/edge/edge_lab/edge_dataset.mjs', npm: 'edge:dataset' },
  { name: 'execution', script: 'scripts/edge/edge_lab/edge_execution.mjs', npm: 'edge:execution' },
  { name: 'execution:grid', script: 'scripts/edge/edge_lab/edge_execution_grid.mjs', npm: 'edge:execution:grid' },
  { name: 'execution:reality', script: 'scripts/edge/edge_lab/edge_execution_reality.mjs', npm: 'edge:execution:reality' },
  { name: 'risk', script: 'scripts/edge/edge_lab/edge_risk.mjs', npm: 'edge:risk' },
  { name: 'overfit', script: 'scripts/edge/edge_lab/edge_overfit.mjs', npm: 'edge:overfit' },
  { name: 'redteam', script: 'scripts/edge/edge_lab/edge_redteam.mjs', npm: 'edge:redteam' },
  { name: 'sre', script: 'scripts/edge/edge_lab/edge_sre.mjs', npm: 'edge:sre' },
  { name: 'micro:live:sre', script: 'scripts/edge/edge_lab/edge_micro_live_sre.mjs', npm: 'edge:micro:live:sre' },
  { name: 'micro:live:readiness', script: 'scripts/edge/edge_lab/edge_micro_live_readiness.mjs', npm: 'edge:micro:live:readiness' },
  { name: 'verdict', script: 'scripts/edge/edge_lab/edge_verdict.mjs', npm: 'edge:verdict' },
];

const now = new Date().toISOString();

console.log('');
console.log('='.repeat(60));
console.log('EDGE_LAB — Full Court Pipeline');
console.log(`Started: ${now}`);
console.log('='.repeat(60));

// Step 1: Wipe and recreate evidence directory
console.log('\n[SETUP] Wiping reports/evidence/EDGE_LAB/ ...');
try {
  if (fs.existsSync(EVIDENCE_DIR)) {
    fs.rmSync(EVIDENCE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  console.log('[SETUP] Evidence directory ready.');
} catch (err) {
  console.error('[SETUP FAIL] Could not wipe/create evidence directory:', err.message);
  process.exit(1);
}


function canonicalizeEvidenceRoot() {
  if (!fs.existsSync(EVIDENCE_DIR)) return;
  const files = fs.readdirSync(EVIDENCE_DIR).filter((f) => fs.statSync(path.join(EVIDENCE_DIR, f)).isFile());
  for (const f of files) {
    const p = path.join(EVIDENCE_DIR, f);
    const raw = fs.readFileSync(p, 'utf8');
    const normalized = stableEvidenceNormalize(raw);
    if (raw !== normalized) fs.writeFileSync(p, normalized);
  }
}
// Track results
const results = [];
let pipelineFailed = false;
let failedStep = null;

// Step 2: Run each court script in order
for (const step of steps) {
  const scriptPath = path.join(ROOT, step.script);

  if (!fs.existsSync(scriptPath)) {
    console.error(`\n[FAIL] Script not found: ${step.script}`);
    pipelineFailed = true;
    failedStep = step.name;
    results.push({ name: step.name, status: 'MISSING_SCRIPT', exit_code: -1 });
    break;
  }

  console.log(`\n[RUN] edge:${step.name}`);
  const startTime = Date.now();

  try {
    const output = execSync(`node "${scriptPath}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const elapsed = Date.now() - startTime;
    console.log(output.trim());
    console.log(`[OK]  edge:${step.name} completed in ${elapsed}ms`);
    results.push({ name: step.name, status: 'PASS', exit_code: 0, elapsed_ms: elapsed });
    canonicalizeEvidenceRoot();
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const stdout = err.stdout ? err.stdout.toString().trim() : '';
    const stderr = err.stderr ? err.stderr.toString().trim() : '';
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.error(`\n[FAIL] edge:${step.name} failed (exit code ${err.status}) after ${elapsed}ms`);
    results.push({ name: step.name, status: 'FAIL', exit_code: err.status || 1, elapsed_ms: elapsed });
    pipelineFailed = true;
    failedStep = step.name;
    break;
  }
}

// If pipeline failed, write BLOCKED verdict
if (pipelineFailed) {
  const blockedVerdictContent = `# VERDICT.md — EDGE_LAB Final Verdict
generated_at: ${new Date().toISOString()}
script: edge_all.mjs

## FINAL VERDICT: BLOCKED

## Verdict Reason
Pipeline failed at step: ${failedStep}. All subsequent courts were not evaluated.

## Pipeline Results
${results.map(r => `| ${r.name} | ${r.status} |`).join('\n')}

## Next Steps
1. Fix the failing script: edge:${failedStep}
2. Rerun: npm run edge:all
`;

  try {
    // Ensure dir still exists (may have been lost in a catastrophic failure)
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'VERDICT.md'), stableEvidenceNormalize(blockedVerdictContent));
    fs.writeFileSync(path.join(ROOT, 'EDGE_LAB', 'FINAL_VERDICT.md'), stableEvidenceNormalize(blockedVerdictContent));
  } catch (writeErr) {
    console.error('[WARN] Could not write BLOCKED verdict:', writeErr.message);
  }
}

// Print final summary
console.log('\n' + '='.repeat(60));
console.log('EDGE_LAB Pipeline Summary');
console.log('='.repeat(60));

for (const r of results) {
  const icon = r.status === 'PASS' ? 'PASS' : 'FAIL';
  const timing = r.elapsed_ms !== undefined ? ` (${r.elapsed_ms}ms)` : '';
  console.log(`  [${icon}] ${r.name}${timing}`);
}

const passCount = results.filter(r => r.status === 'PASS').length;
const totalRun = results.length;

console.log('');
console.log(`Results: ${passCount}/${totalRun} steps passed`);
console.log(`Completed: ${new Date().toISOString()}`);

if (pipelineFailed) {
  console.log(`\n[FAIL] EDGE_LAB pipeline BLOCKED at step: ${failedStep}`);
  console.log('='.repeat(60));
  process.exit(1);
} else {
  // Read the final verdict from VERDICT.md
  let finalVerdict = 'COMPLETE';
  try {
    const verdictContent = fs.readFileSync(path.join(EVIDENCE_DIR, 'VERDICT.md'), 'utf8');
    const match = verdictContent.match(/## FINAL VERDICT:\s*(\w+)/);
    if (match) finalVerdict = match[1];
  } catch (e) {
    // ignore
  }

  console.log(`\n[PASS] EDGE_LAB verdict: ${finalVerdict}`);
  console.log('='.repeat(60));
  process.exit(0);
}
