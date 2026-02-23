import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const CLOSEOUT_JSON = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'real', 'gates', 'manual', 'edge_profit_00_closeout.json');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Stub promotion regression passed (promotion remains false).';
let nextAction = 'npm run -s executor:run:chain';
let closeoutStatus = 'MISSING';
let evidenceSource = 'UNKNOWN';
let eligible = null;

try {
  execSync('npm run -s edge:profit:00:real:stub', { cwd: ROOT, stdio: 'pipe' });
  execSync('npm run -s edge:profit:00', { cwd: ROOT, stdio: 'pipe' });
} catch {
  status = 'BLOCKED';
  reasonCode = 'ME01';
  message = 'Failed to execute stub regression commands.';
  nextAction = 'npm run -s edge:profit:00:real:stub';
}

if (status === 'PASS') {
  if (!fs.existsSync(CLOSEOUT_JSON)) {
    status = 'BLOCKED';
    reasonCode = 'ME01';
    message = 'Missing closeout json after stub regression run.';
    nextAction = 'npm run -s edge:profit:00';
  } else {
    const closeout = JSON.parse(fs.readFileSync(CLOSEOUT_JSON, 'utf8'));
    closeoutStatus = String(closeout.status || 'MISSING');
    evidenceSource = String(closeout.evidence_source || 'UNKNOWN');
    eligible = Boolean(closeout.eligible_for_profit_track);

    if (eligible) {
      status = 'FAIL';
      reasonCode = 'PRM01';
      message = 'Regression failure: stub/fixture path promoted as eligible_for_profit_track=true.';
      nextAction = 'npm run -s edge:profit:00:import:csv';
    }
  }
}

writeMd(path.join(REG_DIR, 'REGRESSION_NO_STUB_PROMOTION.md'), `# REGRESSION_NO_STUB_PROMOTION.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n- closeout_json: reports/evidence/EDGE_PROFIT_00/real/gates/manual/edge_profit_00_closeout.json\n- closeout_status: ${closeoutStatus}\n- evidence_source: ${evidenceSource}\n- eligible_for_profit_track: ${eligible === null ? 'MISSING' : eligible}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_no_stub_promotion.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: nextAction,
  closeout_status: closeoutStatus,
  evidence_source: evidenceSource,
  eligible_for_profit_track: eligible,
});

console.log(`[${status}] regression_no_stub_promotion — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
