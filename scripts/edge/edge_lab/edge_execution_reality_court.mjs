import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';
import { resolveProfit00EpochDir, resolveProfit00ManualDir } from './edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const EPOCH_DIR = resolveProfit00EpochDir(ROOT);
const MANUAL_DIR = resolveProfit00ManualDir(ROOT);
const INGEST_PATH = path.join(MANUAL_DIR, 'paper_evidence_ingest.json');
const NORM_PATH = path.join(MANUAL_DIR, 'paper_evidence_normalized.json');
const MIN_FILLS = Number(process.env.EXEC_REALITY_MIN_FILLS || 100);

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const med = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const p95 = (arr) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(0.95 * (sorted.length - 1)));
  return sorted[idx];
};

const ingest = readJson(INGEST_PATH);
if (!ingest) {
  const status = 'BLOCKED';
  const reasonCode = 'ME01';
  const nextAction = 'npm run -s edge:profit:00:ingest';
  writeMd(path.join(EPOCH_DIR, 'EXECUTION_REALITY.md'), `# EXECUTION_REALITY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\nMissing ingest gate evidence.`);
  writeJsonDeterministic(path.join(MANUAL_DIR, 'execution_reality.json'), {
    schema_version: '1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
    message: 'Missing ingest gate evidence.', next_action: nextAction, fills_n: 0, min_fills: MIN_FILLS,
  });
  console.log(`[${status}] edge_execution_reality_court — ${reasonCode}`);
  process.exit(1);
}

if (ingest.status !== 'PASS') {
  const status = ingest.status === 'NEEDS_DATA' ? 'NEEDS_DATA' : 'BLOCKED';
  const reasonCode = ingest.reason_code || (status === 'NEEDS_DATA' ? 'NDA02' : 'DC90');
  const nextAction = status === 'NEEDS_DATA' ? 'npm run -s edge:profit:00:sample' : 'npm run -s edge:profit:00';
  writeMd(path.join(EPOCH_DIR, 'EXECUTION_REALITY.md'), `# EXECUTION_REALITY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\nIngest status is ${ingest.status}; execution reality court is fail-closed.`);
  writeJsonDeterministic(path.join(MANUAL_DIR, 'execution_reality.json'), {
    schema_version: '1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
    message: 'Execution reality not computed because ingest did not pass.', next_action: nextAction,
    ingest_status: ingest.status, fills_n: 0, min_fills: MIN_FILLS,
  });
  console.log(`[${status}] edge_execution_reality_court — ${reasonCode}`);
  process.exit(status === 'BLOCKED' ? 1 : 0);
}

const norm = readJson(NORM_PATH);
if (!norm) {
  const status = 'BLOCKED';
  const reasonCode = 'ME01';
  const nextAction = 'npm run -s edge:profit:00:ingest';
  writeMd(path.join(EPOCH_DIR, 'EXECUTION_REALITY.md'), `# EXECUTION_REALITY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\nMissing normalized ingest output.`);
  writeJsonDeterministic(path.join(MANUAL_DIR, 'execution_reality.json'), {
    schema_version: '1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
    message: 'Missing normalized ingest output.', next_action: nextAction, fills_n: 0, min_fills: MIN_FILLS,
  });
  console.log(`[${status}] edge_execution_reality_court — ${reasonCode}`);
  process.exit(1);
}

const records = Array.isArray(norm.records) ? norm.records : [];
const fillsN = records.length;
const slippage = records.map((r) => Number(r.slip_bps)).filter(Number.isFinite);
const latency = records.map((r) => Number(r.lat_ms)).filter(Number.isFinite);
const feeBps = records.map((r) => Number(r.fee_bps)).filter(Number.isFinite);
const spreads = records.map((r) => Number(r.spread_bps)).filter(Number.isFinite);
const sizeRatios = records.map((r) => Number(r.size_ratio)).filter(Number.isFinite);
const fillRate = fillsN === 0 ? 0 : 1;

let num = 0;
let den = 0;
for (let i = 0; i < Math.min(slippage.length, spreads.length, sizeRatios.length); i++) {
  const x = Math.sqrt(Math.max(0, sizeRatios[i]));
  const y = slippage[i] - spreads[i] / 2;
  num += x * y;
  den += x * x;
}
const k = den > 0 ? num / den : 0;
let se = 0;
for (let i = 0; i < Math.min(slippage.length, spreads.length, sizeRatios.length); i++) {
  const pred = spreads[i] / 2 + k * Math.sqrt(Math.max(0, sizeRatios[i]));
  se += (slippage[i] - pred) ** 2;
}
const rmse = slippage.length > 0 ? Math.sqrt(se / slippage.length) : 0;

let status = 'PASS';
let reasonCode = 'NONE';
if (fillsN < MIN_FILLS) {
  status = 'NEEDS_DATA';
  reasonCode = 'NDA02';
}

const nextAction = status === 'PASS' ? 'npm run -s edge:profit:00:expectancy' : 'npm run -s edge:profit:00:sample';

const md = `# EXECUTION_REALITY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## Reality Metrics\n\n- fills_n: ${fillsN}\n- min_fills_required: ${MIN_FILLS}\n- fill_rate: ${fillRate.toFixed(6)}\n- mean_slippage_bps: ${avg(slippage).toFixed(6)}\n- median_slippage_bps: ${med(slippage).toFixed(6)}\n- p95_slippage_bps: ${p95(slippage).toFixed(6)}\n- mean_latency_ms: ${avg(latency).toFixed(6)}\n- median_latency_ms: ${med(latency).toFixed(6)}\n- p95_latency_ms: ${p95(latency).toFixed(6)}\n- mean_fee_bps: ${avg(feeBps).toFixed(6)}\n\n## Calibration\n\n- model: predicted_slippage_bps = spread_bps/2 + k*sqrt(size_ratio)\n- k: ${k.toFixed(8)}\n- rmse_bps: ${rmse.toFixed(8)}\n`;
writeMd(path.join(EPOCH_DIR, 'EXECUTION_REALITY.md'), md);

writeJsonDeterministic(path.join(MANUAL_DIR, 'execution_reality.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: status === 'PASS' ? 'Execution reality metrics and calibration computed.' : 'Insufficient fill sample for execution reality court.',
  next_action: nextAction,
  fills_n: fillsN,
  min_fills: MIN_FILLS,
  fill_rate: Number(fillRate.toFixed(8)),
  mean_slippage_bps: Number(avg(slippage).toFixed(8)),
  median_slippage_bps: Number(med(slippage).toFixed(8)),
  p95_slippage_bps: Number(p95(slippage).toFixed(8)),
  mean_latency_ms: Number(avg(latency).toFixed(8)),
  median_latency_ms: Number(med(latency).toFixed(8)),
  p95_latency_ms: Number(p95(latency).toFixed(8)),
  mean_fee_bps: Number(avg(feeBps).toFixed(8)),
  calibration_k: Number(k.toFixed(8)),
  calibration_rmse_bps: Number(rmse.toFixed(8)),
  ingest_status: ingest.status,
});

console.log(`[${status}] edge_execution_reality_court — ${reasonCode}`);
process.exit(status === 'BLOCKED' ? 1 : 0);
