import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');
const INCOMING_FILE = path.join(ROOT, 'artifacts', 'incoming', 'paper_evidence.json');
const PROFIT_CANDIDATES_FILE = path.join(ROOT, 'EDGE_LAB', 'PROFIT_CANDIDATES_V1.md');

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const MIN_TRADES_FOR_PASS = 30;

// JSON Schema for paper_evidence.json — matches PAPER_EVIDENCE_SPEC.md
const SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'PaperEvidence',
  type: 'object',
  required: ['schema_version', 'epoch_id', 'start_date', 'end_date', 'instrument', 'candidates', 'total_trades', 'generated_at'],
  additionalProperties: false,
  properties: {
    schema_version: { type: 'string', const: '1.0.0' },
    epoch_id: { type: 'string', minLength: 1 },
    start_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    end_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    instrument: { type: 'string', enum: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] },
    candidates: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'trade_count', 'expectancy_pct', 'win_rate', 'avg_winner_pct', 'avg_loser_pct', 'max_drawdown_pct', 'sharpe_ratio'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', pattern: '^H_[A-Z_]+$' },
          trade_count: { type: 'integer', minimum: 1 },
          expectancy_pct: { type: 'number' },
          win_rate: { type: 'number', minimum: 0, maximum: 1 },
          avg_winner_pct: { type: 'number', minimum: 0 },
          avg_loser_pct: { type: 'number', maximum: 0 },
          max_drawdown_pct: { type: 'number', minimum: 0 },
          sharpe_ratio: { type: 'number' },
        },
      },
    },
    total_trades: { type: 'integer', minimum: 1 },
    generated_at: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}' },
    notes: { type: 'string' },
  },
};

function writeNeeds(reason_code, message, extra = {}) {
  const gate = { status: 'NEEDS_DATA', reason_code, message, ...extra };
  fs.writeFileSync(path.join(MANUAL_DIR, 'paper_evidence.json'), `${JSON.stringify(gate, null, 2)}\n`);
  const md = `# PAPER_EVIDENCE.md — Paper Trading Evidence Court\ngenerated_at: ${new Date().toISOString()}\nscript: edge_paper_ingest.mjs\n\n## STATUS: NEEDS_DATA\n\n## Reason\n${message}\n\nREASON_CODE: ${reason_code}\nNEXT_ACTION: Provide artifacts/incoming/paper_evidence.json to transition EXECUTION_REALITY from PROXY to MEASURED.\nSPEC: EDGE_LAB/PAPER_EVIDENCE_SPEC.md\n`;
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'PAPER_EVIDENCE.md'), md);
  console.log(`[NEEDS_DATA] edge:paper:ingest — ${reason_code}: ${message}`);
  process.exit(0);
}

function writeBlocked(reason_code, message, extra = {}) {
  const gate = { status: 'BLOCKED', reason_code, message, ...extra };
  fs.writeFileSync(path.join(MANUAL_DIR, 'paper_evidence.json'), `${JSON.stringify(gate, null, 2)}\n`);
  const md = `# PAPER_EVIDENCE.md — Paper Trading Evidence Court\ngenerated_at: ${new Date().toISOString()}\nscript: edge_paper_ingest.mjs\n\n## STATUS: BLOCKED\n\n## Reason\n${message}\n\nREASON_CODE: ${reason_code}\nNEXT_ACTION: Fix the paper_evidence.json file per EDGE_LAB/PAPER_EVIDENCE_SPEC.md and rerun.\nSPEC: EDGE_LAB/PAPER_EVIDENCE_SPEC.md\n`;
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'PAPER_EVIDENCE.md'), md);
  console.error(`[BLOCKED] edge:paper:ingest — ${reason_code}: ${message}`);
  process.exit(1);
}

// --- Step 1: Check if incoming file exists ---
if (!fs.existsSync(INCOMING_FILE)) {
  writeNeeds('NO_PAPER_EVIDENCE', `artifacts/incoming/paper_evidence.json not found. Run paper trading epoch first.`);
}

// --- Step 2: Parse JSON ---
let data;
try {
  data = JSON.parse(fs.readFileSync(INCOMING_FILE, 'utf8'));
} catch (e) {
  writeBlocked('JSON_PARSE_ERROR', `Failed to parse paper_evidence.json: ${e.message}`);
}

// --- Step 3: Validate with AJV ---
let Ajv;
try {
  Ajv = require('ajv');
  // AJV 8 exports default class differently; handle both CJS and ESM interop
  if (Ajv.default) Ajv = Ajv.default;
} catch (e) {
  writeBlocked('AJV_UNAVAILABLE', `AJV validation library not available. Install dev dependencies: npm install. Error: ${e.message}`);
}

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(SCHEMA);
const valid = validate(data);

if (!valid) {
  const errors = validate.errors.map((e) => `${e.instancePath || '.'} ${e.message}`).join('; ');
  writeBlocked('SCHEMA_VALIDATION_FAILED', `paper_evidence.json failed schema validation: ${errors}`, { validation_errors: validate.errors });
}

// --- Step 4: Date logic check ---
if (data.start_date > data.end_date) {
  writeBlocked('DATE_ORDER_INVALID', `start_date (${data.start_date}) must be <= end_date (${data.end_date})`);
}

// --- Step 5: Candidate name check vs PROFIT_CANDIDATES_V1.md ---
const knownCandidates = new Set();
if (fs.existsSync(PROFIT_CANDIDATES_FILE)) {
  const raw = fs.readFileSync(PROFIT_CANDIDATES_FILE, 'utf8');
  for (const m of raw.matchAll(/## CANDIDATE:\s*(H_[A-Z_]+)/g)) knownCandidates.add(m[1]);
}
const unknownCandidates = data.candidates
  .map((c) => c.name)
  .filter((n) => knownCandidates.size > 0 && !knownCandidates.has(n));
if (unknownCandidates.length > 0) {
  writeBlocked('UNKNOWN_CANDIDATE_NAMES', `Candidates not in PROFIT_CANDIDATES_V1.md: ${unknownCandidates.join(', ')}`);
}

// --- Step 6: Trade count check (min 30 for PASS) ---
const lowTradeCount = data.candidates.filter((c) => c.trade_count < MIN_TRADES_FOR_PASS);
if (lowTradeCount.length > 0) {
  const names = lowTradeCount.map((c) => `${c.name}(${c.trade_count})`).join(', ');
  writeNeeds('INSUFFICIENT_TRADE_COUNT', `Candidates need >= ${MIN_TRADES_FOR_PASS} trades for PASS status. Low count: ${names}`);
}

// --- Step 7: Build per-candidate summary for court output ---
const now = new Date().toISOString();
const candidateSummary = data.candidates.map((c) => ({
  name: c.name,
  trade_count: c.trade_count,
  expectancy_pct: c.expectancy_pct,
  win_rate: c.win_rate,
  sharpe_ratio: c.sharpe_ratio,
  max_drawdown_pct: c.max_drawdown_pct,
  measured: true,
}));

// --- Step 8: Write PASS outputs ---
const gateResult = {
  status: 'PASS',
  reason_code: 'NONE',
  message: `Paper trading evidence ingested. ${data.candidates.length} candidate(s), ${data.total_trades} total trades, epoch: ${data.epoch_id}.`,
  epoch_id: data.epoch_id,
  start_date: data.start_date,
  end_date: data.end_date,
  instrument: data.instrument,
  total_trades: data.total_trades,
  candidates: candidateSummary,
  source_file: 'artifacts/incoming/paper_evidence.json',
  generated_at: now,
};
fs.writeFileSync(path.join(MANUAL_DIR, 'paper_evidence.json'), `${JSON.stringify(gateResult, null, 2)}\n`);

const tableRows = data.candidates.map((c) =>
  `| ${c.name} | ${c.trade_count} | ${c.expectancy_pct.toFixed(3)}% | ${(c.win_rate * 100).toFixed(1)}% | ${c.sharpe_ratio.toFixed(2)} | ${c.max_drawdown_pct.toFixed(2)}% |`,
).join('\n');

const md = `# PAPER_EVIDENCE.md — Paper Trading Evidence Court
generated_at: ${now}
script: edge_paper_ingest.mjs

## STATUS: PASS

## Epoch Summary

| Field | Value |
|-------|-------|
| epoch_id | ${data.epoch_id} |
| start_date | ${data.start_date} |
| end_date | ${data.end_date} |
| instrument | ${data.instrument} |
| total_trades | ${data.total_trades} |
| schema_version | ${data.schema_version} |

## Candidate Performance (MEASURED)

| Candidate | Trades | Expectancy | Win Rate | Sharpe | Max DD |
|-----------|--------|-----------|---------|--------|--------|
${tableRows}

## Verdict

STATUS=PASS: Paper evidence schema valid, trade counts sufficient (>= ${MIN_TRADES_FOR_PASS} per candidate).
MEASURED status will be applied to EXECUTION_REALITY_COURT on next run.
NEXT_ACTION: Rerun edge:all or edge:execution:reality to apply MEASURED expectancy values.

## Spec

EDGE_LAB/PAPER_EVIDENCE_SPEC.md — version 1.0.0
`;

fs.writeFileSync(path.join(EVIDENCE_DIR, 'PAPER_EVIDENCE.md'), md);
console.log(`[PASS] edge:paper:ingest — ${data.epoch_id}: ${data.candidates.length} candidates, ${data.total_trades} trades`);
