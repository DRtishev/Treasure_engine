import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';
import { resolveProfit00EpochDir, resolveProfit00ManualDir } from './edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const EPOCH_DIR = resolveProfit00EpochDir(ROOT);
const MANUAL_DIR = resolveProfit00ManualDir(ROOT);
const INGEST_GATE = path.join(MANUAL_DIR, 'paper_evidence_ingest.json');
const EXEC_GATE = path.join(MANUAL_DIR, 'execution_reality.json');
const NORM_FILE = path.join(MANUAL_DIR, 'paper_evidence_normalized.json');
const MIN_N = Number(process.env.EXPECTANCY_MIN_N || 200);
const MIN_TRL = Number(process.env.EXPECTANCY_MIN_TRL || 2);
const PSR_THRESHOLD = Number(process.env.EXPECTANCY_PSR_THRESHOLD || 0.95);
const BOOTSTRAP_N = Number(process.env.EXPECTANCY_BOOTSTRAP_N || 10000);
const BOOTSTRAP_SEED = Number(process.env.EXPECTANCY_BOOTSTRAP_SEED || 20260223);

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const readJson = (p) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const stddev = (a, m) => a.length < 2 ? 0 : Math.sqrt(a.reduce((acc, x) => acc + (x - m) ** 2, 0) / (a.length - 1));
const normalCdf = (x) => 0.5 * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * (x ** 3))));
const makeRng = (seed) => {
  let x = (seed >>> 0) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
};
function bootstrapCi(values, nResample, seed) {
  const data = [...values].sort((a, b) => a - b);
  const n = data.length;
  const rng = makeRng(seed);
  const means = new Float64Array(nResample);
  for (let b = 0; b < nResample; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += data[Math.floor(rng() * n)];
    means[b] = sum / n;
  }
  means.sort();
  return {
    lower: means[Math.floor(nResample * 0.025)],
    upper: means[Math.floor(nResample * 0.975)],
  };
}

function writeAndExit(status, reasonCode, nextAction, message, extras = {}, code = 0) {
  writeMd(path.join(EPOCH_DIR, 'EXPECTANCY.md'), `# EXPECTANCY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n${message}`);
  writeJsonDeterministic(path.join(MANUAL_DIR, 'expectancy.json'), {
    schema_version: '1.0.0', status, reason_code: reasonCode, run_id: RUN_ID, message, next_action: nextAction, ...extras,
  });
  console.log(`[${status}] edge_expectancy_court — ${reasonCode}`);
  process.exit(code);
}

const ingest = readJson(INGEST_GATE);
const execReality = readJson(EXEC_GATE);
if (!ingest || !execReality) {
  writeAndExit('BLOCKED', 'ME01', 'npm run -s edge:profit:00', 'Missing ingest or execution reality evidence.', { min_n: MIN_N, trades_n: 0 }, 1);
}
if (ingest.status !== 'PASS') {
  const status = ingest.status === 'NEEDS_DATA' ? 'NEEDS_DATA' : 'BLOCKED';
  const reasonCode = ingest.reason_code || (status === 'NEEDS_DATA' ? 'NDA02' : 'DC90');
  const nextAction = status === 'NEEDS_DATA' ? 'npm run -s edge:profit:00:sample' : 'npm run -s edge:profit:00';
  writeAndExit(status, reasonCode, nextAction, `Ingest status is ${ingest.status}; expectancy is fail-closed.`, { min_n: MIN_N, trades_n: 0, ingest_status: ingest.status }, status === 'BLOCKED' ? 1 : 0);
}
if (execReality.status !== 'PASS') {
  const status = execReality.status === 'NEEDS_DATA' ? 'NEEDS_DATA' : 'BLOCKED';
  const reasonCode = execReality.reason_code || (status === 'NEEDS_DATA' ? 'NDA02' : 'DC90');
  const nextAction = status === 'NEEDS_DATA' ? 'npm run -s edge:profit:00:sample' : 'npm run -s edge:profit:00';
  writeAndExit(status, reasonCode, nextAction, `Execution reality status is ${execReality.status}; expectancy is fail-closed.`, { min_n: MIN_N, trades_n: 0, execution_reality_status: execReality.status }, status === 'BLOCKED' ? 1 : 0);
}

const norm = readJson(NORM_FILE);
if (!norm) {
  writeAndExit('BLOCKED', 'ME01', 'npm run -s edge:profit:00:ingest', 'Missing normalized ingest output.', { min_n: MIN_N, trades_n: 0 }, 1);
}

const pnl = (norm.records || []).map((r) => Number(r.pnl)).filter((x) => Number.isFinite(x));
const n = pnl.length;
const m = mean(pnl);
const sd = stddev(pnl, m);
const { lower: ciLow, upper: ciHigh } = n > 0
  ? bootstrapCi(pnl, BOOTSTRAP_N, BOOTSTRAP_SEED)
  : { lower: 0, upper: 0 };
const wins = pnl.filter((x) => x > 0).length;
const grossWin = pnl.filter((x) => x > 0).reduce((a, b) => a + b, 0);
const grossLossAbs = Math.abs(pnl.filter((x) => x < 0).reduce((a, b) => a + b, 0));
const pf = grossLossAbs === 0 ? (grossWin > 0 ? 999 : 0) : grossWin / grossLossAbs;

let eq = 0; let peak = 0; let mdd = 0;
for (const x of pnl) { eq += x; peak = Math.max(peak, eq); mdd = Math.max(mdd, peak - eq); }

const sr = sd > 0 ? (m / sd) * Math.sqrt(252) : 0;
const psr0 = Number(normalCdf((n > 1) ? (m / (sd / Math.sqrt(n))) : 0));
const trl = n / 100;

let status = 'BLOCKED';
let reasonCode = 'EX90';
if (n < MIN_N || trl < MIN_TRL) {
  status = 'NEEDS_DATA';
  reasonCode = 'NDA02';
} else if (m > 0 && ciLow > 0 && psr0 >= PSR_THRESHOLD) {
  status = 'PASS';
  reasonCode = 'NONE';
}

const nextAction = status === 'PASS' ? 'npm run -s edge:profit:00:overfit' : status === 'NEEDS_DATA'
  ? 'npm run -s edge:profit:00:sample' : 'npm run -s edge:profit:00';

const md = `# EXPECTANCY.md — EDGE_PROFIT_00\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## Inputs\n\n- ingest_status: ${ingest.status}\n- execution_reality_status: ${execReality.status}\n- min_n: ${MIN_N}\n- min_trl: ${MIN_TRL}\n- psr_threshold: ${PSR_THRESHOLD}\n- bootstrap_n: ${BOOTSTRAP_N}\n- bootstrap_seed: ${BOOTSTRAP_SEED}\n- trades_n: ${n}\n\n## Metrics\n\n- mean_pnl_per_trade: ${m.toFixed(6)}\n- stddev_pnl: ${sd.toFixed(6)}\n- winrate: ${n ? (wins / n).toFixed(6) : '0.000000'}\n- profit_factor: ${pf.toFixed(6)}\n- max_drawdown_proxy: ${mdd.toFixed(6)}\n- ci95_low: ${ciLow.toFixed(6)}\n- ci95_high: ${ciHigh.toFixed(6)}\n- sharpe_proxy: ${sr.toFixed(6)}\n- psr0: ${psr0.toFixed(6)}\n- trl_proxy: ${trl.toFixed(6)}\n`;
writeMd(path.join(EPOCH_DIR, 'EXPECTANCY.md'), md);

writeJsonDeterministic(path.join(MANUAL_DIR, 'expectancy.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: status === 'PASS'
    ? 'Expectancy PASS with positive lower CI, PSR threshold, and MinTRL satisfied.'
    : status === 'NEEDS_DATA'
      ? 'Insufficient evidence to satisfy expectancy thresholds.'
      : 'Expectancy blocked by threshold failure.',
  next_action: nextAction,
  min_n: MIN_N,
  min_trl: MIN_TRL,
  psr_threshold: Number(PSR_THRESHOLD.toFixed(8)),
  bootstrap_n: BOOTSTRAP_N,
  bootstrap_seed: BOOTSTRAP_SEED,
  trades_n: n,
  mean_pnl_per_trade: Number(m.toFixed(8)),
  stddev_pnl: Number(sd.toFixed(8)),
  winrate: Number((n ? wins / n : 0).toFixed(8)),
  profit_factor: Number(pf.toFixed(8)),
  max_drawdown_proxy: Number(mdd.toFixed(8)),
  ci95_low: Number(ciLow.toFixed(8)),
  ci95_high: Number(ciHigh.toFixed(8)),
  sharpe_proxy: Number(sr.toFixed(8)),
  psr0: Number(psr0.toFixed(8)),
  trl_proxy: Number(trl.toFixed(8)),
  ingest_status: ingest.status,
  execution_reality_status: execReality.status,
});

console.log(`[${status}] edge_expectancy_court — ${reasonCode}`);
process.exit(status === 'BLOCKED' ? 1 : 0);
