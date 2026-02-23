import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00');
const MANUAL_DIR = path.join(EPOCH_DIR, 'gates', 'manual');
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
  const p = path.join(MANUAL_DIR, `${name}.json`);
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

const statuses = Object.values(gateMap).map((g) => g.status);
let status = 'BLOCKED';
let reasonCode = 'EP00';
if (statuses.every((s) => s === 'PASS')) {
  status = 'PASS';
  reasonCode = 'NONE';
} else if (statuses.some((s) => s === 'NEEDS_DATA')) {
  status = 'NEEDS_DATA';
  reasonCode = 'NDA02';
}

const nextAction = status === 'PASS'
  ? 'npm run -s edge:profit:00'
  : status === 'NEEDS_DATA'
    ? 'npm run -s edge:profit:00:sample'
    : 'npm run -s edge:profit:00';

const rows = runResults.map((r) => {
  const g = gateMap[r.gate] || {};
  return `| ${r.gate} | ${r.exit_code} | ${g.status || 'BLOCKED'} | ${g.reason_code || 'ME01'} |`;
}).join('\n');

const md = `# EDGE_PROFIT_00_CLOSEOUT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## Gate Matrix\n\n| Gate | Exit Code | Status | Reason Code |\n|---|---:|---|---|\n${rows}\n`;
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
});

console.log(`[${status}] edge_profit_00_closeout — ${reasonCode}`);
process.exit(status === 'BLOCKED' || status === 'FAIL' ? 1 : 0);
