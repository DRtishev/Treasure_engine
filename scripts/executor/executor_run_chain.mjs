import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { resolveProfit00ManualDir } from '../edge/edge_lab/edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const COMMANDS_MD = path.join(EXEC_DIR, 'COMMANDS_RUN.md');
const SSOT_ENTRYPOINT = 'npm run -s executor:run:chain';
const INGEST_GATE = path.join(resolveProfit00ManualDir(ROOT), 'paper_evidence_ingest.json');

fs.mkdirSync(EXEC_DIR, { recursive: true });

const VERIFY_MODE = (process.env.VERIFY_MODE || 'GIT').toUpperCase();

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

function runShell(cmd, forceNetKill = false) {
  const startedAt = new Date().toISOString();
  const env = forceNetKill ? { ...process.env, TREASURE_NET_KILL: '1' } : process.env;
  const result = spawnSync('bash', ['-lc', cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    env,
    maxBuffer: 16 * 1024 * 1024,
  });
  const completedAt = new Date().toISOString();
  return {
    cmd,
    startedAt,
    completedAt,
    ec: Number.isInteger(result.status) ? result.status : 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    net_kill: forceNetKill ? 1 : 0,
  };
}

function isVerifyStep(cmd) {
  return /(npm run -s (verify:|gov:|p0:all|edge:profit:0[12]:|export:final-validated))/i.test(cmd);
}

const npmVersion = runShell('npm -v');
const laneA = [
  'npm run -s verify:env:authority',
  'ENABLE_SQLITE_PERSISTENCE=0 TREASURE_OMIT_OPTIONAL_PROOF=1 npm ci --omit=optional',
  'npm run -s p0:all',
  'npm run -s gov:integrity',
  'npm run -s edge:profit:01:super',
];

if (fs.existsSync(path.join(ROOT, 'scripts', 'edge', 'edge_lab', 'edge_walk_forward_lite.mjs'))) {
  laneA.push('npm run -s edge:profit:01:wf-lite');
}

const laneBBase = [
  'npm run -s edge:profit:02:expectancy-proof',
  'npm run -s edge:profit:02:pbo',
  'npm run -s edge:profit:02:risk',
  'npm run -s edge:profit:02:proof:index',
];

const laneAFinal = [
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
      `STARTED_AT: ${r.startedAt}`,
      `COMPLETED_AT: ${r.completedAt}`,
      '```',
      out || '(no output)',
      '```',
      '',
    ].join('\n');
  }).join('');

  const notes = status === 'PASS'
    ? '- executor_chain_verdict: PASS'
    : `- executor_chain_verdict: ${status}`;

  const md = [
    '# COMMANDS_RUN',
    'GENERATED_BY: scripts/executor/executor_run_chain.mjs',
    `NODE_VERSION: ${process.version}`,
    `NPM_VERSION: ${npmVersion.ec === 0 ? npmVersion.stdout.trim() : 'MISSING'}`,
    `RUN_ID: ${RUN_ID}`,
    `VERIFY_MODE: ${VERIFY_MODE}`,
    `LANE_A_STATUS: ${laneAStatus}`,
    `LANE_B_STATUS: ${laneBStatus}`,
    `LANE_B_MODE: ${laneBMode}`,
    `NEXT_ACTION: ${SSOT_ENTRYPOINT}`,
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
}

function appendRun(records, cmd, lane) {
  const rec = runShell(cmd, isVerifyStep(cmd));
  rec.lane = lane;
  records.push(rec);
  return rec;
}

const records = [];
const evidenceSource = detectEvidenceSource();
const laneBReal = evidenceSource === 'REAL' || evidenceSource === 'REAL_PUBLIC';
const laneBMode = laneBReal ? 'LIVE_REQUIRED' : 'DRY_RUN';
const laneB = laneBReal ? laneBBase : laneBBase.map((c) => `EDGE_PROFIT_DRY_RUN=1 ${c}`);

render(records, 'RUNNING', 'RUN01', laneBMode);

for (const cmd of laneA) {
  const rec = appendRun(records, cmd, 'A');
  if (rec.ec !== 0) {
    render(records, 'BLOCKED', 'EC01', laneBMode);
    console.log('[BLOCKED] executor_run_chain — EC01');
    process.exit(1);
  }
  render(records, 'RUNNING', 'RUN01', laneBMode);
}

for (const cmd of laneB) {
  const rec = appendRun(records, cmd, 'B');
  if (rec.ec !== 0 && laneBReal) {
    render(records, 'BLOCKED', 'EC01', laneBMode);
    console.log('[BLOCKED] executor_run_chain — EC01');
    process.exit(1);
  }
  render(records, 'RUNNING', 'RUN01', laneBMode);
}

for (const cmd of laneAFinal) {
  const rec = appendRun(records, cmd, 'A');
  if (rec.ec !== 0) {
    render(records, 'BLOCKED', 'EC01', laneBMode);
    console.log('[BLOCKED] executor_run_chain — EC01');
    process.exit(1);
  }
  render(records, 'RUNNING', 'RUN01', laneBMode);
}

render(records, 'PASS', 'NONE', laneBMode);
console.log('[PASS] executor_run_chain — NONE');
