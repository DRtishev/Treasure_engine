/**
 * paper_epoch_runner.mjs — Paper Epoch Runner
 *
 * Converts operator-provided raw trade export into paper_evidence.json
 * for MEASURED truth ingest. No network calls. No external dependencies.
 *
 * Input  (checked in order):
 *   artifacts/incoming/raw_paper_trades.csv  — CSV with header row
 *   artifacts/incoming/raw_paper_trades.json — JSON array of trade objects
 *
 * Output:
 *   artifacts/incoming/paper_evidence.json          — gate input for edge:paper:ingest
 *   reports/evidence/EDGE_LAB/PAPER_EPOCH_RUNNER.md — court evidence
 *
 * See: EDGE_LAB/PAPER_EVIDENCE_IMPORT.md for full format specification.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const INCOMING_DIR = path.join(ROOT, 'artifacts', 'incoming');
const CSV_INPUT    = path.join(INCOMING_DIR, 'raw_paper_trades.csv');
const JSON_INPUT   = path.join(INCOMING_DIR, 'raw_paper_trades.json');
const OUTPUT_FILE  = path.join(INCOMING_DIR, 'paper_evidence.json');
const RUNNER_MD    = path.join(EVIDENCE_DIR, 'PAPER_EPOCH_RUNNER.md');
const CANDIDATES_FILE = path.join(ROOT, 'EDGE_LAB', 'PROFIT_CANDIDATES_V1.md');

const SCHEMA_VERSION      = '1.0.0';
const ALLOWED_INSTRUMENTS = new Set(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
const ALLOWED_SIDES       = new Set(['LONG', 'SHORT']);
const MIN_TRADES_FOR_PASS = 30;

const REQUIRED_COLUMNS = ['trade_id', 'candidate', 'instrument', 'entry_time', 'exit_time', 'side', 'pnl_pct'];

const RUN_ID = process.env.TREASURE_RUN_ID
  || process.env.GITHUB_SHA
  || execSync('git rev-parse --short=12 HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(INCOMING_DIR, { recursive: true });

// ─── Output helpers ─────────────────────────────────────────────────────────

function writeMd(status, reasonCode, message, body = '') {
  const now = new Date().toISOString();
  const content = `# PAPER_EPOCH_RUNNER.md — Paper Epoch Runner
generated_at: ${now}
script: paper_epoch_runner.mjs
run_id: ${RUN_ID}

## STATUS: ${status}

## Reason
${message}

REASON_CODE: ${reasonCode}
NEXT_ACTION: ${nextAction(status, reasonCode)}

${body}
`;
  fs.writeFileSync(RUNNER_MD, content.trim() + '\n');
}

function nextAction(status, reasonCode) {
  if (status === 'NEEDS_DATA') {
    if (reasonCode === 'NO_RAW_INPUT') return 'Export raw trades from paper trading platform and save to artifacts/incoming/raw_paper_trades.csv (see EDGE_LAB/PAPER_EVIDENCE_IMPORT.md).';
    if (reasonCode === 'INSUFFICIENT_TRADE_COUNT') return 'Continue paper trading to accumulate >= 30 trades per candidate, then re-run.';
    return 'Provide raw trades input file and re-run.';
  }
  if (status === 'BLOCKED') return 'Fix errors listed above, correct artifacts/incoming/raw_paper_trades.csv, and re-run: node scripts/edge/edge_lab/paper_epoch_runner.mjs';
  if (status === 'PASS') return 'Run: npm run edge:paper:ingest && npm run edge:all && npm run edge:next-epoch';
  return 'See errors above.';
}

function needs(reasonCode, message, body = '') {
  writeMd('NEEDS_DATA', reasonCode, message, body);
  console.log(`[NEEDS_DATA] paper_epoch_runner — ${reasonCode}: ${message}`);
  process.exit(0);
}

function blocked(reasonCode, message, body = '') {
  writeMd('BLOCKED', reasonCode, message, body);
  console.error(`[BLOCKED] paper_epoch_runner — ${reasonCode}: ${message}`);
  process.exit(1);
}

// ─── Candidate registry ──────────────────────────────────────────────────────

function loadKnownCandidates() {
  if (!fs.existsSync(CANDIDATES_FILE)) return new Set();
  const raw = fs.readFileSync(CANDIDATES_FILE, 'utf8');
  const found = new Set();
  for (const m of raw.matchAll(/## CANDIDATE:\s*(H_[A-Z_]+)/g)) found.add(m[1]);
  return found;
}

// ─── CSV parser (no external deps) ──────────────────────────────────────────

function parseCSV(content) {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  if (lines.length < 2) throw new Error('CSV must contain a header row and at least one data row.');

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      throw new Error(`Missing required column: "${col}". Required: ${REQUIRED_COLUMNS.join(', ')}`);
    }
  }

  const idxOf = (col) => headers.indexOf(col);

  const trades = [];
  for (let i = 1; i < lines.length; i++) {
    // Split on commas, but handle trailing commas (optional columns may be empty)
    const values = lines[i].split(',');
    const get = (col) => (values[idxOf(col)] || '').trim();

    const pnlRaw = get('pnl_pct');
    const pnlNum = parseFloat(pnlRaw);
    if (!pnlRaw || isNaN(pnlNum)) {
      throw new Error(`Row ${i + 1}: invalid or missing pnl_pct: "${pnlRaw}".`);
    }

    trades.push({
      trade_id:   get('trade_id'),
      candidate:  get('candidate'),
      instrument: get('instrument'),
      entry_time: get('entry_time'),
      exit_time:  get('exit_time'),
      side:       get('side').toUpperCase(),
      pnl_pct:    pnlNum,
      size_pct:   parseFloat(get('size_pct') || '1.0') || 1.0,
      notes:      get('notes') || '',
    });
  }
  return trades;
}

// ─── JSON parser ─────────────────────────────────────────────────────────────

function parseJSONInput(content) {
  let raw;
  try {
    raw = JSON.parse(content);
  } catch (e) {
    throw new Error(`JSON parse error: ${e.message}`);
  }
  if (!Array.isArray(raw)) throw new Error('JSON input must be an array of trade objects.');

  return raw.map((r, i) => {
    for (const col of REQUIRED_COLUMNS) {
      if (r[col] === undefined || r[col] === null || r[col] === '') {
        throw new Error(`Trade at index ${i}: missing required field: "${col}".`);
      }
    }
    const pnlNum = parseFloat(r.pnl_pct);
    if (isNaN(pnlNum)) throw new Error(`Trade at index ${i}: invalid pnl_pct: "${r.pnl_pct}".`);
    return {
      trade_id:   String(r.trade_id),
      candidate:  String(r.candidate),
      instrument: String(r.instrument),
      entry_time: String(r.entry_time),
      exit_time:  String(r.exit_time),
      side:       String(r.side).toUpperCase(),
      pnl_pct:    pnlNum,
      size_pct:   parseFloat(r.size_pct || 1.0) || 1.0,
      notes:      r.notes || '',
    };
  });
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateTrades(trades, knownCandidates) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();
  const dupIds = [];

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    const loc = `Row ${i + 1} (${t.trade_id || '?'})`;

    if (!t.trade_id) {
      errors.push(`${loc}: trade_id is empty.`);
      continue;
    }

    if (seenIds.has(t.trade_id)) {
      dupIds.push(t.trade_id);
      continue; // will be filtered in dedup step
    }
    seenIds.add(t.trade_id);

    if (knownCandidates.size > 0 && !knownCandidates.has(t.candidate)) {
      errors.push(`${loc}: unknown candidate "${t.candidate}". Known: ${[...knownCandidates].join(', ')}.`);
    }

    if (!ALLOWED_INSTRUMENTS.has(t.instrument)) {
      errors.push(`${loc}: invalid instrument "${t.instrument}". Allowed: ${[...ALLOWED_INSTRUMENTS].join(', ')}.`);
    }

    if (!ALLOWED_SIDES.has(t.side)) {
      errors.push(`${loc}: invalid side "${t.side}". Must be LONG or SHORT.`);
    }

    if (isNaN(t.pnl_pct)) {
      errors.push(`${loc}: pnl_pct is not a number.`);
    }

    if (t.entry_time && t.exit_time) {
      if (!t.entry_time.endsWith('Z') && !t.entry_time.includes('+')) {
        errors.push(`${loc}: entry_time must include UTC offset (Z or +00:00). Got: "${t.entry_time}".`);
      }
      if (!t.exit_time.endsWith('Z') && !t.exit_time.includes('+')) {
        errors.push(`${loc}: exit_time must include UTC offset (Z or +00:00). Got: "${t.exit_time}".`);
      }
      if (t.entry_time >= t.exit_time) {
        errors.push(`${loc}: entry_time must be before exit_time.`);
      }
    }
  }

  if (dupIds.length > 0) {
    warnings.push(`Dedup: removed ${dupIds.length} duplicate trade_id(s): ${[...new Set(dupIds)].slice(0, 5).join(', ')}${dupIds.length > 5 ? '...' : ''}.`);
  }

  // pnl_pct unit sanity check — if all |pnl| < 0.05 it looks like fractional not percent
  const validPnls = trades.filter((t) => !isNaN(t.pnl_pct)).map((t) => Math.abs(t.pnl_pct));
  if (validPnls.length > 5 && validPnls.every((v) => v < 0.05)) {
    warnings.push('WARNING: All |pnl_pct| values < 0.05. This looks like fractional returns (e.g. 0.012) rather than percent (e.g. 1.2). Verify units: pnl_pct must be in PERCENT of capital.');
  }

  return { errors, warnings, dupIds };
}

// ─── Deduplication ───────────────────────────────────────────────────────────

function deduplicate(trades) {
  const seen = new Set();
  return trades.filter((t) => {
    if (seen.has(t.trade_id)) return false;
    seen.add(t.trade_id);
    return true;
  });
}

// ─── Per-candidate stats ─────────────────────────────────────────────────────

function computeStats(trades) {
  // Sort by entry_time (ascending) for equity curve
  const sorted = [...trades].sort((a, b) => a.entry_time.localeCompare(b.entry_time));
  const pnls = sorted.map((t) => t.pnl_pct);
  const n = pnls.length;

  const sum = pnls.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const variance = n > 1
    ? pnls.reduce((a, p) => a + (p - mean) ** 2, 0) / (n - 1)
    : 0;
  const std = Math.sqrt(variance);
  const sharpe = std > 0 ? mean / std : 0;

  const winners = pnls.filter((p) => p > 0);
  const losers  = pnls.filter((p) => p <= 0);

  const winRate    = winners.length / n;
  const avgWinner  = winners.length > 0 ? winners.reduce((a, b) => a + b, 0) / winners.length : 0;
  const avgLoser   = losers.length  > 0 ? losers.reduce((a, b) => a + b, 0)  / losers.length  : 0;

  // Equity curve → max drawdown
  let equity = 100.0;
  let peak   = 100.0;
  let maxDD  = 0.0;
  for (const pnl of pnls) {
    equity = equity * (1 + pnl / 100);
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak * 100;
    if (dd > maxDD) maxDD = dd;
  }

  return {
    trade_count:      n,
    expectancy_pct:   parseFloat(mean.toFixed(4)),
    win_rate:         parseFloat(winRate.toFixed(4)),
    avg_winner_pct:   parseFloat(avgWinner.toFixed(4)),
    avg_loser_pct:    parseFloat(avgLoser.toFixed(4)),
    max_drawdown_pct: parseFloat(maxDD.toFixed(4)),
    sharpe_ratio:     parseFloat(sharpe.toFixed(4)),
  };
}

// ─── Epoch metadata helpers ──────────────────────────────────────────────────

function epochId(startDate, endDate) {
  return process.env.PAPER_EPOCH_ID
    || `PAPER_EPOCH_${startDate.replace(/-/g, '')}${endDate ? '_' + endDate.replace(/-/g, '') : ''}`;
}

function dateOf(ts) {
  return ts ? ts.slice(0, 10) : null;
}

function mode(arr) {
  const counts = {};
  let best = arr[0]; let bestCount = 0;
  for (const v of arr) {
    counts[v] = (counts[v] || 0) + 1;
    if (counts[v] > bestCount) { best = v; bestCount = counts[v]; }
  }
  return best;
}

// ─── Main ────────────────────────────────────────────────────────────────────

// 1) Detect input file
let inputFile = null;
let inputFormat = null;
if (fs.existsSync(CSV_INPUT)) {
  inputFile = CSV_INPUT;
  inputFormat = 'CSV';
} else if (fs.existsSync(JSON_INPUT)) {
  inputFile = JSON_INPUT;
  inputFormat = 'JSON';
} else {
  needs(
    'NO_RAW_INPUT',
    'No raw trades file found. Expected: artifacts/incoming/raw_paper_trades.csv (or .json).',
  );
}

// 2) Parse
let rawTrades;
try {
  const content = fs.readFileSync(inputFile, 'utf8');
  rawTrades = inputFormat === 'CSV' ? parseCSV(content) : parseJSONInput(content);
} catch (e) {
  blocked('PARSE_ERROR', `Failed to parse ${inputFormat} input: ${e.message}`);
}

if (rawTrades.length === 0) {
  needs('NO_RAW_INPUT', `Input file exists but contains no trade rows: ${inputFile}`);
}

// 3) Load known candidates
const knownCandidates = loadKnownCandidates();

// 4) Validate
const { errors, warnings, dupIds } = validateTrades(rawTrades, knownCandidates);
if (errors.length > 0) {
  const errBody = `## Validation Errors\n\n${errors.map((e) => `- ${e}`).join('\n')}\n`;
  blocked(
    'VALIDATION_ERRORS',
    `${errors.length} validation error(s) in ${inputFormat} input. See errors below.`,
    errBody,
  );
}

// 5) Dedup
const trades = deduplicate(rawTrades);

// 6) Group by candidate
const byCand = {};
for (const t of trades) {
  if (!byCand[t.candidate]) byCand[t.candidate] = [];
  byCand[t.candidate].push(t);
}

const candidateNames = Object.keys(byCand).sort();

// 7) Epoch metadata
const allDates = trades.flatMap((t) => [dateOf(t.entry_time), dateOf(t.exit_time)]).filter(Boolean);
const startDate = allDates.reduce((a, b) => (a < b ? a : b), allDates[0]);
const endDate   = allDates.reduce((a, b) => (a > b ? a : b), allDates[0]);
const primaryInstrument = mode(trades.map((t) => t.instrument));

// 8) Compute per-candidate stats
const candidateResults = candidateNames.map((name) => {
  const stats = computeStats(byCand[name]);
  return { name, ...stats };
});

// 9) Check minimum trade count
const lowCount = candidateResults.filter((c) => c.trade_count < MIN_TRADES_FOR_PASS);
if (lowCount.length > 0) {
  const detail = lowCount.map((c) => `${c.name}(${c.trade_count})`).join(', ');
  const tableBody = buildTable(candidateResults, warnings, dupIds, startDate, endDate, primaryInstrument, trades.length);
  needs(
    'INSUFFICIENT_TRADE_COUNT',
    `Candidates need >= ${MIN_TRADES_FOR_PASS} trades for PASS. Low count: ${detail}.`,
    tableBody,
  );
}

// 10) Build paper_evidence.json
const now = new Date().toISOString();
const paperEvidence = {
  schema_version: SCHEMA_VERSION,
  epoch_id:       epochId(startDate, endDate),
  start_date:     startDate,
  end_date:       endDate,
  instrument:     primaryInstrument,
  candidates:     candidateResults,
  total_trades:   trades.length,
  generated_at:   now,
  notes:          `Generated by paper_epoch_runner.mjs from ${inputFormat} input. run_id=${RUN_ID}.`,
};

fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(paperEvidence, null, 2)}\n`);

// 11) Write PAPER_EPOCH_RUNNER.md
const tableBody = buildTable(candidateResults, warnings, dupIds, startDate, endDate, primaryInstrument, trades.length);
writeMd('PASS', 'NONE', `${candidateResults.length} candidate(s) processed, ${trades.length} trades. paper_evidence.json written.`, tableBody);

console.log(`[PASS] paper_epoch_runner — epoch: ${paperEvidence.epoch_id}, candidates: ${candidateResults.length}, trades: ${trades.length}`);
console.log(`  -> artifacts/incoming/paper_evidence.json`);
console.log(`  -> reports/evidence/EDGE_LAB/PAPER_EPOCH_RUNNER.md`);

// ─── Table builder helper ─────────────────────────────────────────────────────

function buildTable(results, warnings, dupIds, startDate, endDate, instrument, totalTrades) {
  const headerLine = '## Epoch Summary\n\n' +
    `| Field | Value |\n|-------|-------|\n` +
    `| epoch_id | ${epochId(startDate, endDate)} |\n` +
    `| start_date | ${startDate} |\n` +
    `| end_date | ${endDate} |\n` +
    `| instrument | ${instrument} |\n` +
    `| total_trades | ${totalTrades} |\n` +
    `| input_format | ${inputFormat} |\n` +
    `| dedup_removed | ${dupIds.length} |\n`;

  const rows = results.map((c) =>
    `| ${c.name} | ${c.trade_count} | ${c.expectancy_pct.toFixed(3)}% | ${(c.win_rate * 100).toFixed(1)}% | ` +
    `${c.sharpe_ratio.toFixed(2)} | ${c.max_drawdown_pct.toFixed(2)}% |`,
  ).join('\n');

  const candTable = '\n## Candidate Stats\n\n' +
    '| Candidate | Trades | Expectancy | Win Rate | Sharpe | Max DD |\n' +
    '|-----------|--------|-----------|---------|--------|--------|\n' +
    rows;

  const warnBlock = warnings.length > 0
    ? '\n## Warnings\n\n' + warnings.map((w) => `- ${w}`).join('\n') + '\n'
    : '';

  return headerLine + candTable + warnBlock;
}
