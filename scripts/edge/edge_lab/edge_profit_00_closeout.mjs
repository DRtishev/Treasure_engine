import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';
import { resolveProfit00EpochDir, resolveProfit00ManualDir } from './edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const EPOCH_DIR = resolveProfit00EpochDir(ROOT);
const MANUAL_DIR = resolveProfit00ManualDir(ROOT);
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const LIVE_FLAGS = ['TRADING_ENABLED', 'LIVE_TRADING', 'ORDER_SUBMISSION_ENABLED', 'SUBMIT_ORDERS'];
const activeLiveFlags = LIVE_FLAGS.filter((k) => process.env[k] === '1');
if (activeLiveFlags.length > 0) {
  const status = 'FAIL';
  const reasonCode = 'ZW01';
  const nextAction = 'npm run -s verify:zero:war:probe';
  writeMd(path.join(EPOCH_DIR, 'EDGE_PROFIT_00_CLOSEOUT.md'), `# EDGE_PROFIT_00_CLOSEOUT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\nLive flags detected: ${activeLiveFlags.join(', ')}\n`);
  writeJsonDeterministic(path.join(MANUAL_DIR, 'edge_profit_00_closeout.json'), {
    schema_version: '1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
    message: `Live flag(s) active: ${activeLiveFlags.join(', ')}`,
    next_action: nextAction, active_live_flags: activeLiveFlags,
  });
  console.log(`[${status}] edge_profit_00_closeout — ${reasonCode}`);
  process.exit(1);
}

function run(gate, cmd) {
  try { execSync(cmd, { cwd: ROOT, stdio: 'inherit' }); return { gate, exit_code: 0 }; }
  catch (e) { return { gate, exit_code: e.status || 1 }; }
}
function readGate(name) {
  const p = name === 'hypothesis_registry'
    ? path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry', 'gates', 'manual', 'hypothesis_registry.json')
    : path.join(MANUAL_DIR, `${name}.json`);
  if (!fs.existsSync(p)) return { status: 'BLOCKED', reason_code: 'ME01' };
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const runResults = [
  run('HYPOTHESIS_REGISTRY', 'node scripts/edge/edge_lab/edge_hypothesis_registry_court.mjs'),
  run('PAPER_EVIDENCE_INGEST', 'node scripts/edge/edge_lab/edge_paper_evidence_ingest.mjs'),
  run('EXECUTION_REALITY', 'node scripts/edge/edge_lab/edge_execution_reality_court.mjs'),
  run('EXPECTANCY', 'node scripts/edge/edge_lab/edge_expectancy_court.mjs'),
  run('OVERFIT', 'node scripts/edge/edge_lab/edge_overfit_court_mvp.mjs'),
];

const gateMap = {
  HYPOTHESIS_REGISTRY: readGate('hypothesis_registry'),
  PAPER_EVIDENCE_INGEST: readGate('paper_evidence_ingest'),
  EXECUTION_REALITY: readGate('execution_reality'),
  EXPECTANCY: readGate('expectancy'),
  OVERFIT: readGate('overfit'),
};

const gatesInOrder = runResults.map((r) => gateMap[r.gate] || { status: 'BLOCKED', reason_code: 'ME01' });
const firstOfStatus = (wanted, preferNonMe01 = false) => {
  if (preferNonMe01) {
    const preferred = gatesInOrder.find((g) => g.status === wanted && g.reason_code !== 'ME01');
    if (preferred) return preferred;
  }
  return gatesInOrder.find((g) => g.status === wanted);
};

let status = 'PASS';
let reasonCode = 'NONE';
const failGate = firstOfStatus('FAIL');
const blockedGate = firstOfStatus('BLOCKED', true) || firstOfStatus('BLOCKED');
const needsDataGate = firstOfStatus('NEEDS_DATA');
if (failGate) {
  status = 'FAIL';
  reasonCode = failGate.reason_code || 'EP00';
} else if (blockedGate) {
  status = 'BLOCKED';
  reasonCode = blockedGate.reason_code || 'EP00';
} else if (needsDataGate) {
  status = 'NEEDS_DATA';
  reasonCode = needsDataGate.reason_code || 'NDA02';
}

const ingestEvidenceSource = String(gateMap.PAPER_EVIDENCE_INGEST?.evidence_source || 'FIXTURE').toUpperCase();
const eligibleForProfitTrack = status === 'PASS' && ingestEvidenceSource === 'REAL';
const promotionReason = eligibleForProfitTrack
  ? 'REAL-only promotion gate satisfied.'
  : ingestEvidenceSource === 'REAL'
    ? 'Closeout not PASS; promotion denied.'
    : 'EP02_REAL_REQUIRED: evidence_source is not REAL.';

const nextAction = status === 'PASS'
  ? 'npm run -s executor:run:chain'
  : status === 'NEEDS_DATA'
    ? 'npm run -s edge:profit:00:import:csv'
    : 'npm run -s edge:profit:00';

const rows = runResults.map((r) => {
  const g = gateMap[r.gate] || {};
  return `| ${r.gate} | ${r.exit_code} | ${g.status || 'BLOCKED'} | ${g.reason_code || 'ME01'} |`;
}).join('\n');

const md = `# EDGE_PROFIT_00_CLOSEOUT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## Eligibility\n\n- evidence_source: ${ingestEvidenceSource}\n- eligible_for_profit_track: ${eligibleForProfitTrack}\n\n## Gate Matrix\n\n| Gate | Exit Code | Status | Reason Code |\n|---|---:|---|---|\n${rows}\n`;
writeMd(path.join(EPOCH_DIR, 'EDGE_PROFIT_00_CLOSEOUT.md'), md);

writeJsonDeterministic(path.join(MANUAL_DIR, 'edge_profit_00_closeout.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: status === 'PASS' ? 'EDGE_PROFIT_00 closeout PASS.' : status === 'NEEDS_DATA' ? 'EDGE_PROFIT_00 needs more telemetry evidence.' : 'EDGE_PROFIT_00 blocked by one or more gates.',
  next_action: nextAction,
  gate_results: runResults.map((r) => ({
    gate: r.gate,
    exit_code: r.exit_code,
    status: gateMap[r.gate]?.status || 'BLOCKED',
    reason_code: gateMap[r.gate]?.reason_code || 'ME01',
  })),
  active_live_flags: [],
  evidence_source: ingestEvidenceSource,
  eligible_for_profit_track: eligibleForProfitTrack,
  promotion_eligibility_reason: promotionReason,
});

console.log(`[${status}] edge_profit_00_closeout — ${reasonCode}`);
process.exit(status === 'BLOCKED' || status === 'FAIL' ? 1 : 0);
