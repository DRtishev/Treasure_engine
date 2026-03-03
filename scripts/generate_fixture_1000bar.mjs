#!/usr/bin/env node
/**
 * generate_fixture_1000bar.mjs
 *
 * Deterministic generator for a 1000-bar OHLCV fixture with 4 volatility regimes.
 * Uses Mulberry32 PRNG (seed 421008) for full reproducibility.
 *
 * Regimes:
 *   Bars   0-249  LOW_VOL  — daily vol ~1.0%, price ~42000-43000
 *   Bars 250-499  NORMAL   — daily vol ~3.0%, trending up to ~45000
 *   Bars 500-749  HIGH_VOL — daily vol ~6.0%, volatile ~44000-46000
 *   Bars 750-999  CRISIS   — daily vol ~10%+, crash to ~38000, partial recovery
 *
 * Output: data/fixtures/e108/e108_ohlcv_1000bar_multiregime.json
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const OUTPUT_PATH = resolve(
  PROJECT_ROOT,
  "data/fixtures/e108/e108_ohlcv_1000bar_multiregime.json"
);

// ---------------------------------------------------------------------------
// Mulberry32 PRNG — deterministic 32-bit PRNG
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform — returns a standard normal variate using the PRNG
function boxMuller(rng) {
  let u1 = rng();
  // Avoid log(0)
  while (u1 === 0) u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// ---------------------------------------------------------------------------
// Round helper — 2 decimal places (price), 1 decimal (volume)
// ---------------------------------------------------------------------------
const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;

// ---------------------------------------------------------------------------
// Regime definitions
// ---------------------------------------------------------------------------
// There are 288 five-minute bars in a day.
// Daily vol σ_day relates to per-bar vol σ_bar via:  σ_bar = σ_day / sqrt(288)
//
// Regime parameters:
//   perBarVol  — σ_bar as a fraction of price
//   drift      — per-bar drift (fraction of price) to steer price toward target
//   volBase    — base volume (BTC)
//   volSpread  — random spread on volume

const REGIMES = [
  {
    // Bars 0-249: LOW_VOL
    name: "LOW_VOL",
    start: 0,
    end: 249,
    perBarVol: 0.01 / Math.sqrt(288), // ~1% daily
    drift: 0.0,                        // mostly flat, small positive
    targetPrice: 42500,
    meanRevertStrength: 0.002,
    volBase: 120,
    volSpread: 80,
  },
  {
    // Bars 250-499: NORMAL — trending up to ~45000
    name: "NORMAL",
    start: 250,
    end: 499,
    perBarVol: 0.03 / Math.sqrt(288), // ~3% daily
    drift: 0.0003,                     // upward drift
    targetPrice: 45000,
    meanRevertStrength: 0.001,
    volBase: 180,
    volSpread: 120,
  },
  {
    // Bars 500-749: HIGH_VOL — volatile, mean-reverting around 44000-46000
    name: "HIGH_VOL",
    start: 500,
    end: 749,
    perBarVol: 0.06 / Math.sqrt(288), // ~6% daily
    drift: 0.0,
    targetPrice: 45000,
    meanRevertStrength: 0.003,
    volBase: 300,
    volSpread: 200,
  },
  {
    // Bars 750-999: CRISIS — crash then partial recovery
    name: "CRISIS",
    start: 750,
    end: 999,
    perBarVol: 0.10 / Math.sqrt(288), // ~10% daily
    drift: 0.0,
    targetPrice: null, // special handling: crash then recover
    meanRevertStrength: 0.0,
    volBase: 500,
    volSpread: 400,
  },
];

function getRegime(barIndex) {
  for (const r of REGIMES) {
    if (barIndex >= r.start && barIndex <= r.end) return r;
  }
  return REGIMES[REGIMES.length - 1];
}

// ---------------------------------------------------------------------------
// Crisis regime target price path: crash from ~45000 to ~38000 by bar ~875,
// then partial recovery to ~40500 by bar 999.
// ---------------------------------------------------------------------------
function crisisTarget(barIndex) {
  const localIdx = barIndex - 750; // 0..249
  if (localIdx <= 125) {
    // Crash phase: 45000 -> 38000 over 126 bars
    const t = localIdx / 125;
    return 45000 - 7000 * t;
  } else {
    // Recovery phase: 38000 -> 40500 over 124 bars
    const t = (localIdx - 125) / 124;
    return 38000 + 2500 * t;
  }
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------
function generate() {
  const SEED = 421008;
  const rng = mulberry32(SEED);
  const TOTAL_BARS = 1000;
  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const START_TS = 1704067200000;     // 2024-01-01T00:00:00Z
  const INITIAL_PRICE = 42000;

  const candles = [];
  let prevClose = INITIAL_PRICE;

  for (let i = 0; i < TOTAL_BARS; i++) {
    const regime = getRegime(i);
    const tsOpen = START_TS + i * INTERVAL_MS;
    const tsClose = tsOpen + INTERVAL_MS - 1;

    // --- Compute per-bar return ---
    const z = boxMuller(rng);
    let barReturn = z * regime.perBarVol;

    // Add drift
    barReturn += regime.drift;

    // Mean-reversion toward target
    if (regime.name === "CRISIS") {
      const target = crisisTarget(i);
      const pull = (target - prevClose) / prevClose;
      barReturn += pull * 0.015; // strong pull in crisis
    } else if (regime.targetPrice !== null) {
      const pull = (regime.targetPrice - prevClose) / prevClose;
      barReturn += pull * regime.meanRevertStrength;
    }

    // --- Compute OHLC ---
    const open = r2(prevClose);
    const close = r2(open * (1 + barReturn));

    // Generate intra-bar high/low excursions
    // The high must be >= max(open, close), low must be <= min(open, close)
    const barTop = Math.max(open, close);
    const barBot = Math.min(open, close);
    const barRange = barTop - barBot;

    // Extra excursion beyond the open-close range
    const extraHighFrac = Math.abs(boxMuller(rng)) * regime.perBarVol * 0.5;
    const extraLowFrac = Math.abs(boxMuller(rng)) * regime.perBarVol * 0.5;

    const high = r2(barTop + open * extraHighFrac);
    const low = r2(barBot - open * extraLowFrac);

    // --- Volume ---
    const volNoise = rng(); // uniform [0,1)
    const volume = r1(regime.volBase + regime.volSpread * volNoise);

    candles.push({
      ts_open: tsOpen,
      open,
      high,
      low,
      close,
      volume,
      ts_close: tsClose,
      symbol: "BTCUSDT",
      interval: "5m",
    });

    prevClose = close;
  }

  return {
    meta: {
      symbol: "BTCUSDT",
      timeframe: "5m",
      rows: TOTAL_BARS,
      source: "FIXTURE_GENERATED",
      seed: SEED,
      regimes: [
        { bars: "0-249", name: "LOW_VOL", dailyVol: "~1.0%" },
        { bars: "250-499", name: "NORMAL", dailyVol: "~3.0%" },
        { bars: "500-749", name: "HIGH_VOL", dailyVol: "~6.0%" },
        { bars: "750-999", name: "CRISIS", dailyVol: "~10%+" },
      ],
    },
    candles,
  };
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const fixture = generate();

// Ensure output directory exists
mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

writeFileSync(OUTPUT_PATH, JSON.stringify(fixture, null, 2) + "\n", "utf-8");

// Print summary
const candles = fixture.candles;
console.log(`Wrote ${candles.length} bars to ${OUTPUT_PATH}`);
console.log();
console.log("Regime summary:");

for (const regime of REGIMES) {
  const slice = candles.slice(regime.start, regime.end + 1);
  const opens = slice.map((c) => c.open);
  const closes = slice.map((c) => c.close);
  const highs = slice.map((c) => c.high);
  const lows = slice.map((c) => c.low);
  const vols = slice.map((c) => c.volume);

  // Compute realised bar-level volatility
  const returns = [];
  for (let j = 1; j < slice.length; j++) {
    returns.push(Math.log(slice[j].close / slice[j - 1].close));
  }
  const meanRet = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - meanRet) ** 2, 0) / (returns.length - 1);
  const barVol = Math.sqrt(variance);
  const dailyVol = barVol * Math.sqrt(288);

  console.log(
    `  ${regime.name} [${regime.start}-${regime.end}]: ` +
      `open=${opens[0].toFixed(2)}, close=${closes[closes.length - 1].toFixed(2)}, ` +
      `high=${Math.max(...highs).toFixed(2)}, low=${Math.min(...lows).toFixed(2)}, ` +
      `avgVol=${(vols.reduce((a, b) => a + b, 0) / vols.length).toFixed(1)}, ` +
      `dailyVol=${(dailyVol * 100).toFixed(2)}%`
  );
}
