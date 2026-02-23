import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';
import { resolveProfit00EpochDir, resolveProfit00ManualDir } from './edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const EPOCH_DIR = resolveProfit00EpochDir(ROOT);
const MANUAL_DIR = resolveProfit00ManualDir(ROOT);
const REG_PATH = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry', 'gates', 'manual', 'hypothesis_registry.json');
const EXP_PATH = path.join(MANUAL_DIR, 'expectancy.json');
const LEDGER_PATH = path.join(ROOT, 'EDGE_PROFIT_00', 'TRIALS_LEDGER.md');
const BASE = Number(process.env.OVERFIT_BASE_PSR || 0.95);

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const readJson = (p) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
function parseLedger() {
  if (!fs.existsSync(LEDGER_PATH)) return { errors: ['missing_ledger_file'], rows: [] };
  const rows = [];
  const errors = [];
  const lines = fs.readFileSync(LEDGER_PATH, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('#') || !/^T\d+\|/.test(line)) continue;
    const cols = line.split('|').map((x) => x.trim());
    if (cols.length !== 5) {
      errors.push(`bad_format:${line}`);
      continue;
    }
    const [trial_id, hypothesis_id, dataset_sha, result_sha, verdict] = cols;
    if (!trial_id || !hypothesis_id || !dataset_sha || !result_sha || !verdict) errors.push(`missing_column:${line}`);
    rows.push({ trial_id, hypothesis_id, dataset_sha, result_sha, verdict });
  }
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.trial_id)) errors.push(`duplicate_trial_id:${row.trial_id}`);
    seen.add(row.trial_id);
  }
  return { errors, rows };
}

const reg = readJson(REG_PATH);
const exp = readJson(EXP_PATH);
const ledger = parseLedger();

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

if (ledger.rows.length === 0 || ledger.errors.length > 0) {
  const status = 'BLOCKED';
  const reasonCode = 'OF02';
  const nextAction = 'npm run -s edge:profit:00:overfit';
  writeMd(path.join(EPOCH_DIR, 'OVERFIT_DEFENSE.md'), `# OVERFIT_DEFENSE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\nTrial ledger missing or invalid.\n\n${ledger.errors.map((e) => `- ${e}`).join('\n') || '- empty_ledger'}`);
  writeJsonDeterministic(path.join(MANUAL_DIR, 'overfit.json'), {
    schema_version: '1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
    message: 'Trial ledger missing or invalid.', next_action: nextAction, trials_n: 0, ledger_errors: ledger.errors,
  });
  console.log(`[${status}] edge_overfit_court_mvp — ${reasonCode}`);
  process.exit(1);
}

const trialsN = Number(ledger.rows.length);
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

const nextAction = status === 'PASS' ? 'npm run -s edge:profit:00' : status === 'NEEDS_DATA' ? 'npm run -s edge:profit:00:sample' : 'npm run -s edge:profit:00';

const md = `# OVERFIT_DEFENSE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## MVP Defense\n\n- trials_n: ${trialsN}\n- base_psr_threshold: ${BASE.toFixed(6)}\n- corrected_psr_threshold: ${corrected.toFixed(6)}\n- expectancy_status: ${exp.status}\n- psr0: ${psr0.toFixed(6)}\n- trial_ledger_path: EDGE_PROFIT_00/TRIALS_LEDGER.md\n`;
writeMd(path.join(EPOCH_DIR, 'OVERFIT_DEFENSE.md'), md);

writeJsonDeterministic(path.join(MANUAL_DIR, 'overfit.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: status === 'PASS' ? 'Overfit MVP defense passed with corrected PSR threshold and valid trial ledger.' : status === 'NEEDS_DATA' ? 'Overfit court needs more expectancy data.' : 'Overfit MVP defense did not pass corrected PSR threshold.',
  next_action: nextAction,
  trials_n: trialsN,
  base_psr_threshold: Number(BASE.toFixed(8)),
  corrected_psr_threshold: Number(corrected.toFixed(8)),
  psr0: Number(psr0.toFixed(8)),
  expectancy_status: exp.status,
  trial_ledger_path: 'EDGE_PROFIT_00/TRIALS_LEDGER.md',
});

console.log(`[${status}] edge_overfit_court_mvp — ${reasonCode}`);
process.exit(status === 'BLOCKED' ? 1 : 0);
