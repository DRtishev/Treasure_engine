import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';
import { resolveProfit00EpochDir, resolveProfit00ManualDir } from './edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const EPOCH_DIR = resolveProfit00EpochDir(ROOT);
const MANUAL_DIR = resolveProfit00ManualDir(ROOT);
const NORM_PATH = path.join(MANUAL_DIR, 'paper_evidence_normalized.json');

const readJson = (p) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
function ci95(values) {
  const n = values.length;
  if (n < 2) return { low: 0, high: 0 };
  const m = mean(values);
  const v = values.reduce((acc, x) => acc + (x - m) ** 2, 0) / (n - 1);
  const s = Math.sqrt(v);
  const margin = 1.96 * s / Math.sqrt(n);
  return { low: m - margin, high: m + margin };
}

const norm = readJson(NORM_PATH);
if (!norm || !Array.isArray(norm.records)) {
  const status = 'BLOCKED';
  const reasonCode = 'ME01';
  const nextAction = 'npm run -s edge:profit:00:ingest';
  writeMd(path.join(EPOCH_DIR, 'WALK_FORWARD_LITE.md'), `# WALK_FORWARD_LITE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\nMissing normalized paper telemetry.`);
  writeJsonDeterministic(path.join(MANUAL_DIR, 'walk_forward_lite.json'), {
    schema_version: '1.0.0', status, reason_code: reasonCode, run_id: RUN_ID, message: 'Missing normalized telemetry.', next_action: nextAction,
  });
  console.log(`[${status}] edge_walk_forward_lite — ${reasonCode}`);
  process.exit(1);
}

const pnl = norm.records.map((r) => Number(r.pnl)).filter(Number.isFinite);
const splitIdx = Math.max(1, Math.floor(pnl.length * 0.7));
const train = pnl.slice(0, splitIdx);
const test = pnl.slice(splitIdx);
const trainCi = ci95(train);
const testCi = ci95(test);

let status = 'PASS';
let reasonCode = 'NONE';
if (trainCi.low > 0 && testCi.low <= 0) {
  status = 'BLOCKED';
  reasonCode = 'OF91';
} else if (pnl.length < 100 || test.length < 30) {
  status = 'NEEDS_DATA';
  reasonCode = 'NDA02';
}
const nextAction = status === 'PASS' ? 'npm run -s edge:profit:00' : status === 'NEEDS_DATA' ? 'npm run -s edge:profit:00:sample' : 'npm run -s edge:profit:00';

writeMd(path.join(EPOCH_DIR, 'WALK_FORWARD_LITE.md'), `# WALK_FORWARD_LITE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n- split_train: 70%\n- split_test: 30%\n- n_total: ${pnl.length}\n- n_train: ${train.length}\n- n_test: ${test.length}\n- train_ci95_low: ${trainCi.low.toFixed(6)}\n- train_ci95_high: ${trainCi.high.toFixed(6)}\n- test_ci95_low: ${testCi.low.toFixed(6)}\n- test_ci95_high: ${testCi.high.toFixed(6)}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'walk_forward_lite.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: status === 'PASS' ? 'Walk-forward-lite check passed.' : status === 'NEEDS_DATA' ? 'Insufficient data for walk-forward-lite.' : 'Walk-forward-lite detected overfit smell.',
  next_action: nextAction,
  n_total: pnl.length,
  n_train: train.length,
  n_test: test.length,
  train_ci95_low: Number(trainCi.low.toFixed(8)),
  train_ci95_high: Number(trainCi.high.toFixed(8)),
  test_ci95_low: Number(testCi.low.toFixed(8)),
  test_ci95_high: Number(testCi.high.toFixed(8)),
});

console.log(`[${status}] edge_walk_forward_lite — ${reasonCode}`);
process.exit(status === 'BLOCKED' ? 1 : 0);
