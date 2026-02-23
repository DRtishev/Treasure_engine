import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd, canonSort } from './canon.mjs';
import { profileForEvidenceSource, resolveProfit00EpochDir, resolveProfit00ManualDir } from './edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const CSV_PATH = path.join(ROOT, 'artifacts', 'incoming', 'raw_paper_telemetry.csv');
const JSONL_PATH = path.join(ROOT, 'artifacts', 'incoming', 'paper_telemetry.jsonl');
const PROFILE_PATH = path.join(ROOT, 'artifacts', 'incoming', 'paper_telemetry.profile');
let outputProfile = '';

function withOutputProfile(fn) {
  const prev = process.env.EDGE_PROFIT_PROFILE;
  if (outputProfile) process.env.EDGE_PROFIT_PROFILE = outputProfile;
  const out = fn();
  if (outputProfile) {
    if (prev === undefined) delete process.env.EDGE_PROFIT_PROFILE;
    else process.env.EDGE_PROFIT_PROFILE = prev;
  }
  return out;
}

function outputEpochDir() {
  return withOutputProfile(() => resolveProfit00EpochDir(ROOT));
}

function outputManualDir() {
  return withOutputProfile(() => resolveProfit00ManualDir(ROOT));
}

const SCHEMA = [
  ['ts', 'string_iso8601z'],
  ['symbol', 'string'],
  ['side', 'enum(BUY|SELL)'],
  ['signal_id', 'string'],
  ['intended_entry', 'number'],
  ['intended_exit', 'number'],
  ['fill_price', 'number'],
  ['fee', 'number'],
  ['slippage_bps', 'number'],
  ['latency_ms', 'number'],
  ['result_pnl', 'number'],
  ['source_tag', 'string'],
  ['spread_bps', 'number_optional_default_1'],
  ['size_ratio', 'number_optional_default_1'],
];
const REQUIRED = SCHEMA.map(([k]) => k).slice(0, 12);
const ALLOWED_SIDE = new Set(['BUY', 'SELL']);
const SCHEMA_SIGNATURE = crypto.createHash('sha256').update(JSON.stringify(SCHEMA)).digest('hex');

fs.mkdirSync(path.dirname(JSONL_PATH), { recursive: true });
fs.mkdirSync(outputManualDir(), { recursive: true });

function fileSha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function writeOutputs({ status, reasonCode, why, nextAction, signatures = [], diagnostics = [] }) {
  const md = `# IMPORT_CSV.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## CODE\n\n- code: ${reasonCode}\n\n## WHY\n\n- ${why}\n\n## SIGNATURES\n\n- schema_signature: ${SCHEMA_SIGNATURE}\n${signatures.length ? signatures.map((s) => `- ${s}`).join('\n') : '- NONE'}\n\n## DIAGNOSTICS\n\n${diagnostics.length ? diagnostics.map((d) => `- ${d}`).join('\n') : '- NONE'}\n`;
  fs.mkdirSync(outputManualDir(), { recursive: true });
  writeMd(path.join(outputEpochDir(), 'IMPORT_CSV.md'), md);
  writeJsonDeterministic(path.join(outputManualDir(), 'import_csv.json'), {
    schema_version: '1.0.0',
    status,
    reason_code: reasonCode,
    run_id: RUN_ID,
    message: why,
    next_action: nextAction,
    schema_signature: SCHEMA_SIGNATURE,
    signatures,
    diagnostics,
  });
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { header: [], rows: [], lines };
  const header = lines[0].split(',').map((v) => v.trim());
  const rows = lines.slice(1).map((line) => line.split(',').map((v) => v.trim()));
  return { header, rows, lines };
}

function normalizeTs(ts) {
  const t = String(ts).trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(t)) return null;
  return t;
}

function parseNum(raw) {
  if (raw === '' || raw === undefined || raw === null) return NaN;
  if (!/^-?\d+(\.\d+)?$/.test(String(raw))) return NaN;
  return Number(raw);
}

if (!fs.existsSync(CSV_PATH)) {
  writeOutputs({
    status: 'NEEDS_DATA',
    reasonCode: 'IM01',
    why: 'Input CSV is missing.',
    nextAction: 'npm run -s edge:profit:00:import:csv',
    diagnostics: ['missing_input: artifacts/incoming/raw_paper_telemetry.csv'],
  });
  console.log('[NEEDS_DATA] paper_telemetry_import_csv — IM01');
  process.exit(0);
}

const rawText = fs.readFileSync(CSV_PATH, 'utf8');
const inputSha256 = fileSha256(rawText);
if (/"/.test(rawText)) {
  writeOutputs({
    status: 'BLOCKED',
    reasonCode: 'IM03',
    why: 'Quoted CSV is ambiguous for strict parser mode.',
    nextAction: 'npm run -s edge:profit:00:import:csv',
    signatures: [`input_sha256: ${inputSha256}`],
    diagnostics: ['quoted_csv_detected:true'],
  });
  console.log('[BLOCKED] paper_telemetry_import_csv — IM03');
  process.exit(1);
}

const { header, rows, lines } = parseCsv(rawText);
const missingHeaders = REQUIRED.filter((field) => !header.includes(field));
if (header.length === 0 || missingHeaders.length > 0) {
  writeOutputs({
    status: 'BLOCKED',
    reasonCode: 'IM02',
    why: 'Required CSV columns are missing.',
    nextAction: 'npm run -s edge:profit:00:import:csv',
    signatures: [`input_sha256: ${inputSha256}`],
    diagnostics: canonSort(missingHeaders.map((h) => `missing_header:${h}`)),
  });
  console.log('[BLOCKED] paper_telemetry_import_csv — IM02');
  process.exit(1);
}

const seen = new Set();
const duplicateKeys = [];
const mapped = [];
const parseErrors = [];

for (let i = 0; i < rows.length; i++) {
  const idx = i + 2;
  const cols = rows[i];
  if (cols.length !== header.length) {
    parseErrors.push(`row_${idx}:column_count_mismatch`);
    continue;
  }

  const row = {};
  for (let c = 0; c < header.length; c++) row[header[c]] = cols[c] ?? '';
  const missing = REQUIRED.filter((k) => !String(row[k] ?? '').trim());
  if (missing.length) {
    parseErrors.push(`row_${idx}:missing_fields:${missing.join('+')}`);
    continue;
  }

  const ts = normalizeTs(row.ts);
  const side = String(row.side).toUpperCase();
  const n = {
    intended_entry: parseNum(row.intended_entry),
    intended_exit: parseNum(row.intended_exit),
    fill_price: parseNum(row.fill_price),
    fee: parseNum(row.fee),
    slippage_bps: parseNum(row.slippage_bps),
    latency_ms: parseNum(row.latency_ms),
    result_pnl: parseNum(row.result_pnl),
    spread_bps: row.spread_bps ? parseNum(row.spread_bps) : 1,
    size_ratio: row.size_ratio ? parseNum(row.size_ratio) : 1,
  };

  if (!ts) parseErrors.push(`row_${idx}:invalid_ts`);
  if (!ALLOWED_SIDE.has(side)) parseErrors.push(`row_${idx}:invalid_side:${row.side}`);
  for (const [k, v] of Object.entries(n)) {
    if (!Number.isFinite(v)) parseErrors.push(`row_${idx}:invalid_number:${k}`);
  }

  const key = `${row.signal_id}|${ts || row.ts}|${row.symbol}`;
  if (seen.has(key)) duplicateKeys.push(`row_${idx}:duplicate_key:${key}`);
  seen.add(key);

  mapped.push({
    ts: ts || row.ts,
    symbol: String(row.symbol),
    side,
    signal_id: String(row.signal_id),
    intended_entry: Number(n.intended_entry.toFixed(8)),
    intended_exit: Number(n.intended_exit.toFixed(8)),
    fill_price: Number(n.fill_price.toFixed(8)),
    fee: Number(n.fee.toFixed(8)),
    slippage_bps: Number(n.slippage_bps.toFixed(8)),
    latency_ms: Number(n.latency_ms.toFixed(8)),
    result_pnl: Number(n.result_pnl.toFixed(8)),
    source_tag: String(row.source_tag),
    spread_bps: Number(n.spread_bps.toFixed(8)),
    size_ratio: Number(n.size_ratio.toFixed(8)),
  });
}

if (duplicateKeys.length > 0) {
  writeOutputs({
    status: 'BLOCKED',
    reasonCode: 'IM04',
    why: 'Duplicate key rows were detected.',
    nextAction: 'npm run -s edge:profit:00:import:csv',
    signatures: [`input_sha256: ${inputSha256}`],
    diagnostics: canonSort(duplicateKeys),
  });
  console.log('[BLOCKED] paper_telemetry_import_csv — IM04');
  process.exit(1);
}

if (parseErrors.length > 0) {
  const first = canonSort(parseErrors)[0] || 'row_unknown:parse_error';
  const rowHint = first.split(':')[0].replace('row_', '');
  writeOutputs({
    status: 'BLOCKED',
    reasonCode: 'IM05',
    why: `Parse error at row ${rowHint}.`,
    nextAction: 'npm run -s edge:profit:00:import:csv',
    signatures: [`input_sha256: ${inputSha256}`],
    diagnostics: canonSort(parseErrors),
  });
  console.log('[BLOCKED] paper_telemetry_import_csv — IM05');
  process.exit(1);
}

mapped.sort((a, b) => a.ts.localeCompare(b.ts) || a.signal_id.localeCompare(b.signal_id) || a.symbol.localeCompare(b.symbol));

const sourceTags = new Set(mapped.map((r) => String(r.source_tag || '').toUpperCase()));
const hasStubTag = [...sourceTags].some((t) => t.includes('REAL_STUB'));
const hasSandboxTag = [...sourceTags].some((t) => t.includes('REAL_SANDBOX'));
const importedEvidenceSource = hasSandboxTag
  ? 'REAL_SANDBOX'
  : hasStubTag
    ? 'FIXTURE_STUB'
    : 'REAL';
const jsonl = mapped.map((r) => JSON.stringify(r)).join('\n') + '\n';
const resolvedProfile = profileForEvidenceSource(importedEvidenceSource);
outputProfile = resolvedProfile;
if (!resolvedProfile) {
  writeOutputs({
    status: 'BLOCKED',
    reasonCode: 'PF01',
    why: `Unable to map imported evidence_source=${importedEvidenceSource} to profile marker.`,
    nextAction: 'npm run -s edge:profit:00:import:csv',
    signatures: [`input_sha256: ${inputSha256}`],
    diagnostics: ['profile_mapping_failed:true'],
  });
  console.log('[BLOCKED] paper_telemetry_import_csv — PF01');
  process.exit(1);
}

fs.writeFileSync(JSONL_PATH, jsonl);
fs.writeFileSync(PROFILE_PATH, `${resolvedProfile}\n`);

const outputSha256 = fileSha256(jsonl);
writeOutputs({
  status: 'PASS',
  reasonCode: 'NONE',
  why: 'CSV import completed with deterministic normalization.',
  nextAction: 'npm run -s edge:profit:00',
  signatures: [
    `input_sha256: ${inputSha256}`,
    `output_sha256: ${outputSha256}`,
    `imported_evidence_source: ${importedEvidenceSource}`,
    `rows_raw: ${rows.length}`,
    `rows_exported: ${mapped.length}`,
    `profile: ${resolvedProfile}`,
  ],
  diagnostics: [
    `input_path: ${path.relative(ROOT, CSV_PATH).replace(/\\/g, '/')}`,
    `output_path: ${path.relative(ROOT, JSONL_PATH).replace(/\\/g, '/')}`,
    `profile_marker_path: ${path.relative(ROOT, PROFILE_PATH).replace(/\\/g, '/')}`,
    `first_data_line: ${lines[1] ? lines[1].slice(0, 120) : 'NONE'}`,
  ],
});

console.log('[PASS] paper_telemetry_import_csv — NONE');
