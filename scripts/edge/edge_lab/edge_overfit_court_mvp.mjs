import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00');
const MANUAL_DIR = path.join(EPOCH_DIR, 'gates', 'manual');
const REG_PATH = path.join(MANUAL_DIR, 'hypothesis_registry.json');
const EXP_PATH = path.join(MANUAL_DIR, 'expectancy.json');
const BASE = Number(process.env.OVERFIT_BASE_PSR || 0.95);

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const readJson = (p) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
const reg = readJson(REG_PATH);
const exp = readJson(EXP_PATH);

if (!reg || !exp) {
  const status = 'BLOCKED';
  const reasonCode = 'ME01';
  const nextAction = 'npm run -s edge:profit:00';
  writeMd(path.join(EPOCH_DIR, 'OVERFIT_DEFENSE.md'), `# OVERFIT_DEFENSE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\nMissing registry or expectancy evidence.`);
  writeJsonDeterministic(path.join(MANUAL_DIR, 'overfit.json'), {
    schema_version: '1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
    message: 'Missing registry or expectancy evidence.', next_action: nextAction, trials_n: 0,
  });
  console.log(`[${status}] edge_overfit_court_mvp — ${reasonCode}`);
  process.exit(1);
}

const trialsN = Number(reg.hypothesis_count || 0);
if (!Number.isFinite(trialsN) || trialsN <= 0) {
  const status = 'BLOCKED';
  const reasonCode = 'OF01';
  const nextAction = 'npm run -s edge:profit:00:registry';
  writeMd(path.join(EPOCH_DIR, 'OVERFIT_DEFENSE.md'), `# OVERFIT_DEFENSE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\nTrial registry is empty.`);
  writeJsonDeterministic(path.join(MANUAL_DIR, 'overfit.json'), {
    schema_version: '1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
    message: 'Trial registry empty.', next_action: nextAction, trials_n: 0,
  });
  console.log(`[${status}] edge_overfit_court_mvp — ${reasonCode}`);
  process.exit(1);
}

const corrected = Math.min(0.995, BASE + 0.01 * Math.log(Math.max(1, trialsN)));
const psr0 = Number(exp.psr0 || 0);

let status = 'BLOCKED';
let reasonCode = 'OF90';
if (exp.status === 'NEEDS_DATA') {
  status = 'NEEDS_DATA';
  reasonCode = 'NDA02';
} else if (exp.status === 'PASS' && psr0 >= corrected) {
  status = 'PASS';
  reasonCode = 'NONE';
}

const nextAction = status === 'PASS'
  ? 'npm run -s edge:profit:00'
  : status === 'NEEDS_DATA'
    ? 'npm run -s edge:profit:00:sample'
    : 'npm run -s edge:profit:00';

const md = `# OVERFIT_DEFENSE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## MVP Defense\n\n- trials_n: ${trialsN}\n- base_psr_threshold: ${BASE.toFixed(6)}\n- corrected_psr_threshold: ${corrected.toFixed(6)}\n- expectancy_status: ${exp.status}\n- psr0: ${psr0.toFixed(6)}\n`;
writeMd(path.join(EPOCH_DIR, 'OVERFIT_DEFENSE.md'), md);

writeJsonDeterministic(path.join(MANUAL_DIR, 'overfit.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: status === 'PASS'
    ? 'Overfit MVP defense passed with corrected PSR threshold.'
    : status === 'NEEDS_DATA'
      ? 'Overfit court needs more expectancy data.'
      : 'Overfit MVP defense did not pass corrected PSR threshold.',
  next_action: nextAction,
  trials_n: trialsN,
  base_psr_threshold: Number(BASE.toFixed(8)),
  corrected_psr_threshold: Number(corrected.toFixed(8)),
  psr0: Number(psr0.toFixed(8)),
  expectancy_status: exp.status,
});

console.log(`[${status}] edge_overfit_court_mvp — ${reasonCode}`);
process.exit(status === 'BLOCKED' ? 1 : 0);
