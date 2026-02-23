import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const IN_PATH = path.join(ROOT, 'artifacts', 'incoming', 'paper_telemetry.jsonl');
const PROFILE_PATH = path.join(ROOT, 'artifacts', 'incoming', 'paper_telemetry.profile');

const SEED = 13371337;
const ROWS = Number(process.env.PAPER_SAMPLE_ROWS || 220);
const PROFILE = String(process.env.PAPER_SAMPLE_PROFILE || 'clean').toLowerCase();
const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', PROFILE);

fs.mkdirSync(path.dirname(IN_PATH), { recursive: true });
fs.mkdirSync(EPOCH_DIR, { recursive: true });

const SOURCE_TAG_BY_PROFILE = {
  clean: 'paper_sample_clean_v1',
  missing: 'paper_sample_missing_v1',
  conflict: 'paper_sample_conflict_v1',
};

if (!(PROFILE in SOURCE_TAG_BY_PROFILE)) {
  console.error(`[FAIL] unsupported PAPER_SAMPLE_PROFILE='${PROFILE}'. expected one of: clean, missing, conflict`);
  process.exit(1);
}

function makeRng(seed) {
  let x = seed >>> 0;
  return () => {
    x = (1664525 * x + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

const rng = makeRng(SEED);
const rows = [];
let injectedAnomalies = 0;
for (let i = 0; i < ROWS; i++) {
  const minute = String(i % 60).padStart(2, '0');
  const hour = String(10 + Math.floor(i / 60)).padStart(2, '0');
  const symbol = i % 2 === 0 ? 'BTCUSDT' : 'ETHUSDT';
  const base = symbol === 'BTCUSDT' ? 100 : 200;
  const d = (rng() - 0.5) * 2;
  const intendedEntry = base + d;
  const intendedExit = intendedEntry + (rng() - 0.45);
  const fill = intendedEntry + (rng() - 0.5) * 0.2;
  rows.push({
    ts: `2026-02-20T${hour}:${minute}:00Z`,
    symbol,
    side: i % 3 === 0 ? 'BUY' : 'SELL',
    signal_id: `SIG-${String(i + 1).padStart(4, '0')}`,
    intended_entry: Number(intendedEntry.toFixed(6)),
    intended_exit: Number(intendedExit.toFixed(6)),
    fill_price: Number(fill.toFixed(6)),
    fee: Number((0.02 + rng() * 0.02).toFixed(6)),
    slippage_bps: Number((3 + rng() * 8).toFixed(6)),
    latency_ms: Number((70 + rng() * 220).toFixed(6)),
    result_pnl: Number((0.04 + rng() * 0.22).toFixed(6)),
    source_tag: SOURCE_TAG_BY_PROFILE[PROFILE],
  });
}

// deterministic anomalies for gate coverage
rows[5].slippage_bps = 420; // outlier
injectedAnomalies += 1;
rows[11].latency_ms = 7000; // outlier
injectedAnomalies += 1;
if (PROFILE !== 'clean') {
  rows[17].result_pnl = 150000; // profile-tuned outlier
  injectedAnomalies += 1;
}

if (PROFILE === 'missing') {
  const missingA = { ...rows[21] };
  delete missingA.fee;
  missingA.signal_id = 'SIG-MISS-0001';
  rows.push(missingA);
  injectedAnomalies += 1;

  const missingB = { ...rows[22] };
  delete missingB.intended_exit;
  missingB.signal_id = 'SIG-MISS-0002';
  rows.push(missingB);
  injectedAnomalies += 1;
}

if (PROFILE === 'conflict') {
  const baseA = rows[25];
  rows.push({
    ...baseA,
    side: baseA.side === 'BUY' ? 'SELL' : 'BUY',
    source_tag: `${SOURCE_TAG_BY_PROFILE[PROFILE]}_conflict_side`,
  });
  injectedAnomalies += 1;

  const baseB = rows[50];
  rows.push({
    ...baseB,
    source_tag: `${SOURCE_TAG_BY_PROFILE[PROFILE]}_conflict_source`,
  });
  injectedAnomalies += 1;
}


rows.sort((a, b) => String(a.signal_id).localeCompare(String(b.signal_id)) || String(a.ts).localeCompare(String(b.ts)) || String(a.symbol).localeCompare(String(b.symbol)));

const jsonl = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
fs.writeFileSync(IN_PATH, jsonl);
fs.writeFileSync(PROFILE_PATH, `${PROFILE}\n`);
const sha = crypto.createHash('sha256').update(jsonl).digest('hex');

const anomalyCount = injectedAnomalies;
writeMd(path.join(EPOCH_DIR, 'SAMPLE_TELEMETRY.md'), `# SAMPLE_TELEMETRY.md\n\nSTATUS: PASS\nREASON_CODE: NONE\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s edge:profit:00\n\n## Generator\n\n- seed: ${SEED}\n- profile: ${PROFILE}\n- rows_total: ${rows.length}\n- rows_nominal: ${ROWS}\n- rows_with_anomalies: ${anomalyCount}\n- output_path: artifacts/incoming/paper_telemetry.jsonl\n- profile_marker_path: artifacts/incoming/paper_telemetry.profile\n- sha256: ${sha}\n`);

console.log(`[PASS] paper_telemetry_sample_gen(${PROFILE}) — wrote ${rows.length} rows, sha256=${sha.slice(0, 16)}...`);
