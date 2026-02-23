import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';
import { resolveProfit00EpochDir } from './edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const EPOCH_DIR = resolveProfit00EpochDir(ROOT);
const MANUAL_DIR = path.join(EPOCH_DIR, 'gates', 'manual');
const INGEST_JSON = path.join(MANUAL_DIR, 'paper_evidence_ingest.json');
const NORM_JSON = path.join(MANUAL_DIR, 'paper_evidence_normalized.json');
const EXPECT_JSON = path.join(MANUAL_DIR, 'expectancy.json');
const LEDGER = path.join(ROOT, 'EDGE_PROFIT_00', 'TRIALS_LEDGER.md');
const OUT_MD = path.join(EPOCH_DIR, 'PBO_CPCV.md');
const OUT_JSON = path.join(MANUAL_DIR, 'pbo_cpcv.json');

fs.mkdirSync(MANUAL_DIR, { recursive: true });
const PASS_NEXT_ACTION = 'npm run -s executor:run:chain';
const readJson = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);

function countTrials(text) {
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^T\d+\|/.test(l)).length;
}
function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x = (1664525 * x + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

const ingest = readJson(INGEST_JSON);
const normalized = readJson(NORM_JSON);
const expectancy = readJson(EXPECT_JSON);
const evidenceSource = String(ingest?.evidence_source || 'UNKNOWN').toUpperCase();
const records = Array.isArray(normalized?.records) ? normalized.records : [];
const tradesN = Number(expectancy?.trades_n ?? records.length);
const ledgerTrials = fs.existsSync(LEDGER) ? countTrials(fs.readFileSync(LEDGER, 'utf8')) : 0;
const pboSamples = Number(process.env.EDGE_PBO_SAMPLES || 30);
const seed = Number(process.env.EDGE_PBO_SEED || 20260223);

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Deterministic CPCV/PBO skeleton completed.';
let nextAction = PASS_NEXT_ACTION;
let pboEstimate = null;

if (!ingest || !normalized || !expectancy) {
  status = 'NEEDS_DATA';
  reasonCode = 'ME01';
  message = 'Missing ingest/normalized/expectancy artifacts.';
  nextAction = 'npm run -s edge:profit:00';
} else if (!new Set(['REAL', 'REAL_PUBLIC']).has(evidenceSource)) {
  status = 'NEEDS_DATA';
  reasonCode = 'EP02_REAL_REQUIRED';
  message = `PBO/CPCV requires REAL/REAL_PUBLIC telemetry; got ${evidenceSource}.`;
  nextAction = 'npm run -s edge:profit:00:import:csv';
} else if (tradesN < 200 || ledgerTrials < 10) {
  status = 'NEEDS_DATA';
  reasonCode = 'OF01';
  message = `Need trades>=200 and trials>=10 (got trades=${tradesN}, trials=${ledgerTrials}).`;
  nextAction = 'npm run -s edge:profit:00';
} else {
  const random = rng(seed);
  const pnls = records.map((r) => Number(r.pnl)).filter(Number.isFinite);
  const n = pnls.length;
  let overfitCount = 0;
  for (let s = 0; s < pboSamples; s++) {
    let train = 0;
    let test = 0;
    let tn = 0;
    let vn = 0;
    for (let i = 0; i < n; i++) {
      if (random() < 0.5) {
        train += pnls[i];
        tn += 1;
      } else {
        test += pnls[i];
        vn += 1;
      }
    }
    const trainAvg = train / Math.max(1, tn);
    const testAvg = test / Math.max(1, vn);
    if (trainAvg > 0 && testAvg <= 0) overfitCount += 1;
  }
  pboEstimate = overfitCount / pboSamples;
}

writeMd(OUT_MD, `# PBO_CPCV.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## Preconditions\n\n- evidence_source: ${evidenceSource}\n- trades_n: ${tradesN}\n- trials_ledger_n: ${ledgerTrials}\n- required_trades_n: 200\n- required_trials_n: 10\n\n## CPCV/PBO Skeleton\n\n- seed: ${seed}\n- samples_S: ${pboSamples}\n- pbo_estimate: ${pboEstimate === null ? 'UNAVAILABLE' : pboEstimate}\n`);

writeJsonDeterministic(OUT_JSON, {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: nextAction,
  evidence_source: evidenceSource,
  trades_n: tradesN,
  required_trades_n: 200,
  trials_ledger_n: ledgerTrials,
  required_trials_n: 10,
  seed,
  samples_s: pboSamples,
  pbo_estimate: pboEstimate,
});

console.log(`[${status}] edge_profit_02_pbo_cpcv — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
