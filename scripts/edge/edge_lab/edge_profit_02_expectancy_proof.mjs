import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const REAL_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'real');
const MANUAL_DIR = path.join(REAL_DIR, 'gates', 'manual');
const INGEST_JSON = path.join(MANUAL_DIR, 'paper_evidence_ingest.json');
const EXPECT_JSON = path.join(MANUAL_DIR, 'expectancy.json');
const EXEC_JSON = path.join(MANUAL_DIR, 'execution_reality.json');
const OUT_MD = path.join(REAL_DIR, 'EXPECTANCY_PROOF.md');
const OUT_JSON = path.join(MANUAL_DIR, 'expectancy_proof.json');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const PASS_NEXT_ACTION = 'npm run -s executor:run:chain';

const readJson = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const ingest = readJson(INGEST_JSON);
const expectancy = readJson(EXPECT_JSON);
const execution = readJson(EXEC_JSON);

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Expectancy proof satisfied (REAL source, CI/PSR/MinTRL/trade thresholds).';
let nextAction = PASS_NEXT_ACTION;

const evidenceSource = String(ingest?.evidence_source || 'UNKNOWN').toUpperCase();
const ciLow = Number(expectancy?.ci95_low ?? NaN);
const psr0 = Number(expectancy?.psr0 ?? NaN);
const psrMin = Number(expectancy?.psr_min ?? NaN);
const minTrlTrades = Number(expectancy?.min_trl_trades ?? NaN);
const minTrl = Number(expectancy?.min_trl ?? NaN);
const tradesN = Number(expectancy?.trades_n ?? NaN);
const minTrades = Number(expectancy?.min_n_trades ?? NaN);

if (!ingest || !expectancy || !execution) {
  status = 'NEEDS_DATA';
  reasonCode = 'ME01';
  message = 'Required gate artifacts missing for expectancy proof.';
  nextAction = 'npm run -s edge:profit:00';
} else if (evidenceSource !== 'REAL') {
  status = 'NEEDS_DATA';
  reasonCode = 'EP02_REAL_REQUIRED';
  message = `Expectancy proof requires REAL telemetry; got evidence_source=${evidenceSource}.`;
  nextAction = 'npm run -s edge:profit:00:import:csv';
} else if (expectancy.status !== 'PASS' || execution.status !== 'PASS' || ingest.status !== 'PASS') {
  status = 'BLOCKED';
  reasonCode = expectancy.reason_code || execution.reason_code || ingest.reason_code || 'EP02';
  message = 'Upstream gates are not PASS for expectancy proof.';
  nextAction = 'npm run -s edge:profit:00';
} else if (!(ciLow > 0 && psr0 >= psrMin && minTrlTrades >= minTrl && tradesN >= minTrades)) {
  status = 'BLOCKED';
  reasonCode = 'EP02';
  message = 'Expectancy proof thresholds not satisfied under REAL evidence.';
  nextAction = 'npm run -s edge:profit:00';
}

writeMd(OUT_MD, `# EXPECTANCY_PROOF.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## Inputs\n\n- ingest_status: ${ingest?.status || 'MISSING'}\n- execution_reality_status: ${execution?.status || 'MISSING'}\n- expectancy_status: ${expectancy?.status || 'MISSING'}\n- evidence_source: ${evidenceSource}\n\n## Threshold checks\n\n- ci95_low: ${Number.isFinite(ciLow) ? ciLow : 'NaN'} (require > 0)\n- psr0: ${Number.isFinite(psr0) ? psr0 : 'NaN'} (require >= ${Number.isFinite(psrMin) ? psrMin : 'NaN'})\n- min_trl_trades: ${Number.isFinite(minTrlTrades) ? minTrlTrades : 'NaN'} (require >= ${Number.isFinite(minTrl) ? minTrl : 'NaN'})\n- trades_n: ${Number.isFinite(tradesN) ? tradesN : 'NaN'} (require >= ${Number.isFinite(minTrades) ? minTrades : 'NaN'})\n`);

writeJsonDeterministic(OUT_JSON, {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: nextAction,
  evidence_source: evidenceSource,
  ingest_status: ingest?.status || 'MISSING',
  execution_reality_status: execution?.status || 'MISSING',
  expectancy_status: expectancy?.status || 'MISSING',
  ci95_low: Number.isFinite(ciLow) ? ciLow : null,
  psr0: Number.isFinite(psr0) ? psr0 : null,
  psr_min: Number.isFinite(psrMin) ? psrMin : null,
  min_trl_trades: Number.isFinite(minTrlTrades) ? minTrlTrades : null,
  min_trl: Number.isFinite(minTrl) ? minTrl : null,
  trades_n: Number.isFinite(tradesN) ? tradesN : null,
  min_n_trades: Number.isFinite(minTrades) ? minTrades : null,
});

console.log(`[${status}] edge_profit_02_expectancy_proof — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
