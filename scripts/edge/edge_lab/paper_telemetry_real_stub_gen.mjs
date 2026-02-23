import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const CSV_PATH = path.join(ROOT, 'artifacts', 'incoming', 'raw_paper_telemetry.csv');
const PROFILE_PATH = path.join(ROOT, 'artifacts', 'incoming', 'paper_telemetry.profile');
const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'real');
const ROWS = Number(process.env.PAPER_REAL_STUB_ROWS || 360);
const SEED = Number(process.env.PAPER_REAL_STUB_SEED || 20260223);

fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
fs.mkdirSync(EPOCH_DIR, { recursive: true });

function rngFactory(seed) {
  let x = seed >>> 0;
  return () => {
    x = (1103515245 * x + 12345) >>> 0;
    return x / 4294967296;
  };
}
const rng = rngFactory(SEED);

const header = [
  'ts','symbol','side','signal_id','intended_entry','intended_exit','fill_price','fee','slippage_bps','latency_ms','result_pnl','source_tag','spread_bps','size_ratio'
];

const rows = [];
for (let i = 0; i < ROWS; i++) {
  const day = 20 + Math.floor(i / 180);
  const minuteOfDay = i % 180;
  const hh = String(9 + Math.floor(minuteOfDay / 60)).padStart(2, '0');
  const mm = String(minuteOfDay % 60).padStart(2, '0');
  const ts = `2026-02-${String(day).padStart(2, '0')}T${hh}:${mm}:00Z`;
  const symbol = i % 2 === 0 ? 'BTCUSDT' : 'ETHUSDT';
  const base = symbol === 'BTCUSDT' ? 60000 : 3200;
  const sizeRatio = 0.4 + rng() * 1.8;
  const spread = 0.8 + rng() * 3.2;
  const intendedEntry = base + (rng() - 0.5) * (symbol === 'BTCUSDT' ? 80 : 12);
  const slippage = spread / 2 + 1.15 * Math.sqrt(sizeRatio) + (rng() - 0.5) * 0.35;
  const fillPrice = intendedEntry * (1 + (slippage / 10000) * (i % 2 === 0 ? 1 : -1));
  const intendedExit = intendedEntry * (1 + ((rng() - 0.35) / 180));
  const fee = Math.abs(fillPrice) * 0.000035;
  const latency = 55 + rng() * 260;
  const pnl = 0.18 + rng() * 0.22 - (i % 17 === 0 ? 0.08 : 0);
  rows.push([
    ts,
    symbol,
    i % 2 === 0 ? 'BUY' : 'SELL',
    `REAL-STUB-${String(i + 1).padStart(5, '0')}`,
    intendedEntry.toFixed(8),
    intendedExit.toFixed(8),
    fillPrice.toFixed(8),
    fee.toFixed(8),
    slippage.toFixed(8),
    latency.toFixed(8),
    pnl.toFixed(8),
    'REAL_STUB_V1',
    spread.toFixed(8),
    sizeRatio.toFixed(8),
  ]);
}

rows.sort((a, b) => a[0].localeCompare(b[0]) || a[3].localeCompare(b[3]));
const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n';
fs.writeFileSync(CSV_PATH, csv);
fs.writeFileSync(PROFILE_PATH, 'real\n');

const csvSha = crypto.createHash('sha256').update(csv).digest('hex');

writeMd(path.join(EPOCH_DIR, 'REAL_STUB_GENERATION.md'), `# REAL_STUB_GENERATION.md\n\nSTATUS: PASS\nREASON_CODE: NONE\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s edge:profit:00:real:run\n\n## Stub\n\n- mode: REAL_STUB\n- rows: ${ROWS}\n- seed: ${SEED}\n- csv_path: artifacts/incoming/raw_paper_telemetry.csv\n- csv_sha256: ${csvSha}\n- profile_marker_path: artifacts/incoming/paper_telemetry.profile\n- profile_marker_value: real\n- source_tag: REAL_STUB_V1\n`);

console.log(`[PASS] paper_telemetry_real_stub_gen — rows=${ROWS}`);
