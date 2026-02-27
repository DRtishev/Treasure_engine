import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const closeoutJsonPath = path.join(ROOT, 'reports/evidence/EDGE_LAB/P0/gates/manual/victory_epoch_closeout.json');
const closeoutMdPath = path.join(ROOT, 'reports/evidence/EDGE_LAB/P0/VICTORY_EPOCH_CLOSEOUT.md');
const victoryPath = path.join(ROOT, 'reports/evidence', `EPOCH-VICTORY-${RUN_ID}`, 'gates/manual/victory_seal.json');

const checks = {
  closeout_json_exists: fs.existsSync(closeoutJsonPath),
  closeout_md_exists: fs.existsSync(closeoutMdPath),
  victory_seal_exists: fs.existsSync(victoryPath),
};

let closeout = null;
let victory = null;
if (checks.closeout_json_exists) closeout = JSON.parse(fs.readFileSync(closeoutJsonPath, 'utf8'));
if (checks.victory_seal_exists) victory = JSON.parse(fs.readFileSync(victoryPath, 'utf8'));

if (closeout && victory) {
  const closeoutPositive = ['PASS', 'NEEDS_DATA'].includes(String(closeout.status || ''));
  const victoryBad = ['TO01', 'FAIL'].includes(String(victory.reason_code || '')) || String(victory.status || '') === 'BLOCKED';
  checks.closeout_not_positive_when_victory_bad = !(closeoutPositive && victoryBad);
  checks.closeout_reason_allowed = ['NONE', 'RDY01'].includes(String(closeout.reason_code || '')) || String(closeout.status || '') === 'BLOCKED';
  checks.closeout_gate_matrix_consistent = typeof closeout.gate_matrix === 'object' && closeout.gate_matrix !== null;
}

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_CLOSE01';

writeMd(path.join(EXEC, 'REGRESSION_CLOSEOUT_NOT_BEFORE_VICTORY.md'), `# REGRESSION_CLOSEOUT_NOT_BEFORE_VICTORY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_closeout_not_before_victory.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});

console.log(`[${status}] regression_closeout_not_before_victory — ${reason_code}`);
process.exit(ok ? 0 : 1);
