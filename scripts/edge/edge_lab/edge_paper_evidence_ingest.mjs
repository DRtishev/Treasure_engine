import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd, canonSort } from './canon.mjs';
import { profileForEvidenceSource, resolveProfit00EpochDir, resolveProfit00ManualDir, resolveProfit00Profile } from './edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const EPOCH_DIR = resolveProfit00EpochDir(ROOT);
const MANUAL_DIR = resolveProfit00ManualDir(ROOT);
const PROFILE = resolveProfit00Profile(ROOT);
let evidenceSource = PROFILE === 'sandbox' ? 'REAL_SANDBOX' : PROFILE === 'stub' ? 'FIXTURE_STUB' : PROFILE === 'public' ? 'REAL_PUBLIC' : 'REAL';
const JSONL_PATH = path.join(ROOT, 'artifacts', 'incoming', 'paper_telemetry.jsonl');
const CSV_PATH = path.join(ROOT, 'artifacts', 'incoming', 'paper_telemetry.csv');
const REQUIRED = ['ts', 'symbol', 'side', 'signal_id', 'intended_entry', 'intended_exit', 'fill_price', 'fee', 'slippage_bps', 'latency_ms', 'result_pnl', 'source_tag'];

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((s) => s.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row = {};
    header.forEach((h, i) => { row[h] = (cols[i] ?? '').trim(); });
    return row;
  });
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

if (process.argv.includes('--generate-sample')) {
  fs.mkdirSync(path.dirname(JSONL_PATH), { recursive: true });
  const rows = [
    { ts: '2026-02-20T10:00:00Z', symbol: 'BTCUSDT', side: 'BUY', signal_id: 'SIG-0001', intended_entry: 100.0, intended_exit: 101.0, fill_price: 100.1, fee: 0.02, slippage_bps: 4, latency_ms: 120, result_pnl: 0.88, source_tag: 'paper_router_v1' },
    { ts: '2026-02-20T10:05:00Z', symbol: 'ETHUSDT', side: 'SELL', signal_id: 'SIG-0002', intended_entry: 200.0, intended_exit: 198.8, fill_price: 199.8, fee: 0.03, slippage_bps: 6, latency_ms: 180, result_pnl: 0.97, source_tag: 'paper_router_v1' },
  ];
  fs.writeFileSync(JSONL_PATH, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`Generated sample at ${path.relative(ROOT, JSONL_PATH)}`);
  process.exit(0);
}

let inputKind = 'NONE';
let rawRows = [];
let inputSha256 = 'NONE';
if (fs.existsSync(JSONL_PATH)) {
  inputKind = 'JSONL';
  const rawText = fs.readFileSync(JSONL_PATH, 'utf8');
  inputSha256 = crypto.createHash('sha256').update(rawText).digest('hex');
  rawRows = rawText.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
} else if (fs.existsSync(CSV_PATH)) {
  inputKind = 'CSV';
  const rawText = fs.readFileSync(CSV_PATH, 'utf8');
  inputSha256 = crypto.createHash('sha256').update(rawText).digest('hex');
  rawRows = parseCsv(rawText);
}

if (inputKind === 'NONE') {
  const status = 'NEEDS_DATA';
  const reasonCode = 'NDA02';
  const nextAction = 'npm run -s edge:profit:00:sample';
  writeMd(path.join(EPOCH_DIR, 'PAPER_EVIDENCE_INGEST.md'), `# PAPER_EVIDENCE_INGEST.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\nNo telemetry input found at:\n- artifacts/incoming/paper_telemetry.jsonl\n- artifacts/incoming/paper_telemetry.csv\n\ninput_sha256: ${inputSha256}\n`);
  writeJsonDeterministic(path.join(MANUAL_DIR, 'paper_evidence_ingest.json'), {
    schema_version: '1.0.0',
    status,
    reason_code: reasonCode,
    message: 'Missing paper telemetry input file.',
    run_id: RUN_ID,
    next_action: nextAction,
    input_kind: inputKind,
    row_count: 0,
    outlier_count: 0,
    severe_conflict_count: 0,
    input_sha256: inputSha256,
    evidence_source: evidenceSource,
  });
  console.log(`[${status}] edge_paper_evidence_ingest — ${reasonCode}`);
  process.exit(0);
}

const missingFieldRows = [];
const normalized = [];
for (let i = 0; i < rawRows.length; i++) {
  const row = rawRows[i];
  const missing = REQUIRED.filter((k) => !(k in row) || String(row[k]).trim() === '');
  if (missing.length) {
    missingFieldRows.push(`row_${i + 1}:${missing.join('+')}`);
    continue;
  }
  normalized.push({
    idx: i + 1,
    sid: String(row.signal_id),
    t: String(row.ts).replace('T', '_').replace('Z', ''),
    sym: String(row.symbol),
    side: String(row.side),
    pnl: toNum(row.result_pnl),
    slip_bps: toNum(row.slippage_bps),
    lat_ms: toNum(row.latency_ms),
    fee_bps: (toNum(row.fee) / Math.max(1e-9, Math.abs(toNum(row.fill_price)))) * 10000,
    spread_bps: Number.isFinite(toNum(row.spread_bps)) ? toNum(row.spread_bps) : 1,
    size_ratio: Number.isFinite(toNum(row.size_ratio)) ? toNum(row.size_ratio) : 1,
    source_tag: String(row.source_tag),
  });
}

normalized.sort((a, b) =>
  a.sid.localeCompare(b.sid) || a.t.localeCompare(b.t) || a.sym.localeCompare(b.sym) || a.idx - b.idx
);

const outliers = [];
for (const row of normalized) {
  if (!Number.isFinite(row.pnl) || !Number.isFinite(row.slip_bps) || !Number.isFinite(row.lat_ms)) {
    outliers.push(`row_${row.idx}:nan_numeric`);
  } else if (Math.abs(row.slip_bps) > 250 || row.lat_ms > 5000 || Math.abs(row.pnl) > 100000) {
    outliers.push(`row_${row.idx}:value_outlier`);
  }
}

const conflictKeys = new Map();
for (const row of normalized) {
  const key = `${row.sid}|${row.t}|${row.sym}`;
  const prev = conflictKeys.get(key);
  if (!prev) {
    conflictKeys.set(key, row);
    continue;
  }
  if (prev.side !== row.side || prev.source_tag !== row.source_tag) {
    outliers.push(`row_${row.idx}:conflict_${key}`);
  }
}

const severeConflictCount = outliers.filter((x) => x.includes('conflict_')).length;

const sourceTags = new Set(normalized.map((r) => String(r.source_tag || '').toUpperCase()));
const stubTagged = normalized.length > 0 && [...sourceTags].every((t) => t.includes('REAL_STUB'));
const sandboxTagged = normalized.length > 0 && [...sourceTags].every((t) => t.includes('REAL_SANDBOX'));
const publicTagged = normalized.length > 0 && [...sourceTags].every((t) => t.includes('REAL_PUBLIC'));
if (sandboxTagged) {
  evidenceSource = 'REAL_SANDBOX';
} else if (stubTagged) {
  evidenceSource = 'FIXTURE_STUB';
} else if (publicTagged) {
  evidenceSource = 'REAL_PUBLIC';
} else if (inputKind === 'CSV' || inputKind === 'JSONL') {
  evidenceSource = 'REAL';
}

const expectedProfile = profileForEvidenceSource(evidenceSource);
if (expectedProfile && PROFILE && expectedProfile !== PROFILE) {
  evidenceSource = expectedProfile === 'real'
    ? 'REAL'
    : expectedProfile === 'public'
      ? 'REAL_PUBLIC'
      : expectedProfile === 'sandbox'
        ? 'REAL_SANDBOX'
        : 'FIXTURE_STUB';
}
const hasMissing = missingFieldRows.length > 0;
const blocked = severeConflictCount > 0;

let status = 'PASS';
let reasonCode = 'NONE';
if (blocked) {
  status = 'BLOCKED';
  reasonCode = 'DC90';
} else if (hasMissing || normalized.length === 0) {
  status = 'NEEDS_DATA';
  reasonCode = 'NDA02';
}

const nextAction = status === 'PASS'
  ? 'npm run -s edge:profit:00:expectancy'
  : status === 'BLOCKED'
    ? 'npm run -s edge:profit:00'
    : 'npm run -s edge:profit:00:sample';

const md = `# PAPER_EVIDENCE_INGEST.md — EDGE_PROFIT_00\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## Input\n\n- input_kind: ${inputKind}\n- input_path: ${inputKind === 'JSONL' ? 'artifacts/incoming/paper_telemetry.jsonl' : 'artifacts/incoming/paper_telemetry.csv'}\n- rows_raw: ${rawRows.length}\n- rows_normalized: ${normalized.length}\n- input_sha256: ${inputSha256}\n- evidence_source: ${evidenceSource}\n\n## Outlier + Conflict Summary\n\n- outlier_count: ${outliers.length}\n- severe_conflict_count: ${severeConflictCount}\n\n## Missing Required Fields\n\n${missingFieldRows.length ? missingFieldRows.map((e) => `- ${e}`).join('\n') : '- NONE'}\n\n## Outlier Marks (not deleted)\n\n${outliers.length ? canonSort(outliers).map((e) => `- ${e}`).join('\n') : '- NONE'}\n`;

writeMd(path.join(EPOCH_DIR, 'PAPER_EVIDENCE_INGEST.md'), md);

writeJsonDeterministic(path.join(MANUAL_DIR, 'paper_evidence_normalized.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  record_count: status === 'PASS' ? normalized.length : 0,
  records: status === 'PASS' ? normalized : [],
  evidence_source: evidenceSource,
});

writeJsonDeterministic(path.join(MANUAL_DIR, 'paper_evidence_ingest.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: blocked
    ? 'Severe telemetry conflicts detected.'
    : hasMissing
      ? 'Telemetry rows missing required fields.'
      : `Telemetry ingest ${status.toLowerCase()} with deterministic normalization.`,
  next_action: nextAction,
  input_kind: inputKind,
  row_count: normalized.length,
  outlier_count: outliers.length,
  severe_conflict_count: severeConflictCount,
  missing_field_rows: canonSort(missingFieldRows),
  outlier_marks: canonSort(outliers),
  input_sha256: inputSha256,
  evidence_source: evidenceSource,
});

console.log(`[${status}] edge_paper_evidence_ingest — ${reasonCode}`);
process.exit(status === 'BLOCKED' ? 1 : 0);
