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
const OUT_MD = path.join(EPOCH_DIR, 'RISK_MCDD.md');
const OUT_JSON = path.join(MANUAL_DIR, 'risk_mcdd.json');

fs.mkdirSync(MANUAL_DIR, { recursive: true });
const PASS_NEXT_ACTION = 'npm run -s executor:run:chain';
const readJson = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);

function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x = (1103515245 * x + 12345) >>> 0;
    return x / 4294967296;
  };
}
function q(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}

const ingest = readJson(INGEST_JSON);
const normalized = readJson(NORM_JSON);
const expectancy = readJson(EXPECT_JSON);
const evidenceSource = String(ingest?.evidence_source || 'UNKNOWN').toUpperCase();
const pnls = (Array.isArray(normalized?.records) ? normalized.records : []).map((r) => Number(r.pnl)).filter(Number.isFinite);
const tradesN = Number(expectancy?.trades_n ?? pnls.length);
const seed = Number(process.env.EDGE_RISK_SEED || 20260223);
const iters = Number(process.env.EDGE_RISK_ITERS || 5000);

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'MC drawdown distribution computed.';
let nextAction = PASS_NEXT_ACTION;
let p50 = null;
let p75 = null;
let p90 = null;
let p95 = null;
let quarterKellyCap = null;

if (!ingest || !normalized || !expectancy) {
  status = 'NEEDS_DATA';
  reasonCode = 'ME01';
  message = 'Missing ingest/normalized/expectancy artifacts for risk proof.';
  nextAction = 'npm run -s edge:profit:00';
} else if (evidenceSource !== 'REAL') {
  status = 'NEEDS_DATA';
  reasonCode = 'EP02_REAL_REQUIRED';
  message = `Risk proof requires REAL telemetry; got ${evidenceSource}.`;
  nextAction = 'npm run -s edge:profit:00:import:csv';
} else if (tradesN < 200) {
  status = 'NEEDS_DATA';
  reasonCode = 'RK01';
  message = `Need trades>=200 for stable MC drawdown; got ${tradesN}.`;
  nextAction = 'npm run -s edge:profit:00';
} else {
  const random = rng(seed);
  const dd = [];
  for (let i = 0; i < iters; i++) {
    let eq = 0;
    let peak = 0;
    let worst = 0;
    for (let t = 0; t < pnls.length; t++) {
      const sample = pnls[Math.floor(random() * pnls.length)] || 0;
      eq += sample;
      if (eq > peak) peak = eq;
      const drawdown = peak - eq;
      if (drawdown > worst) worst = drawdown;
    }
    dd.push(worst);
  }
  dd.sort((a, b) => a - b);
  p50 = q(dd, 0.50);
  p75 = q(dd, 0.75);
  p90 = q(dd, 0.90);
  p95 = q(dd, 0.95);

  const winrate = Number(expectancy?.winrate ?? 0.5);
  const meanPnl = Number(expectancy?.mean_pnl_per_trade ?? 0);
  const std = Math.max(1e-9, Number(expectancy?.stddev_pnl ?? 1));
  const kellyProxy = Math.max(0, Math.min(1, (meanPnl / std) * winrate * 0.1));
  quarterKellyCap = Math.min(0.25, kellyProxy * 0.25);
}

writeMd(OUT_MD, `# RISK_MCDD.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## Inputs\n\n- evidence_source: ${evidenceSource}\n- trades_n: ${tradesN}\n- iterations: ${iters}\n- seed: ${seed}\n\n## Monte Carlo drawdown distribution\n\n- drawdown_p50: ${p50 === null ? 'UNAVAILABLE' : p50}\n- drawdown_p75: ${p75 === null ? 'UNAVAILABLE' : p75}\n- drawdown_p90: ${p90 === null ? 'UNAVAILABLE' : p90}\n- drawdown_p95: ${p95 === null ? 'UNAVAILABLE' : p95}\n\n## Conservative sizing\n\n- quarter_kelly_cap: ${quarterKellyCap === null ? 'UNAVAILABLE' : quarterKellyCap}\n`);

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
  iterations: iters,
  seed,
  drawdown_p50: p50,
  drawdown_p75: p75,
  drawdown_p90: p90,
  drawdown_p95: p95,
  quarter_kelly_cap: quarterKellyCap,
});

console.log(`[${status}] edge_profit_02_risk_mcdd — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
