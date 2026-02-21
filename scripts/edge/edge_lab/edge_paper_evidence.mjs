/**
 * edge_paper_evidence.mjs — EPOCH P0 PAPER_EVIDENCE FOUNDATION
 * Fail-closed validator for trade-level paper evidence.
 * Checks 25+ invariants: timestamps, fills, fees, bid/ask, anti-tamper hash.
 *
 * Reason codes: E*** (Paper Evidence)
 * E001 SCHEMA_VALIDATION_FAILED   JSON schema violation
 * E002 TIMESTAMP_NOT_MONOTONIC    signal > submit OR submit > ack OR ack > fill
 * E003 FILL_SIZE_MISMATCH         sum(fills.qty) != requested_qty within rounding policy
 * E004 FEE_FIELD_MISSING          fill missing fee_amount or fee_currency
 * E005 FEE_BELOW_VENUE_MINIMUM    fee_amount < venue_fee_policy.min_fee_rate * qty * price
 * E006 RECEIPT_HASH_MISMATCH      evidence_hash != computed SHA256(canonical trades) — TAMPER
 * E007 BID_ASK_MISSING            bid_at_signal or ask_at_signal absent (schema) or zero
 * E008 BID_ASK_INVERTED           bid_at_signal >= ask_at_signal
 * E009 PERFECT_FILL_DETECTED      zero latency + zero slippage + single fill in VOLATILE context
 * E010 SPREAD_TOO_TINY            (ask-bid)/mid < 0.00001 (0.001%) — synthetic zero-spread
 * E011 ZERO_LATENCY               order_submit_ts == signal_ts to the millisecond
 * E012 NO_PARTIALS_VOLATILE       VOLATILE context + qty > 0.01 + single fill
 * E013 FILL_PRICE_OUTSIDE_RANGE   fill price outside bid*0.995..ask*1.005
 * E014 DUPLICATE_TRADE_ID         duplicate trade IDs
 * E015 CANDIDATE_PATTERN_INVALID  candidate name doesn't match H_[A-Z_]+
 * E016 FILL_BEFORE_ACK            fill timestamp < ack_ts
 * E017 FILLS_NOT_MONOTONIC        fills not ordered by fill_ts
 * E018 TOTAL_TRADES_MISMATCH      declared total_trades != trades.length
 * E019 EPOCH_DATE_ORDER_INVALID   start_date > end_date
 * E020 JSON_PARSE_ERROR           malformed JSON input
 * E021 SCHEMA_VERSION_INVALID     schema_version != "1.0.0"
 * E022 FEE_CURRENCY_INVALID       fee_currency not in venue_fee_policy.fee_currencies
 * E023 FILL_BEFORE_SIGNAL         fill_ts <= signal_ts
 * E024 ZERO_FILL_QTY              fill qty <= 0 (schema catches this but belt-and-suspenders)
 * E025 NEGATIVE_FEE               fee_amount < 0 (schema: minimum 0, runtime double-check)
 * E900 PAPER_EVIDENCE_MISSING     file not found → NEEDS_DATA
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');
const SCHEMA_FILE = path.join(ROOT, 'scripts', 'edge', 'edge_lab', 'paper_evidence_schema_v1.json');

// Default input: valid fixture (deterministic PASS for npm run edge:paper:evidence)
const DEFAULT_INPUT = path.join(ROOT, 'artifacts', 'incoming', 'paper_evidence.valid.json');

// Parse --file argument if provided
const fileArgIdx = process.argv.indexOf('--file');
const INPUT_FILE = fileArgIdx >= 0 && process.argv[fileArgIdx + 1]
  ? path.resolve(process.argv[fileArgIdx + 1])
  : DEFAULT_INPUT;

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// ── helpers ───────────────────────────────────────────────────────────────────

function tsMs(iso) {
  return new Date(iso).getTime();
}

/** Canonical trades JSON for hashing: sort by trade_id, fixed key order, compact. */
function canonicalTradesJson(trades) {
  const sorted = [...trades].sort((a, b) => a.trade_id.localeCompare(b.trade_id));
  const mapped = sorted.map((t) => ({
    trade_id: t.trade_id,
    candidate: t.candidate,
    side: t.side,
    requested_qty: t.requested_qty,
    instrument: t.instrument,
    signal_ts: t.signal_ts,
    order_submit_ts: t.order_submit_ts,
    ack_ts: t.ack_ts,
    fills: [...t.fills]
      .sort((a, b) => a.fill_ts.localeCompare(b.fill_ts))
      .map((f) => ({
        fill_ts: f.fill_ts,
        qty: f.qty,
        price: f.price,
        fee_amount: f.fee_amount,
        fee_currency: f.fee_currency,
      })),
    bid_at_signal: t.bid_at_signal,
    ask_at_signal: t.ask_at_signal,
    context_volatility: t.context_volatility,
    result: t.result,
  }));
  return JSON.stringify(mapped);
}

function computeEvidenceHash(trades) {
  return crypto.createHash('sha256').update(canonicalTradesJson(trades)).digest('hex');
}

function writeGate(status, reason_code, message, extra = {}) {
  const gate = { status, reason_code, message, ...extra };
  fs.writeFileSync(
    path.join(MANUAL_DIR, 'paper_evidence_court.json'),
    `${JSON.stringify(gate, null, 2)}\n`,
  );
  return gate;
}

function writeCourt(gate, data = null) {
  const isPass = gate.status === 'PASS';
  const isNeeds = gate.status === 'NEEDS_DATA';
  const statusLine = `## STATUS: ${gate.status}`;

  let summarySection = '';
  if (data && isPass) {
    const candidates = {};
    for (const t of data.trades) {
      if (!candidates[t.candidate]) candidates[t.candidate] = { trades: 0, wins: 0 };
      candidates[t.candidate].trades += 1;
      if (t.result === 'WIN') candidates[t.candidate].wins += 1;
    }
    const rows = Object.entries(candidates)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, s]) => `| ${name} | ${s.trades} | ${((s.wins / s.trades) * 100).toFixed(1)}% |`)
      .join('\n');
    summarySection = `
## Candidate Summary (MEASURED)

| Candidate | Trades | Win Rate |
|-----------|--------|---------|
${rows}

## Epoch

| Field | Value |
|-------|-------|
| epoch_id | ${data.epoch_id} |
| start_date | ${data.start_date} |
| end_date | ${data.end_date} |
| instrument | ${data.instrument} |
| venue | ${data.venue} |
| total_trades | ${data.total_trades} |
| schema_version | ${data.schema_version} |
| evidence_hash (verified) | \`${data.evidence_hash}\` |`;
  }

  const md = `# PAPER_EVIDENCE_COURT.md — EPOCH P0 Paper Evidence Court
generated_at: ${new Date().toISOString()}
script: edge_paper_evidence.mjs
schema: paper_evidence_schema_v1.json
input: ${path.relative(ROOT, INPUT_FILE)}

${statusLine}

## Reason Code
${gate.reason_code}${gate.reason_code !== 'NONE' ? `\n\n## Blocker\n${gate.message}` : ''}
${summarySection}

## Invariants Checked (25+)

| # | Code | Invariant |
|---|------|-----------|
| 1 | E900 | File exists |
| 2 | E020 | JSON parseable |
| 3 | E021 | schema_version == "1.0.0" |
| 4 | E001 | AJV schema validation (structural) |
| 5 | E006 | evidence_hash == SHA256(canonical trades) — anti-tamper |
| 6 | E019 | start_date <= end_date |
| 7 | E018 | total_trades == trades.length |
| 8 | E014 | No duplicate trade_ids |
| 9 | E002 | signal_ts < order_submit_ts (monotonic) |
| 10 | E011 | order_submit_ts - signal_ts >= 1ms (no zero latency) |
| 11 | E002 | order_submit_ts < ack_ts (monotonic) |
| 12 | E016 | ack_ts <= first fill_ts |
| 13 | E017 | fills ordered monotonically by fill_ts |
| 14 | E023 | all fill_ts > signal_ts |
| 15 | E003 | sum(fill.qty) == requested_qty within rounding_policy |
| 16 | E024 | all fill qty > 0 |
| 17 | E025 | fee_amount >= 0 for all fills |
| 18 | E005 | fee_amount >= venue_fee_policy.min_fee_rate * qty * price |
| 19 | E022 | fee_currency in venue_fee_policy.fee_currencies |
| 20 | E007 | bid_at_signal > 0 |
| 21 | E007 | ask_at_signal > 0 |
| 22 | E008 | bid_at_signal < ask_at_signal |
| 23 | E010 | spread >= 0.001% of mid price (zero-spread detection) |
| 24 | E013 | fill price within bid*0.995 .. ask*1.005 |
| 25 | E009 | VOLATILE context: no perfect-fill signature |
| 26 | E012 | VOLATILE + qty > 0.01: partials required |

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/PAPER_EVIDENCE_COURT.md
- reports/evidence/EDGE_LAB/gates/manual/paper_evidence_court.json

NEXT_ACTION: ${isPass ? 'Proceed to EPOCH P1 (EXPECTANCY_CI_COURT).' : isNeeds ? 'Provide artifacts/incoming/paper_evidence.valid.json to run trade-level validation.' : 'Fix the invariant violations and rerun: npm run edge:paper:evidence'}

## Spec

EDGE_LAB/PAPER_EVIDENCE_SCHEMA_V1.md — version 1.0.0
EDGE_LAB/PAPER_EVIDENCE_RECEIPTS.md — hash chain rules
`;
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'PAPER_EVIDENCE_COURT.md'), md);
}

function exitNeeds(reason_code, message) {
  const gate = writeGate('NEEDS_DATA', reason_code, message);
  writeCourt(gate);
  console.log(`[NEEDS_DATA] edge:paper:evidence — ${reason_code}: ${message}`);
  process.exit(0);
}

function exitFail(reason_code, message, extra = {}) {
  const gate = writeGate('FAIL', reason_code, message, extra);
  writeCourt(gate);
  console.error(`[FAIL] edge:paper:evidence — ${reason_code}: ${message}`);
  process.exit(1);
}

function exitPass(data) {
  const gate = writeGate('PASS', 'NONE', `PAPER_EVIDENCE_COURT: all invariants satisfied. ${data.total_trades} trades across ${data.trades.map(t => t.candidate).filter((v, i, a) => a.indexOf(v) === i).length} candidates. evidence_hash verified.`);
  writeCourt(gate, data);
  console.log(`[PASS] edge:paper:evidence — ${data.epoch_id}: ${data.total_trades} trades, hash verified`);
  process.exit(0);
}

// ── INVARIANT 1: E900 File exists ─────────────────────────────────────────────
if (!fs.existsSync(INPUT_FILE)) {
  exitNeeds('E900', `Paper evidence file not found: ${path.relative(ROOT, INPUT_FILE)}. Run paper epoch first.`);
}

// ── INVARIANT 2: E020 JSON parseable ─────────────────────────────────────────
let data;
try {
  data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
} catch (e) {
  exitFail('E020', `JSON_PARSE_ERROR: ${e.message}`);
}

// ── INVARIANT 3: E021 Schema version ─────────────────────────────────────────
if (!data.schema_version || data.schema_version !== '1.0.0') {
  exitFail('E021', `SCHEMA_VERSION_INVALID: expected "1.0.0", got "${data.schema_version}"`);
}

// ── INVARIANT 4: E001 AJV Schema validation ───────────────────────────────────
let schema;
try {
  schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
} catch (e) {
  exitFail('E001', `Cannot load schema file: ${e.message}`);
}

let Ajv;
try {
  Ajv = require('ajv');
  if (Ajv.default) Ajv = Ajv.default;
} catch (e) {
  exitFail('E001', `AJV unavailable (run npm install): ${e.message}`);
}

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
if (!validate(data)) {
  const errors = validate.errors.map((e) => `${e.instancePath || '.'} ${e.message}`).join('; ');
  exitFail('E001', `SCHEMA_VALIDATION_FAILED: ${errors}`, { validation_errors: validate.errors });
}

// ── INVARIANT 5: E006 Anti-tamper hash ───────────────────────────────────────
const computedHash = computeEvidenceHash(data.trades);
if (data.evidence_hash !== computedHash) {
  exitFail('E006', `RECEIPT_HASH_MISMATCH: declared=${data.evidence_hash.slice(0, 16)}… computed=${computedHash.slice(0, 16)}… — TAMPER DETECTED`, {
    declared_hash: data.evidence_hash,
    computed_hash: computedHash,
  });
}

// ── INVARIANT 6: E019 Date order ─────────────────────────────────────────────
if (data.start_date > data.end_date) {
  exitFail('E019', `EPOCH_DATE_ORDER_INVALID: start_date (${data.start_date}) > end_date (${data.end_date})`);
}

// ── INVARIANT 7: E018 Total trades match ─────────────────────────────────────
if (data.total_trades !== data.trades.length) {
  exitFail('E018', `TOTAL_TRADES_MISMATCH: declared=${data.total_trades} actual=${data.trades.length}`);
}

// ── INVARIANT 8: E014 No duplicate trade IDs ─────────────────────────────────
const seenIds = new Set();
for (const t of data.trades) {
  if (seenIds.has(t.trade_id)) {
    exitFail('E014', `DUPLICATE_TRADE_ID: "${t.trade_id}" appears more than once`);
  }
  seenIds.add(t.trade_id);
}

// ── Per-trade invariants ──────────────────────────────────────────────────────
for (const t of data.trades) {
  const tid = t.trade_id;
  const sigMs = tsMs(t.signal_ts);
  const subMs = tsMs(t.order_submit_ts);
  const ackMs = tsMs(t.ack_ts);
  const fillMsTimes = t.fills.map((f) => tsMs(f.fill_ts));
  const firstFillMs = fillMsTimes[0];

  // ── INVARIANT 9: E002 signal < submit ──────────────────────────────────────
  if (sigMs >= subMs) {
    exitFail('E002', `TIMESTAMP_NOT_MONOTONIC: trade ${tid}: signal_ts (${t.signal_ts}) >= order_submit_ts (${t.order_submit_ts})`);
  }

  // ── INVARIANT 10: E011 Zero latency (submit - signal >= 1ms) ───────────────
  if (subMs - sigMs < 1) {
    exitFail('E011', `ZERO_LATENCY: trade ${tid}: order_submit_ts - signal_ts < 1ms (impossible in real trading)`);
  }

  // ── INVARIANT 11: E002 submit < ack ────────────────────────────────────────
  if (subMs >= ackMs) {
    exitFail('E002', `TIMESTAMP_NOT_MONOTONIC: trade ${tid}: order_submit_ts (${t.order_submit_ts}) >= ack_ts (${t.ack_ts})`);
  }

  // ── INVARIANT 12: E016 ack <= first fill ───────────────────────────────────
  if (ackMs > firstFillMs) {
    exitFail('E016', `FILL_BEFORE_ACK: trade ${tid}: ack_ts (${t.ack_ts}) > first fill_ts (${t.fills[0].fill_ts})`);
  }

  // ── INVARIANT 13: E017 fills monotonically ordered ─────────────────────────
  for (let i = 1; i < fillMsTimes.length; i++) {
    if (fillMsTimes[i] <= fillMsTimes[i - 1]) {
      exitFail('E017', `FILLS_NOT_MONOTONIC: trade ${tid}: fill[${i}].fill_ts (${t.fills[i].fill_ts}) <= fill[${i-1}].fill_ts`);
    }
  }

  // ── INVARIANT 14: E023 all fill_ts > signal_ts ─────────────────────────────
  for (const f of t.fills) {
    if (tsMs(f.fill_ts) <= sigMs) {
      exitFail('E023', `FILL_BEFORE_SIGNAL: trade ${tid}: fill_ts (${f.fill_ts}) <= signal_ts (${t.signal_ts})`);
    }
  }

  // ── INVARIANT 15: E003 fill qty sums to requested ──────────────────────────
  const totalFillQty = t.fills.reduce((acc, f) => acc + f.qty, 0);
  const driftPct = Math.abs(totalFillQty - t.requested_qty) / t.requested_qty;
  if (driftPct > data.rounding_policy.max_fill_qty_drift_pct / 100) {
    exitFail('E003', `FILL_SIZE_MISMATCH: trade ${tid}: sum(fill.qty)=${totalFillQty.toFixed(8)} requested=${t.requested_qty} drift=${(driftPct * 100).toFixed(6)}% > max ${data.rounding_policy.max_fill_qty_drift_pct}%`);
  }

  // ── INVARIANT 16: E024 all fill qty > 0 (belt-and-suspenders) ──────────────
  for (const f of t.fills) {
    if (f.qty <= 0) {
      exitFail('E024', `ZERO_FILL_QTY: trade ${tid}: fill qty ${f.qty} <= 0`);
    }
  }

  // ── INVARIANT 17-19: Fee invariants ────────────────────────────────────────
  const allowedCurrencies = new Set(data.venue_fee_policy.fee_currencies);
  for (const f of t.fills) {
    // E025 non-negative fee (schema enforces minimum: 0, but double-check)
    if (f.fee_amount < 0) {
      exitFail('E025', `NEGATIVE_FEE: trade ${tid}: fee_amount=${f.fee_amount} < 0`);
    }
    // E005 fee >= venue minimum
    const minFee = data.venue_fee_policy.min_fee_rate * f.qty * f.price;
    if (f.fee_amount < minFee) {
      exitFail('E005', `FEE_BELOW_VENUE_MINIMUM: trade ${tid}: fee_amount=${f.fee_amount} < min(${minFee.toFixed(6)}) = ${data.venue_fee_policy.min_fee_rate}*${f.qty}*${f.price}`);
    }
    // E022 fee currency valid
    if (!allowedCurrencies.has(f.fee_currency)) {
      exitFail('E022', `FEE_CURRENCY_INVALID: trade ${tid}: fee_currency="${f.fee_currency}" not in ${JSON.stringify(data.venue_fee_policy.fee_currencies)}`);
    }
  }

  // ── INVARIANT 20-21: E007 bid/ask present and positive ─────────────────────
  if (!t.bid_at_signal || t.bid_at_signal <= 0) {
    exitFail('E007', `BID_ASK_MISSING: trade ${tid}: bid_at_signal missing or zero`);
  }
  if (!t.ask_at_signal || t.ask_at_signal <= 0) {
    exitFail('E007', `BID_ASK_MISSING: trade ${tid}: ask_at_signal missing or zero`);
  }

  // ── INVARIANT 22: E008 bid < ask ───────────────────────────────────────────
  if (t.bid_at_signal >= t.ask_at_signal) {
    exitFail('E008', `BID_ASK_INVERTED: trade ${tid}: bid_at_signal (${t.bid_at_signal}) >= ask_at_signal (${t.ask_at_signal})`);
  }

  // ── INVARIANT 23: E010 spread >= 0.001% (1 basis point minimum) ───────────
  // Catches synthetically zero-spread data. BTC spot on Binance is typically
  // 0.001%–0.005% (1–5 USDT on 97k BTC). Threshold of 0.001% (0.00001)
  // rejects only obviously synthetic/zero-spread evidence.
  const mid = (t.bid_at_signal + t.ask_at_signal) / 2;
  const spreadPct = (t.ask_at_signal - t.bid_at_signal) / mid;
  if (spreadPct < 0.00001) {
    exitFail('E010', `SPREAD_TOO_TINY: trade ${tid}: spread=${(spreadPct * 100).toFixed(6)}% < 0.001% — synthetic zero-spread detected`);
  }

  // ── INVARIANT 24: E013 fill price within bid±0.5% / ask±0.5% ──────────────
  for (const f of t.fills) {
    const lo = t.bid_at_signal * 0.995;
    const hi = t.ask_at_signal * 1.005;
    if (f.price < lo || f.price > hi) {
      exitFail('E013', `FILL_PRICE_OUTSIDE_RANGE: trade ${tid}: fill price ${f.price} outside [${lo.toFixed(2)}, ${hi.toFixed(2)}]`);
    }
  }

  // ── INVARIANT 25: E009 Perfect fill detection (VOLATILE context) ────────────
  if (t.context_volatility === 'VOLATILE') {
    if (t.fills.length === 1) {
      const fillLatMs = tsMs(t.fills[0].fill_ts) - ackMs;
      const fillPrice = t.fills[0].price;
      const isMidPrice = Math.abs(fillPrice - mid) / mid < 0.0001; // within 0.01% of mid
      if (fillLatMs < 5 && isMidPrice) {
        exitFail('E009', `PERFECT_FILL_DETECTED: trade ${tid}: VOLATILE context + single fill + fill-ack latency ${fillLatMs}ms < 5ms + fill price at mid — suspicious perfect fill`);
      }
    }
  }

  // ── INVARIANT 26: E012 No partials under VOLATILE + large qty ───────────────
  if (t.context_volatility === 'VOLATILE' && t.requested_qty > 0.01 && t.fills.length === 1) {
    exitFail('E012', `NO_PARTIALS_VOLATILE: trade ${tid}: VOLATILE context + requested_qty=${t.requested_qty} > 0.01 + single fill — implausible, expect partial fills`);
  }
}

// ── All invariants satisfied → PASS ──────────────────────────────────────────
exitPass(data);
