import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { resolveProfit00ManualDir } from '../edge/edge_lab/edge_profit_00_paths.mjs';
import { runBounded } from './spawn_bounded.mjs';
import { COMMANDS_RUN_HEADER_LINES } from './commands_run_header_ssot.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const COMMANDS_MD = path.join(EXEC_DIR, 'COMMANDS_RUN.md');
const NETKILL_LEDGER = path.join(EXEC_DIR, 'NETKILL_LEDGER.json');
const NETKILL_LEDGER_TMP = `${NETKILL_LEDGER}.tmp`;
const NETKILL_LEDGER_SHA = path.join(ROOT, 'artifacts/incoming/NETKILL_LEDGER.sha256');
const NETKILL_LEDGER_SUMMARY = path.join(EXEC_DIR, 'NETKILL_LEDGER_SUMMARY.json');
const NETKILL_LEDGER_SUMMARY_TMP = `${NETKILL_LEDGER_SUMMARY}.tmp`;
const SSOT_ENTRYPOINT = 'npm run -s executor:run:chain';
const INGEST_GATE = path.join(resolveProfit00ManualDir(ROOT), 'paper_evidence_ingest.json');

fs.mkdirSync(EXEC_DIR, { recursive: true });

const VERIFY_MODE = (process.env.VERIFY_MODE || 'GIT').toUpperCase();
const victoryTestMode = process.env.VICTORY_TEST_MODE === '1';
const miniMode = process.env.EXECUTOR_CHAIN_MINI === '1';
const executionMode = miniMode ? 'MINI_CHAIN' : (victoryTestMode ? 'TEST_MODE' : 'FULL');


function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort((a,b)=>a.localeCompare(b)).map((k)=>`${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}


function readMdStatus(abs) {
  if (!fs.existsSync(abs)) return 'MISSING';
  const raw = fs.readFileSync(abs, 'utf8');
  return (raw.match(/^STATUS:\s*(\S+)\s*$/m)?.[1] || 'MISSING').toUpperCase();
}

const LOCKDOWN_CERT_MD = path.join(ROOT, 'reports', 'evidence', 'GOV', 'SYSTEM_LOCKDOWN_CERT.md');
if (fs.existsSync(LOCKDOWN_CERT_MD)) {
  const lockdownStatus = readMdStatus(LOCKDOWN_CERT_MD);
  if (lockdownStatus !== 'PASS') {
    writeMd(COMMANDS_MD, `# COMMANDS_RUN
GENERATED_BY: scripts/executor/executor_run_chain.mjs
RUN_ID: ${RUN_ID}
VERIFY_MODE: ${VERIFY_MODE}
STATUS: FAIL
REASON_CODE: SL02
NEXT_ACTION: ${SSOT_ENTRYPOINT}

- lockdown_cert_status: ${lockdownStatus}`);
    console.log('[FAIL] executor_run_chain — SL02');
    process.exit(1);
  }
}

function buildNetKillNodeOptions(existing = '') {
  const preloadAbs = path.join(ROOT, 'scripts', 'safety', 'net_kill_preload.cjs');
  const preloadFlag = `--require ${JSON.stringify(preloadAbs)}`;
  const normalized = String(existing || '').trim();
  if (normalized.includes(preloadAbs) || normalized.includes(preloadFlag)) return normalized;
  return [normalized, preloadFlag].filter(Boolean).join(' ').trim();
}

function runShell(cmd, forceNetKill = false) {
  const preloadAbs = path.join(ROOT, 'scripts', 'safety', 'net_kill_preload.cjs');
  const nodeOptions = forceNetKill ? buildNetKillNodeOptions(process.env.NODE_OPTIONS) : String(process.env.NODE_OPTIONS || '');
  const env = forceNetKill
    ? { ...process.env, TREASURE_NET_KILL: '1', NODE_OPTIONS: nodeOptions }
    : process.env;
  const result = runBounded(cmd, { cwd: ROOT, env, maxBuffer: 16 * 1024 * 1024 });
  const started_at_ms = Number.isFinite(Date.parse(result.startedAt)) ? Date.parse(result.startedAt) : 0;
  const completed_at_ms = Number.isFinite(Date.parse(result.completedAt)) ? Date.parse(result.completedAt) : started_at_ms;
  return {
    cmd,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    started_at_ms,
    completed_at_ms,
    elapsed_ms: Math.max(0, completed_at_ms - started_at_ms),
    ec: result.ec,
    stdout: result.stdout,
    stderr: result.stderr,
    timed_out: result.timedOut,
    timeout_ms: result.timeout_ms,
    tree_kill_attempted: Boolean(result.tree_kill_attempted),
    tree_kill_ok: Boolean(result.tree_kill_ok),
    tree_kill_note: String(result.tree_kill_note || ''),
    net_kill: forceNetKill ? 1 : 0,
    force_net_kill: Boolean(forceNetKill),
    env_treasure_net_kill: forceNetKill ? String(env.TREASURE_NET_KILL || '') === '1' : false,
    node_options_has_preload: forceNetKill ? nodeOptions.includes(preloadAbs) : false,
    preload_abs_path: preloadAbs,
  };
}

function isVerifyStep(cmd) {
  return /(npm run -s (verify:|gov:|p0:all|edge:profit:0[12]:|export:final-validated))/i.test(cmd);
}

function writeNetKillLedger(records) {
  const normalizedRecords = records.map((r, idx) => ({
    index: Number.isInteger(r.index) ? r.index : idx + 1,
    cmd: r.cmd,
    force_net_kill: Boolean(r.force_net_kill),
    env_treasure_net_kill: Boolean(r.env_treasure_net_kill),
    node_options_has_preload: Boolean(r.node_options_has_preload),
    preload_abs_path: r.preload_abs_path,
    ec: r.ec,
  })).sort((a, b) => (a.index - b.index) || String(a.cmd).localeCompare(String(b.cmd)));
  const data = {
    schema_version: '1.0.0',
    run_id: RUN_ID,
    execution_mode: executionMode,
    records: normalizedRecords,
  };
  const payload = `${stableStringify(data)}\n`;
  fs.writeFileSync(NETKILL_LEDGER_TMP, payload);
  fs.renameSync(NETKILL_LEDGER_TMP, NETKILL_LEDGER);
  fs.mkdirSync(path.dirname(NETKILL_LEDGER_SHA), { recursive: true });
  fs.writeFileSync(NETKILL_LEDGER_SHA, `${sha256(payload)}  reports/evidence/EXECUTOR/NETKILL_LEDGER.json\n`);

  const verifyRecords = normalizedRecords.filter((r) => /npm run -s verify:/i.test(String(r.cmd)));
  const anomalies_detected = normalizedRecords.filter((r) => (
    (/npm run -s verify:/i.test(String(r.cmd)) && (!r.force_net_kill || !r.env_treasure_net_kill || !r.node_options_has_preload))
    || (r.force_net_kill && !/npm run -s verify:/i.test(String(r.cmd)))
  )).map((r) => ({ index: r.index, cmd: r.cmd, ec: r.ec }));
  const summary = {
    schema_version: '1.0.0',
    run_id: RUN_ID,
    execution_mode: executionMode,
    total_steps: normalizedRecords.length,
    verify_steps_forced: verifyRecords.filter((r) => r.force_net_kill).length,
    preload_verified_count: normalizedRecords.filter((r) => r.node_options_has_preload).length,
    anomalies_detected,
  };
  summary.ledger_semantic_hash = sha256(stableStringify({ execution_mode: executionMode, records: normalizedRecords }));
  const summaryPayload = `${stableStringify(summary)}\n`;
  fs.writeFileSync(NETKILL_LEDGER_SUMMARY_TMP, summaryPayload);
  fs.renameSync(NETKILL_LEDGER_SUMMARY_TMP, NETKILL_LEDGER_SUMMARY);
}

const npmVersion = runShell('npm -v');
const laneA = miniMode ? [
  'npm -v',
  'npm run -s verify:netv01:probe',
] : [
  'npm run -s verify:env:authority',
  'ENABLE_SQLITE_PERSISTENCE=0 TREASURE_OMIT_OPTIONAL_PROOF=1 npm ci --omit=optional',
  'npm run -s p0:all',
  'npm run -s gov:integrity',
  'npm run -s edge:profit:01:super',
];

if (fs.existsSync(path.join(ROOT, 'scripts', 'edge', 'edge_lab', 'edge_walk_forward_lite.mjs'))) {
  laneA.push('npm run -s edge:profit:01:wf-lite');
}

const laneBBase = miniMode ? [] : [
  'npm run -s edge:profit:02:expectancy-proof',
  'npm run -s edge:profit:02:pbo',
  'npm run -s edge:profit:02:risk',
  'npm run -s edge:profit:02:proof:index',
];

const laneAFinal = miniMode ? [] : [
  'npm run -s verify:netv01:probe',
  'npm run -s export:final-validated',
  'npm run -s verify:edge:profit:00:release',
  'npm run -s verify:export:contract',
  'npm run -s verify:export:receipt',
  'npm run -s gov:final:index',
  'npm run -s gov:final:fingerprint',
  'npm run -s edge:profit:00:doctor',
  'npm run -s verify:report:contradiction',
  'npm run -s verify:regression:profile-source',
  'npm run -s verify:regression:no-stub-promotion',
  'npm run -s verify:regression:no-sandbox-promotion',
];

function detectEvidenceSource() {
  if (!fs.existsSync(INGEST_GATE)) return 'UNKNOWN';
  try {
    const data = JSON.parse(fs.readFileSync(INGEST_GATE, 'utf8'));
    return String(data.evidence_source || 'UNKNOWN').toUpperCase();
  } catch {
    return 'UNKNOWN';
  }
}

function summarizeLaneA(records) {
  const laneRecs = records.filter((r) => r.lane === 'A');
  if (!laneRecs.length) return 'SKIPPED';
  return laneRecs.every((r) => r.ec === 0) ? 'PASS' : 'BLOCKED';
}

function summarizeLaneB(records, laneBMode) {
  const laneRecs = records.filter((r) => r.lane === 'B');
  if (!laneRecs.length) return 'SKIPPED';
  if (laneBMode === 'DRY_RUN') return laneRecs.every((r) => r.ec === 0) ? 'PASS' : 'NEEDS_DATA';
  return laneRecs.every((r) => r.ec === 0) ? 'PASS' : 'BLOCKED';
}

function render(records, status, reason, laneBMode) {
  const laneAStatus = summarizeLaneA(records);
  const laneBStatus = summarizeLaneB(records, laneBMode);
  const sections = records.map((r, idx) => {
    const out = (r.stdout + r.stderr).trimEnd();
    return [
      `## STEP ${idx + 1}`,
      `LANE: ${r.lane}`,
      `COMMAND: ${r.cmd}`,
      `EC: ${r.ec}`,
      `NET_KILL: ${r.net_kill}`,
      `TIMEOUT_MS: ${r.timeout_ms ?? 'NA'}`,
      `TIMED_OUT: ${Boolean(r.timed_out)}`,
      `STARTED_AT: ${r.startedAt}`,
      `COMPLETED_AT: ${r.completedAt}`,
      `STARTED_AT_MS: ${r.started_at_ms}`,
      `COMPLETED_AT_MS: ${r.completed_at_ms}`,
      `ELAPSED_MS: ${r.elapsed_ms}`,
      `TREE_KILL_ATTEMPTED: ${r.tree_kill_attempted}`,
      `TREE_KILL_OK: ${r.tree_kill_ok}`,
      `TREE_KILL_NOTE: ${r.tree_kill_note}`,
      '```',
      out || '(no output)',
      '```',
      '',
    ].join('\n');
  }).join('');

  const notes = status === 'PASS'
    ? '- executor_chain_verdict: PASS'
    : `- executor_chain_verdict: ${status}`;

  const headerValueByPrefix = {
    'NODE_VERSION:': process.version,
    'NPM_VERSION:': npmVersion.ec === 0 ? npmVersion.stdout.trim() : 'MISSING',
    'RUN_ID:': RUN_ID,
    'VERIFY_MODE:': VERIFY_MODE,
    'LANE_A_STATUS:': laneAStatus,
    'LANE_B_STATUS:': laneBStatus,
    'LANE_B_MODE:': laneBMode,
    'EXECUTION_MODE:': executionMode,
    'NEXT_ACTION:': SSOT_ENTRYPOINT,
  };

  const headerLines = COMMANDS_RUN_HEADER_LINES.map((line) => {
    const value = headerValueByPrefix[line];
    return value === undefined ? line : `${line} ${value}`;
  });

  const md = [
    ...headerLines,
    `STATUS: ${status}`,
    `REASON_CODE: ${reason}`,
    '',
    '## LANE_SUMMARY',
    `- lane_a_status: ${laneAStatus}`,
    `- lane_b_status: ${laneBStatus}`,
    `- lane_b_mode: ${laneBMode}`,
    `- lane_a_net_kill_enforced: 1`,
    `- records_n: ${records.length}`,
    '',
    sections,
    '## NOTES',
    notes,
    '',
  ].join('\n');

  writeMd(COMMANDS_MD, md);
  writeNetKillLedger(records);
}

function appendRun(records, cmd, lane) {
  const rec = runShell(cmd, isVerifyStep(cmd));
  rec.lane = lane;
  rec.index = records.length + 1;
  records.push(rec);
  return rec;
}

const records = [];
const evidenceSource = detectEvidenceSource();
const laneBReal = evidenceSource === 'REAL' || evidenceSource === 'REAL_PUBLIC';
const laneBMode = laneBReal ? 'LIVE_REQUIRED' : 'DRY_RUN';
const laneB = laneBReal ? laneBBase : laneBBase.map((c) => `EDGE_PROFIT_DRY_RUN=1 ${c}`);

if (miniMode && !victoryTestMode) {
  render(records, 'BLOCKED', 'RG_MINI01', laneBMode);
  console.log('[BLOCKED] executor_run_chain — RG_MINI01');
  process.exit(1);
}

render(records, 'RUNNING', 'RUN01', laneBMode);

for (const cmd of laneA) {
  const rec = appendRun(records, cmd, 'A');
  if (rec.ec !== 0) {
    const reason = rec.timed_out ? 'TO01' : 'EC01';
    render(records, 'BLOCKED', reason, laneBMode);
    console.log(`[BLOCKED] executor_run_chain — ${reason}`);
    process.exit(1);
  }
  render(records, 'RUNNING', 'RUN01', laneBMode);
}

for (const cmd of laneB) {
  const rec = appendRun(records, cmd, 'B');
  if (rec.ec !== 0 && laneBReal) {
    const reason = rec.timed_out ? 'TO01' : 'EC01';
    render(records, 'BLOCKED', reason, laneBMode);
    console.log(`[BLOCKED] executor_run_chain — ${reason}`);
    process.exit(1);
  }
  render(records, 'RUNNING', 'RUN01', laneBMode);
}

for (const cmd of laneAFinal) {
  const rec = appendRun(records, cmd, 'A');
  if (rec.ec !== 0) {
    const reason = rec.timed_out ? 'TO01' : 'EC01';
    render(records, 'BLOCKED', reason, laneBMode);
    console.log(`[BLOCKED] executor_run_chain — ${reason}`);
    process.exit(1);
  }
  render(records, 'RUNNING', 'RUN01', laneBMode);
}

render(records, 'PASS', 'NONE', laneBMode);
console.log('[PASS] executor_run_chain — NONE');
