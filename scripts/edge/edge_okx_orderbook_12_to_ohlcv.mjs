/**
 * edge_okx_orderbook_12_to_ohlcv.mjs — Orderbook → OHLCV pipeline script
 *
 * EPOCH-74: Data Organ Liveness — F6
 *
 * Orchestrates the alchemist pipeline:
 *   1. Load OKX orderbook fixture (main/fixture.jsonl)
 *   2. Transform via orderbook_alchemist.alchemize()
 *   3. Validate via bar_validator.validateBarSeries()
 *   4. Detect vol regime via vol_regime_detector.detectVolRegime()
 *   5. Write enriched_bars.jsonl + enriched_bars.lock.json
 *
 * Flags:
 *   --replay  Re-run from existing fixture (offline, deterministic)
 *
 * Surface: DATA (offline, TREASURE_NET_KILL=1 required)
 * Exit codes:
 *   0 = PASS
 *   1 = FAIL
 *   2 = NEEDS_DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { alchemize, canonicalSymbol } from '../../core/data/orderbook_alchemist.mjs';
import { validateBarSeries } from '../../core/data/bar_validator.mjs';
import { detectVolRegime } from '../../core/data/vol_regime_detector.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const FIXTURE_PATH = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook', 'main', 'fixture.jsonl');
const LOCK_PATH = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook', 'main', 'lock.json');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'outgoing');
const ENRICHED_BARS_PATH = path.join(OUTPUT_DIR, 'enriched_bars.jsonl');
const ENRICHED_LOCK_PATH = path.join(OUTPUT_DIR, 'enriched_bars.lock.json');

const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');

// NEEDS_DATA if fixture missing
if (!fs.existsSync(FIXTURE_PATH)) {
  console.log(`[NEEDS_DATA] RDY01 missing fixture: ${path.relative(ROOT, FIXTURE_PATH)}`);
  process.exit(2);
}

if (!fs.existsSync(LOCK_PATH)) {
  console.log(`[NEEDS_DATA] RDY01 missing lock: ${path.relative(ROOT, LOCK_PATH)}`);
  process.exit(2);
}

// Load fixture
const raw = fs.readFileSync(FIXTURE_PATH, 'utf8');
const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
const messages = lines.map((l) => JSON.parse(l));

// Load lock for source metadata
const sourceLock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
const instId = sourceLock.instId || 'BTC-USDT';

// Transform
console.log(`[ALCHEMIST] Processing ${messages.length} messages from ${instId}...`);
const { bars, fingerprint } = alchemize(messages, { bar_ms: 60_000, instId });

if (bars.length === 0) {
  console.log('[FAIL] Alchemist produced 0 bars');
  process.exit(1);
}

console.log(`[ALCHEMIST] Produced ${bars.length} bars, fingerprint=${fingerprint.slice(0, 16)}...`);

// Validate
const validation = validateBarSeries(bars);
console.log(`[VALIDATOR] total=${validation.total} valid=${validation.valid} invalid=${validation.invalid} gaps=${validation.gaps.length}`);

if (validation.invalid > 0) {
  for (const r of validation.results.filter((r) => !r.valid)) {
    console.log(`  [INVALID] bar[${r.index}]: ${r.errors.join(', ')}`);
  }
}

// Detect vol regime
const volRegime = detectVolRegime(bars);
console.log(`[VOL_REGIME] regime=${volRegime.regime} realized_vol=${volRegime.realized_vol} confidence=${volRegime.confidence}`);

// Enrich bars with vol regime
const enrichedBars = bars.map((bar) => ({
  ...bar,
  _vol_regime: volRegime.regime,
  _liq_pressure: null,
  _burst_score: null,
  _regime_flag: null,
}));

// Write output
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const enrichedContent = enrichedBars.map((b) => JSON.stringify(b)).join('\n') + '\n';
fs.writeFileSync(ENRICHED_BARS_PATH, enrichedContent);

const enrichedSha = sha256(enrichedContent);

const lockData = {
  schema_version: 'enriched_bars.v1',
  provider_id: 'okx_orderbook_ws',
  source_run_id: `fixture-${sourceLock.raw_sha256?.slice(0, 16) || 'unknown'}`,
  bar_ms: 60000,
  bars_n: enrichedBars.length,
  symbols: [canonicalSymbol(instId)],
  enriched_bars_sha256: enrichedSha,
  alchemist_fingerprint: fingerprint,
  vol_regime: volRegime.regime,
  validation: {
    total: validation.total,
    valid: validation.valid,
    invalid: validation.invalid,
    gaps: validation.gaps.length,
  },
};

writeJsonDeterministic(ENRICHED_LOCK_PATH, lockData);

console.log(`[PASS] Enriched bars written: ${path.relative(ROOT, ENRICHED_BARS_PATH)}`);
console.log(`  bars=${enrichedBars.length} sha=${enrichedSha.slice(0, 16)}... vol_regime=${volRegime.regime}`);
