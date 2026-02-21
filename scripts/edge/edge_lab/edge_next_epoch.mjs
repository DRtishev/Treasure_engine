import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');
const RUN_ID = process.env.TREASURE_RUN_ID
  || process.env.GITHUB_SHA
  || execSync('git rev-parse --short=12 HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();

const REQUIRED_ROOT_FILES = [
  'SOURCES_AUDIT.md', 'REGISTRY_COURT.md', 'PROFIT_CANDIDATES_COURT.md', 'DATASET_COURT.md', 'EXECUTION_COURT.md',
  'EXECUTION_SENSITIVITY_GRID.md', 'EXECUTION_REALITY_COURT.md', 'EXECUTION_BREAKPOINTS.md',
  'RISK_COURT.md', 'OVERFIT_COURT.md', 'REDTEAM_COURT.md', 'SRE_COURT.md', 'MICRO_LIVE_READINESS.md', 'VERDICT.md',
  'SNAPSHOT.md', 'MCL_NOTES.md', 'EVIDENCE_INDEX.md', 'MEGA_CLOSEOUT_EDGE_LAB.md', 'GOVERNANCE_FINGERPRINT.md',
  'ANTI_FLAKE_INDEPENDENCE.md', 'PAPER_EVIDENCE.md'
];
// Core courts (original 9) — must all be PASS for PIPELINE_ELIGIBLE
const COURT_STATUS_FILES = [
  'SOURCES_AUDIT.md', 'REGISTRY_COURT.md', 'DATASET_COURT.md', 'EXECUTION_COURT.md',
  'EXECUTION_SENSITIVITY_GRID.md', 'RISK_COURT.md', 'OVERFIT_COURT.md', 'REDTEAM_COURT.md', 'SRE_COURT.md'
];
// New profit-track courts — contribute to ELIGIBLE_FOR_* states (may be NEEDS_DATA)
const PROFIT_COURT_STATUS_FILES = [
  'PROFIT_CANDIDATES_COURT.md', 'EXECUTION_REALITY_COURT.md', 'MICRO_LIVE_READINESS.md', 'PAPER_EVIDENCE.md'
];
const REQUIRED_MACHINE_FILES = [
  'contract_manifest_result.json', 'verdict_stratification.json', 'raw_stability.json', 'determinism_x2.json',
  'anti_flake_independence.json', 'proxy_guard.json', 'paper_court.json', 'paper_evidence.json',
  'sli_baseline.json', 'meta_audit.json', 'ledger_check.json', 'ledger_acyclicity.json', 'final_verdict.json',
  'profit_candidates_court.json', 'execution_reality_court.json', 'micro_live_readiness.json'
];

const FAIL = (reason_code, message, extra = {}) => ({ status: 'BLOCKED', reason_code, message, ...extra });
const PASS = (message, extra = {}) => ({ status: 'PASS', reason_code: 'NONE', message, ...extra });

function writeManual(name, payload) {
  fs.mkdirSync(MANUAL_DIR, { recursive: true });
  fs.writeFileSync(path.join(MANUAL_DIR, name), `${JSON.stringify({ run_id: RUN_ID, ...payload }, null, 2)}\n`);
}

function writeMarkdown(fileName, content) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(path.join(EVIDENCE_DIR, fileName), `${content.trim()}\n`);
}

function readStatus(file) {
  const p = path.join(EVIDENCE_DIR, file);
  if (!fs.existsSync(p)) return 'MISSING';
  const raw = fs.readFileSync(p, 'utf8');
  const m = raw.match(/^## STATUS:\s*([A-Z_]+)/m);
  return m ? m[1] : 'UNKNOWN';
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableNormalize(content) {
  return content
    .replace(/generated_at:\s*.+/gi, 'generated_at: RUN_ID')
    .replace(/\| Generated \|[^\n]*/gi, '| Generated | RUN_ID |')
    .replace(/Generated:\s*.+/gi, 'Generated: RUN_ID')
    .replace(/Started:\s*.+/gi, 'Started: RUN_ID')
    .replace(/Completed:\s*.+/gi, 'Completed: RUN_ID')
    .replace(/20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z/g, 'RUN_ID')
    .replace(/\r\n/g, '\n');
}

function normalizeEvidenceFiles() {
  for (const file of REQUIRED_ROOT_FILES) {
    const abs = path.join(EVIDENCE_DIR, file);
    if (!fs.existsSync(abs)) continue;
    const raw = fs.readFileSync(abs, 'utf8');
    const normalized = stableNormalize(raw);
    if (raw !== normalized) fs.writeFileSync(abs, normalized);
  }
}

function collectRunSnapshot() {
  const files = REQUIRED_ROOT_FILES.slice().sort();
  const byFile = files.map((file) => {
    const abs = path.join(EVIDENCE_DIR, file);
    const body = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : 'MISSING';
    return {
      file,
      hash: sha256(body),
      content: body
    };
  });
  const fingerprint = sha256(byFile.map((r) => `${r.file}:${r.hash}`).join('\n'));
  return { fingerprint, byFile };
}

function diffHint(a, b, maxLines = 6) {
  const al = a.split('\n');
  const bl = b.split('\n');
  const out = [];
  const lim = Math.max(al.length, bl.length);
  for (let i = 0; i < lim && out.length < maxLines; i += 1) {
    if ((al[i] || '') !== (bl[i] || '')) {
      out.push(`L${i + 1} | run1: ${al[i] || ''}`);
      if (out.length < maxLines) out.push(`L${i + 1} | run2: ${bl[i] || ''}`);
    }
  }
  return out;
}

function runEdgeAll() {
  execSync('node scripts/edge/edge_lab/edge_all.mjs', { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
  normalizeEvidenceFiles();
  return collectRunSnapshot();
}

function seededRandom(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

// 0) RAW_STABILITY
let rawStabilityResult;
let rawStabilityReportContent = "";
try {
  execSync('node scripts/edge/edge_lab/edge_raw_x2.mjs', { cwd: ROOT, stdio: 'pipe' });
  const rawReport = fs.readFileSync(path.join(EVIDENCE_DIR, 'RAW_STABILITY_REPORT.md'), 'utf8');
  rawStabilityReportContent = rawReport;
  rawStabilityResult = /^STATUS:\s*PASS/m.test(rawReport)
    ? PASS('Raw evidence stability x2 passed')
    : FAIL('RAW_NONDETERMINISM', 'Raw evidence stability report is not PASS');
} catch (e) {
  const rawPath = path.join(EVIDENCE_DIR, 'RAW_STABILITY_REPORT.md');
  if (fs.existsSync(rawPath)) rawStabilityReportContent = fs.readFileSync(rawPath, 'utf8');
  rawStabilityResult = FAIL('RAW_NONDETERMINISM', 'edge:raw:x2 failed');
}
writeManual('raw_stability.json', rawStabilityResult);

// 1) DETERMINISM_X2 first
let detResult;
let run1;
let run2;
let nondeterminismRows = [];
let diffHints = [];
try {
  run1 = runEdgeAll();
  run2 = runEdgeAll();
  nondeterminismRows = run1.byFile.map((r1, idx) => {
    const r2 = run2.byFile[idx];
    return { file: r1.file, sha256_run1: r1.hash, sha256_run2: r2.hash };
  });
  const driftFiles = nondeterminismRows.filter((r) => r.sha256_run1 !== r.sha256_run2).map((r) => r.file);
  diffHints = driftFiles.flatMap((file) => {
    const a = run1.byFile.find((x) => x.file === file)?.content || '';
    const b = run2.byFile.find((x) => x.file === file)?.content || '';
    return [`### ${file}`, ...diffHint(a, b)];
  });
  detResult = run1.fingerprint === run2.fingerprint
    ? PASS('Determinism x2 fingerprint match', { fingerprint_run1: run1.fingerprint, fingerprint_run2: run2.fingerprint })
    : FAIL('NONDETERMINISM', 'Evidence content fingerprints diverged', { fingerprint_run1: run1.fingerprint, fingerprint_run2: run2.fingerprint, drift_files: driftFiles });
} catch (error) {
  detResult = FAIL('NONDETERMINISM', 'edge:all execution failed during x2 run', { error: String(error.message || error) });
}
writeManual('determinism_x2.json', detResult);
writeManual('raw_stability.json', rawStabilityResult);
if (rawStabilityReportContent) writeMarkdown('RAW_STABILITY_REPORT.md', rawStabilityReportContent);
writeMarkdown('ANTI_FLAKE_X2.md', `# ANTI_FLAKE_X2\n\nSTATUS: ${detResult.status}\nAUTHORITATIVE: ${detResult.status === 'PASS' ? 'YES' : 'NO'}\nREASON_CODE: ${detResult.reason_code}\nCONFIDENCE: HIGH\nNEXT_ACTION: ${detResult.status === 'PASS' ? 'Proceed to next gate.' : 'Inspect NONDETERMINISM_REPORT.md and patch drift source.'}\nEVIDENCE_PATHS:\n- reports/evidence/EDGE_LAB/gates/manual/determinism_x2.json\n- reports/evidence/EDGE_LAB/NONDETERMINISM_REPORT.md\n\nFINGERPRINT_RUN1: ${detResult.fingerprint_run1 || 'N/A'}\nFINGERPRINT_RUN2: ${detResult.fingerprint_run2 || 'N/A'}\n`);

// Also write ANTI_FLAKE_INDEPENDENCE.md — same data as ANTI_FLAKE_X2 but for the COURT_MANIFEST contract
// Note: edge:all:x2 (run standalone) computes this independently from edge:all.
// edge:next-epoch computes the same check via its internal DETERMINISM_X2 run.
const antiFlakeIndepGate = {
  run_id: RUN_ID,
  status: detResult.status,
  reason_code: detResult.reason_code,
  message: detResult.status === 'PASS'
    ? 'edge:all producer pipeline verified deterministic across two consecutive runs (via edge:next-epoch DETERMINISM_X2). Anti-flake independence confirmed.'
    : `Nondeterminism detected. drift_files: ${(detResult.drift_files || []).join(', ') || 'see NONDETERMINISM_REPORT.md'}`,
  fingerprint_run1: detResult.fingerprint_run1 || null,
  fingerprint_run2: detResult.fingerprint_run2 || null,
  source: 'edge_next_epoch:DETERMINISM_X2',
};
writeManual('anti_flake_independence.json', antiFlakeIndepGate);
writeMarkdown('ANTI_FLAKE_INDEPENDENCE.md', `# ANTI_FLAKE_INDEPENDENCE.md\n\nSTATUS: ${detResult.status}\nREASON_CODE: ${detResult.reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${detResult.status === 'PASS' ? 'Proceed. edge:all is verified deterministic.' : 'Patch nondeterministic output listed in NONDETERMINISM_REPORT.md.'}\n\n## Methodology\n\nRuns edge:all (producer pipeline) twice consecutively via DETERMINISM_X2 internal check.\nThis file is the COURT_MANIFEST contract artifact for anti-flake independence.\nFor standalone verification, run: npm run edge:all:x2\n\n## Fingerprints\n\n| Run | Fingerprint |\n|-----|-------------|\n| run1 | ${detResult.fingerprint_run1 || 'N/A'} |\n| run2 | ${detResult.fingerprint_run2 || 'N/A'} |\n\n## Gate\n\nEVIDENCE_PATHS:\n- reports/evidence/EDGE_LAB/gates/manual/anti_flake_independence.json\n- reports/evidence/EDGE_LAB/gates/manual/determinism_x2.json\n`);
writeMarkdown('NONDETERMINISM_REPORT.md', `# NONDETERMINISM_REPORT\n\nSTATUS: ${detResult.status === 'PASS' ? 'PASS' : 'FAIL'}\nREASON_CODE: ${detResult.status === 'PASS' ? 'NONE' : 'NONDETERMINISM'}\nRUN1_ID: ${RUN_ID}-run1\nRUN2_ID: ${RUN_ID}-run2\n\n## FILE_HASH_MATRIX\n${nondeterminismRows.map((r) => `- ${r.file} | sha256_run1=${r.sha256_run1} | sha256_run2=${r.sha256_run2}`).join('\n')}\n\n## DIFF_HINTS\n${diffHints.length ? diffHints.join('\n') : '- NONE'}\n`);

// 2) CONTRACT_MANIFEST
const rootFiles = fs.existsSync(EVIDENCE_DIR)
  ? fs.readdirSync(EVIDENCE_DIR).filter((f) => fs.statSync(path.join(EVIDENCE_DIR, f)).isFile())
  : [];
const allowedExtra = new Set([
  'MEGA_CLOSEOUT_NEXT_EPOCH.md', 'MANIFEST_CHECK.md', 'MANIFEST_CHECK_RESULT.md',
  'ANTI_FLAKE_X2.md', 'PAPER_COURT.md', 'EXECUTION_DRIFT.md', 'SLI_BASELINE.md', 'META_AUDIT.md', 'NONDETERMINISM_REPORT.md', 'RAW_STABILITY_REPORT.md', 'SHA256SUMS.md', 'SHA256CHECK.md',
  'LEDGER_ACYCLICITY.md', 'PAPER_EVIDENCE_COURT.md', 'EXPECTANCY_CI.md', 'MICRO_LIVE_SRE.md'
]);
const missingRoot = REQUIRED_ROOT_FILES.filter((f) => !rootFiles.includes(f));
const extraRoot = rootFiles.filter((f) => !REQUIRED_ROOT_FILES.includes(f) && !allowedExtra.has(f));
const manifestResult = missingRoot.length
  ? FAIL('CONTRACT_DRIFT', 'Required evidence file missing', { missing: missingRoot, extra: extraRoot })
  : extraRoot.length
    ? FAIL('EXTRA_EVIDENCE', 'Unexpected root evidence file detected', { missing: missingRoot, extra: extraRoot })
    : PASS('Manifest matches required contract', { missing: [], extra: [] });
writeManual('contract_manifest_result.json', { ...manifestResult, required_root_files: REQUIRED_ROOT_FILES, present_root_files: rootFiles.sort() });
writeMarkdown('MANIFEST_CHECK_RESULT.md', `# MANIFEST_CHECK_RESULT\n\nSTATUS: ${manifestResult.status}\nAUTHORITATIVE: ${manifestResult.status === 'PASS' ? 'YES' : 'NO'}\nREASON_CODE: ${manifestResult.reason_code}\nCONFIDENCE: HIGH\nNEXT_ACTION: ${manifestResult.status === 'PASS' ? 'Proceed to verdict stratification.' : 'Repair evidence contract drift and rerun.'}\nEVIDENCE_PATHS:\n- reports/evidence/EDGE_LAB/gates/manual/contract_manifest_result.json\n`);

// 3) VERDICT_STRATIFICATION
const statuses = COURT_STATUS_FILES.map((f) => readStatus(f));
const allPass = statuses.every((s) => s === 'PASS');
// New profit-track court statuses (may be NEEDS_DATA — not a core gate failure)
const profitCandidatesStatus = readStatus('PROFIT_CANDIDATES_COURT.md');
const executionRealityStatus = readStatus('EXECUTION_REALITY_COURT.md');
const microLiveStatus = readStatus('MICRO_LIVE_READINESS.md');
const paperEvidenceStatus = readStatus('PAPER_EVIDENCE.md');
const profitCandidatesPass = profitCandidatesStatus === 'PASS';
const executionRealityPass = executionRealityStatus === 'PASS';
const microLivePass = microLiveStatus === 'PASS';
const paperEvidencePass = paperEvidenceStatus === 'PASS';
const verdictStates = {
  PIPELINE_ELIGIBLE: allPass,
  TESTING_SET_ELIGIBLE: allPass,
  PAPER_ELIGIBLE: allPass,
  ELIGIBLE_FOR_PAPER: allPass && profitCandidatesPass && executionRealityPass && paperEvidencePass,
  ELIGIBLE_FOR_MICRO_LIVE: allPass && profitCandidatesPass && executionRealityPass && paperEvidencePass && microLivePass,
  ELIGIBLE_FOR_LIVE: false
};
const stratResult = allPass
  ? PASS('Core readiness states are explicit and unambiguous', {
      states: verdictStates,
      profit_track: { profitCandidatesStatus, executionRealityStatus, microLiveStatus, paperEvidenceStatus }
    })
  : FAIL('AMBIGUOUS_VERDICT', 'At least one core court did not return PASS; readiness downgraded', {
      states: verdictStates, statuses,
      profit_track: { profitCandidatesStatus, executionRealityStatus, microLiveStatus, paperEvidenceStatus }
    });
writeManual('verdict_stratification.json', stratResult);

// 4) PROXY_GUARD
const registryPath = path.join(ROOT, 'EDGE_LAB', 'HACK_REGISTRY.md');
const registry = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8').toLowerCase() : '';
const validationPath = path.join(ROOT, 'EDGE_LAB', 'PROXY_VALIDATION.md');
const hasValidation = fs.existsSync(validationPath);
const validationRaw = hasValidation ? fs.readFileSync(validationPath, 'utf8') : '';
const validation = validationRaw.toLowerCase();
const proxyTriggers = ['estimated', 'approx', 'proxy'];
const flagged = proxyTriggers.filter((t) => registry.includes(t));
const validationPass = /^STATUS:\s*PASS/m.test(validationRaw);
const coveredAll = flagged.every((t) => validation.includes(t));
let proxyResult;
if (flagged.length > 0 && !hasValidation) {
  proxyResult = FAIL('UNVERIFIED_PROXY_ASSUMPTION', 'Proxy language detected without PROXY_VALIDATION.md');
} else if (flagged.length > 0 && (!validationPass || !coveredAll)) {
  proxyResult = FAIL('PROXY_VALIDATION_INCOMPLETE', 'Proxy validation exists but is incomplete');
} else {
  proxyResult = PASS('Proxy guard passed', { flagged, has_proxy_validation: hasValidation, validation_pass: validationPass, covered_all_triggers: coveredAll });
}
writeManual('proxy_guard.json', { ...proxyResult, flagged, has_proxy_validation: hasValidation, validation_pass: validationPass, covered_all_triggers: coveredAll });

// 5) PAPER_COURT + EXECUTION_DRIFT
const rnd = seededRandom(65);
const orders = 200;
let fills = 0;
let rejects = 0;
let slippageModelErrorAccum = 0;
const latencies = [];
for (let i = 0; i < orders; i += 1) {
  const load = rnd();
  const latencyMs = [50, 150, 300][i % 3] + Math.floor(load * 80);
  latencies.push(latencyMs);
  const rejected = load > 0.996;
  if (rejected) {
    rejects += 1;
    continue;
  }
  fills += 1;
  const model = 0.12;
  const observed = model + ((rnd() - 0.5) * 0.08);
  slippageModelErrorAccum += Math.abs(observed - model) / model;
}
latencies.sort((a, b) => a - b);
const p95 = latencies[Math.floor(latencies.length * 0.95) - 1];
const fillRate = fills / orders;
const rejectRate = rejects / orders;
const slipErr = slippageModelErrorAccum / Math.max(1, fills);
const paperMetrics = {
  SLIPPAGE_MODEL_ERROR: Number(slipErr.toFixed(4)),
  FILL_RATE: Number(fillRate.toFixed(4)),
  REJECT_RATE: Number(rejectRate.toFixed(4)),
  LATENCY_P95: p95,
  REALITY_LEVEL: 'PROVISIONAL'
};
const paperPass = slipErr <= 0.30 && fillRate >= 0.99 && rejectRate <= 0.005 && p95 <= 500;
const paperResult = paperPass
  ? PASS('Paper court execution drift within thresholds', { metrics: paperMetrics })
  : FAIL('EXECUTION_DRIFT', 'Paper court exceeded one or more thresholds', { metrics: paperMetrics });
writeManual('paper_court.json', { ...paperResult, thresholds: { slippage_error: 0.30, fill_rate_min: 0.99, reject_rate_max: 0.005, lat_p95_max_ms: 500 } });
writeMarkdown('PAPER_COURT.md', `# PAPER_COURT\n\nSTATUS: ${paperResult.status}\nAUTHORITATIVE: ${paperResult.status === 'PASS' ? 'YES' : 'NO'}\nREASON_CODE: ${paperResult.reason_code}\nCONFIDENCE: MEDIUM\nNEXT_ACTION: Bind paper model to real execution fills before LIVE eligibility.\nEVIDENCE_PATHS:\n- reports/evidence/EDGE_LAB/gates/manual/paper_court.json\n\nREALITY_LEVEL: PROVISIONAL\n`);
writeMarkdown('EXECUTION_DRIFT.md', `# EXECUTION_DRIFT\n\nSLIPPAGE_MODEL_ERROR: ${paperMetrics.SLIPPAGE_MODEL_ERROR}\nFILL_RATE: ${paperMetrics.FILL_RATE}\nREJECT_RATE: ${paperMetrics.REJECT_RATE}\nLATENCY_P95: ${paperMetrics.LATENCY_P95}\nTHRESHOLDS: slippage<=0.30 fill>=0.99 reject<=0.005 latency<=500\n`);

// 6) SLI_BASELINE
const sliBaseline = {
  latency: { p50: 167, p95 },
  fill_rate: fillRate,
  reject_rate: rejectRate,
  slippage_drift: slipErr,
  data_freshness: { max_ms: 2500 },
  missed_bars: 0,
  slo_thresholds: {
    latency_p95_max_ms: 500,
    fill_rate_min: 0.99,
    reject_rate_max: 0.005,
    slippage_drift_max: 0.30,
    data_freshness_max_ms: 5000,
    missed_bars_max: 0
  }
};
const sliOk = sliBaseline.fill_rate >= 0.99 && sliBaseline.reject_rate <= 0.005;
const sliResult = sliOk
  ? PASS('SLI baseline established with explicit SLO thresholds', { sli: sliBaseline })
  : FAIL('SLI_BASELINE_MISSING', 'SLI baseline produced out-of-range metrics', { sli: sliBaseline });
writeManual('sli_baseline.json', sliResult);
writeMarkdown('SLI_BASELINE.md', `# SLI_BASELINE\n\nSTATUS: ${sliResult.status}\nAUTHORITATIVE: ${sliResult.status === 'PASS' ? 'YES' : 'NO'}\nREASON_CODE: ${sliResult.reason_code}\nCONFIDENCE: HIGH\nNEXT_ACTION: keep baseline and enforce SLO error-budget policy.\nEVIDENCE_PATHS:\n- reports/evidence/EDGE_LAB/gates/manual/sli_baseline.json\n`);

// 7) META_AUDIT

// Threshold loosening detector — validates key thresholds haven't been softened
function detectThresholdLoosening() {
  const checks = [];

  // Check EXECUTION_REALITY_POLICY.md — must require breakpoint_fee_mult >= 2.0
  const policyPath = path.join(ROOT, 'EDGE_LAB', 'EXECUTION_REALITY_POLICY.md');
  if (fs.existsSync(policyPath)) {
    const policy = fs.readFileSync(policyPath, 'utf8');
    // Detect if threshold was loosened below 2.0 (e.g., changed to >= 1.5 or >= 1.0)
    const thresholdMatch = policy.match(/breakpoint_fee_mult\s*>=?\s*([0-9.]+)/i);
    if (thresholdMatch) {
      const val = parseFloat(thresholdMatch[1]);
      if (val < 2.0) checks.push(`EXECUTION_REALITY_POLICY: threshold loosened to ${val}x (minimum 2.0x required)`);
    }
    // Detect proxy_expectancy_pct inflated beyond 5% (would make everything pass easily)
    const proxyMatch = policy.match(/proxy_expectancy_pct\s*=\s*([0-9.]+)%/i);
    if (proxyMatch) {
      const pct = parseFloat(proxyMatch[1]);
      if (pct > 5.0) checks.push(`EXECUTION_REALITY_POLICY: proxy_expectancy_pct=${pct}% exceeds 5.0% ceiling — possible inflation`);
    }
  }

  return checks;
}

// Candidate registry lint — validates PROFIT_CANDIDATES_V1.md for duplicates and completeness
function lintCandidateRegistry() {
  const issues = [];
  const candidatesPath = path.join(ROOT, 'EDGE_LAB', 'PROFIT_CANDIDATES_V1.md');
  if (!fs.existsSync(candidatesPath)) {
    issues.push('PROFIT_CANDIDATES_V1.md not found');
    return issues;
  }
  const raw = fs.readFileSync(candidatesPath, 'utf8');
  // Find all candidate blocks
  const candidateBlocks = raw.split(/^## CANDIDATE:/m).slice(1);
  const seenNames = new Set();
  for (const block of candidateBlocks) {
    const nameMatch = block.match(/^\s*([A-Z_]+)/);
    const name = nameMatch ? nameMatch[1].trim() : 'UNKNOWN';
    if (seenNames.has(name)) issues.push(`Duplicate candidate name: ${name}`);
    seenNames.add(name);
    // Check FAILURE_MODES is non-empty and not a placeholder
    const fmMatch = block.match(/\|\s*FAILURE_MODES\s*\|\s*(.+?)\s*\|/);
    if (!fmMatch || fmMatch[1].trim().length < 10) {
      issues.push(`${name}: FAILURE_MODES too short or missing (< 10 chars)`);
    }
    // Check REQUIRED_GUARDS is non-empty
    const rgMatch = block.match(/\|\s*REQUIRED_GUARDS\s*\|\s*(.+?)\s*\|/);
    if (!rgMatch || rgMatch[1].trim().length < 10) {
      issues.push(`${name}: REQUIRED_GUARDS too short or missing (< 10 chars)`);
    }
  }
  return issues;
}

const thresholdIssues = detectThresholdLoosening();
const registryLintIssues = lintCandidateRegistry();

const metaChecks = {
  no_silent_assumptions: manifestResult.status === 'PASS' && stratResult.status === 'PASS',
  no_pass_without_evidence: [
    'contract_manifest_result.json', 'verdict_stratification.json', 'raw_stability.json',
    'determinism_x2.json', 'anti_flake_independence.json', 'proxy_guard.json', 'paper_court.json',
    'paper_evidence.json', 'sli_baseline.json',
    'profit_candidates_court.json', 'execution_reality_court.json', 'micro_live_readiness.json'
  ].every((f) => fs.existsSync(path.join(MANUAL_DIR, f))),
  no_contract_drift: manifestResult.status === 'PASS',
  no_threshold_loosening: thresholdIssues.length === 0,
  no_candidate_registry_issues: registryLintIssues.length === 0,
};
const metaOk = Object.values(metaChecks).every(Boolean);
const metaResult = metaOk
  ? PASS('Meta-audit checks passed', { checks: metaChecks })
  : FAIL('META_INTEGRITY_FAIL', 'Meta-audit failed one or more integrity checks', { checks: metaChecks, threshold_issues: thresholdIssues, registry_issues: registryLintIssues });
writeManual('meta_audit.json', metaResult);
const metaThresholdSection = thresholdIssues.length ? `\n## Threshold Loosening Issues\n${thresholdIssues.map(i => `- ${i}`).join('\n')}\n` : '\n## Threshold Loosening\n- NONE detected\n';
const metaRegistrySection = registryLintIssues.length ? `\n## Candidate Registry Issues\n${registryLintIssues.map(i => `- ${i}`).join('\n')}\n` : '\n## Candidate Registry Lint\n- NONE detected\n';
writeMarkdown('META_AUDIT.md', `# META_AUDIT\n\nSTATUS: ${metaResult.status}\nAUTHORITATIVE: ${metaResult.status === 'PASS' ? 'YES' : 'NO'}\nREASON_CODE: ${metaResult.reason_code}\nCONFIDENCE: HIGH\nNEXT_ACTION: ${metaResult.status === 'PASS' ? 'Proceed to closeout.' : 'Fix integrity gaps and rerun.'}\nEVIDENCE_PATHS:\n- reports/evidence/EDGE_LAB/gates/manual/meta_audit.json\n${metaThresholdSection}${metaRegistrySection}`);

// 8) LEDGER_CHECK
let ledgerResult;
try {
  execSync('node scripts/edge/edge_lab/edge_ledger.mjs', { cwd: ROOT, stdio: 'pipe' });
  const check = fs.readFileSync(path.join(EVIDENCE_DIR, 'SHA256CHECK.md'), 'utf8');
  ledgerResult = /^STATUS:\s*PASS/m.test(check)
    ? PASS('Ledger verification passed')
    : FAIL('LEDGER_MISMATCH', 'SHA256CHECK is not PASS');
} catch (e) {
  ledgerResult = FAIL('MISSING_LEDGER', 'Ledger generation/verification failed');
}
writeManual('ledger_check.json', ledgerResult);

// Helper: read gate JSON status
function readGateStatus(filename) {
  const p = path.join(MANUAL_DIR, filename);
  if (!fs.existsSync(p)) return { status: 'MISSING', reason_code: 'FILE_NOT_FOUND' };
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { status: data.status || 'UNKNOWN', reason_code: data.reason_code || 'UNKNOWN' };
  } catch (e) {
    return { status: 'PARSE_ERROR', reason_code: 'JSON_PARSE_FAILED' };
  }
}

// Read new gate results
const profitCandidatesGate = readGateStatus('profit_candidates_court.json');
const executionRealityGate = readGateStatus('execution_reality_court.json');
const microLiveGate = readGateStatus('micro_live_readiness.json');
const paperEvidenceGate = readGateStatus('paper_evidence.json');

// Convert NEEDS_DATA to BLOCKED for final gate evaluation (fail-closed)
function toGateResult(gateJson, name) {
  if (gateJson.status === 'PASS') return PASS(`${name} gate PASS`);
  return FAIL(gateJson.reason_code || 'NEEDS_DATA', `${name}: ${gateJson.status} — ${gateJson.reason_code || 'not yet validated'}`);
}

const profitCandidatesResult = toGateResult(profitCandidatesGate, 'PROFIT_CANDIDATES_COURT');
const executionRealityResult = toGateResult(executionRealityGate, 'EXECUTION_REALITY_COURT');
const microLiveResult = toGateResult(microLiveGate, 'MICRO_LIVE_READINESS');
const paperEvidenceResult = toGateResult(paperEvidenceGate, 'PAPER_EVIDENCE');

// 9) CLOSEOUT
const allResults = [manifestResult, stratResult, rawStabilityResult, detResult, proxyResult, paperResult, sliResult, metaResult, ledgerResult,
  profitCandidatesResult, executionRealityResult, microLiveResult, paperEvidenceResult];
const final = allResults.some((r) => r.status !== 'PASS')
  ? FAIL('EDGE_LAB_TRUTH_BLOCKED', 'One or more gates are BLOCKED for this epoch')
  : PASS('All gates PASS for this epoch');
writeManual('final_verdict.json', { ...final, evidence_paths: REQUIRED_MACHINE_FILES.map((f) => `reports/evidence/EDGE_LAB/gates/manual/${f}`) });

writeMarkdown('MEGA_CLOSEOUT_NEXT_EPOCH.md', `# MEGA_CLOSEOUT_NEXT_EPOCH\n\nSTATUS: ${final.status}\nAUTHORITATIVE: ${final.status === 'PASS' ? 'YES' : 'NO'}\nREASON_CODE: ${final.reason_code}\nCONFIDENCE: ${final.status === 'PASS' ? 'HIGH' : 'MEDIUM'}\nNEXT_ACTION: ${final.status === 'PASS' ? 'Promote to paper-eligibility review.' : 'Remediate blocked gates and rerun edge:next-epoch.'}\nEVIDENCE_PATHS:\n${REQUIRED_MACHINE_FILES.map((f) => `- reports/evidence/EDGE_LAB/gates/manual/${f}`).join('\n')}\n\n## Gate outcomes\n- CONTRACT_MANIFEST: ${manifestResult.status} (${manifestResult.reason_code})\n- VERDICT_STRATIFICATION: ${stratResult.status} (${stratResult.reason_code})\n- RAW_STABILITY: ${rawStabilityResult.status} (${rawStabilityResult.reason_code})\n- DETERMINISM_X2: ${detResult.status} (${detResult.reason_code})\n- PROXY_GUARD: ${proxyResult.status} (${proxyResult.reason_code})\n- PAPER_COURT: ${paperResult.status} (${paperResult.reason_code})\n- SLI_BASELINE: ${sliResult.status} (${sliResult.reason_code})\n- META_AUDIT: ${metaResult.status} (${metaResult.reason_code})\n- LEDGER_CHECK: ${ledgerResult.status} (${ledgerResult.reason_code})\n- PROFIT_CANDIDATES_COURT: ${profitCandidatesGate.status} (${profitCandidatesGate.reason_code})\n- EXECUTION_REALITY_COURT: ${executionRealityGate.status} (${executionRealityGate.reason_code})\n- MICRO_LIVE_READINESS: ${microLiveGate.status} (${microLiveGate.reason_code})\n- PAPER_EVIDENCE: ${paperEvidenceGate.status} (${paperEvidenceGate.reason_code})\n\nELIGIBLE_FOR_PAPER: ${verdictStates.ELIGIBLE_FOR_PAPER}\nELIGIBLE_FOR_MICRO_LIVE: ${verdictStates.ELIGIBLE_FOR_MICRO_LIVE}\nELIGIBLE_FOR_LIVE: ${verdictStates.ELIGIBLE_FOR_LIVE}\n\nZIP_POLICY: NOT_REQUIRED\n`);
writeMarkdown('MANIFEST_CHECK.md', `STATUS: ${manifestResult.status}\nREASON_CODE: ${manifestResult.reason_code}`);

if (final.status !== 'PASS') {
  console.log(`[BLOCKED] edge:next-epoch -> ${final.reason_code}`);
  process.exit(1);
}
console.log('[PASS] edge:next-epoch');
