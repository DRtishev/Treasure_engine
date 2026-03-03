#!/usr/bin/env node
// EPOCH-73 Strategy S5: Multi-Regime Adaptive
//
// Genius Features:
//   G14 — Adaptive Signal Blending: when S3+S4 sub-logics agree → CONFLUENCE
//   G15 — Regime-Conditional Strategy Selection: TREND→momentum, RANGE→MR, CRISIS→flat
//
// Vol regime detection via realized vol → dispatch to sub-strategy.
// Quality gate from core/quality/quality_filter.mjs.
//
// NOTE: _liq_pressure is a PROXY from OHLCV (strategy_bar_enricher.mjs).

import { computeQualityScore } from '../../quality/quality_filter.mjs';

export function meta() {
  return {
    name: 'multi_regime_adaptive',
    version: '1.0.0',
    description: 'Regime-adaptive: momentum in TREND, mean reversion in RANGE, flat in CRISIS (G14+G15)',
    params_schema: {
      // S3-subset
      liq_threshold:     { type: 'number',  min: 0.55, max: 0.80, description: 'Liq pressure threshold (S3)' },
      burst_threshold:   { type: 'number',  min: 1.5,  max: 3.0,  description: 'Volume burst multiplier (S3)' },
      atr_period:        { type: 'integer', min: 5,    max: 30,   description: 'ATR period' },
      atr_stop_mult:     { type: 'number',  min: 1.0,  max: 3.0,  description: 'ATR stop multiplier' },
      // S4-subset
      rsi_period:        { type: 'integer', min: 7,    max: 21,   description: 'RSI period' },
      rsi_oversold:      { type: 'number',  min: 15,   max: 35,   description: 'RSI oversold level' },
      rsi_overbought:    { type: 'number',  min: 65,   max: 85,   description: 'RSI overbought level' },
      sma_period:        { type: 'integer', min: 10,   max: 30,   description: 'SMA period' },
      sma_deviation_pct: { type: 'number',  min: 0.01, max: 0.05, description: 'SMA deviation %' },
      // Regime params
      vol_lookback:      { type: 'integer', min: 10,   max: 50,   description: 'Bars for vol estimation' },
      vol_trend_thresh:  { type: 'number',  min: 0.01, max: 0.04, description: 'Vol above = TREND' },
      vol_crisis_thresh: { type: 'number',  min: 0.04, max: 0.10, description: 'Vol above = CRISIS' },
      quality_gate:      { type: 'number',  min: 0.50, max: 0.80, description: 'Min quality score' },
      // Common
      profit_target_pct: { type: 'number',  min: 0.005, max: 0.03, description: 'Profit target %' },
      stop_loss_pct:     { type: 'number',  min: 0.005, max: 0.03, description: 'Stop loss %' },
      max_hold_bars:     { type: 'integer', min: 5,    max: 50,   description: 'Max hold period' },
    },
    default_params: {
      liq_threshold: 0.55, burst_threshold: 1.0, atr_period: 10, atr_stop_mult: 1.5,
      rsi_period: 10, rsi_oversold: 35, rsi_overbought: 65, sma_period: 15, sma_deviation_pct: 0.005,
      vol_lookback: 15, vol_trend_thresh: 0.01, vol_crisis_thresh: 0.08,
      quality_gate: 0.0, profit_target_pct: 0.008, stop_loss_pct: 0.015, max_hold_bars: 25,
    },
    assumptions: 'Markets alternate between trending and ranging regimes detectable via realized vol. _liq_pressure is synthesized proxy from OHLCV fixtures.',
    failure_modes: 'Regime transition periods where vol is ambiguous. Whipsaw between modes.',
    signal_inputs: ['liq_pressure', 'burst_score', 'regime_flag'],
    regime_preference: 'ALL',
  };
}

export function init(config) {
  const d = meta().default_params;
  return {
    liq_threshold:     config.liq_threshold     ?? d.liq_threshold,
    burst_threshold:   config.burst_threshold   ?? d.burst_threshold,
    atr_period:        config.atr_period        ?? d.atr_period,
    atr_stop_mult:     config.atr_stop_mult     ?? d.atr_stop_mult,
    rsi_period:        config.rsi_period        ?? d.rsi_period,
    rsi_oversold:      config.rsi_oversold      ?? d.rsi_oversold,
    rsi_overbought:    config.rsi_overbought    ?? d.rsi_overbought,
    sma_period:        config.sma_period        ?? d.sma_period,
    sma_deviation_pct: config.sma_deviation_pct ?? d.sma_deviation_pct,
    vol_lookback:      config.vol_lookback      ?? d.vol_lookback,
    vol_trend_thresh:  config.vol_trend_thresh  ?? d.vol_trend_thresh,
    vol_crisis_thresh: config.vol_crisis_thresh ?? d.vol_crisis_thresh,
    quality_gate:      config.quality_gate      ?? d.quality_gate,
    profit_target_pct: config.profit_target_pct ?? d.profit_target_pct,
    stop_loss_pct:     config.stop_loss_pct     ?? d.stop_loss_pct,
    max_hold_bars:     config.max_hold_bars     ?? d.max_hold_bars,
    position: 'FLAT',
    entry_price: 0,
    stop_loss: 0,
    profit_target: 0,
    bars_held: 0,
    regime: 'RANGE',
    confidence: 0,
    sub_strategy: null,
  };
}

// ── Inline sub-strategy helpers (no cross-import coupling) ──

function calcATR(history, period) {
  if (history.length < 2) return 0;
  const trs = [];
  for (let i = 1; i < history.length; i++) {
    const h = history[i].high, l = history[i].low, pc = history[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const slice = trs.slice(-period);
  return slice.length === 0 ? 0 : slice.reduce((s, v) => s + v, 0) / slice.length;
}

function calcRSI(history, period) {
  if (history.length < period + 1) return 50;
  const changes = [];
  for (let i = history.length - period; i < history.length; i++) {
    changes.push(history[i].close - history[i - 1].close);
  }
  let gains = 0, losses = 0;
  for (const c of changes) { if (c > 0) gains += c; else losses += Math.abs(c); }
  if (losses === 0) return 100;
  if (gains === 0) return 0;
  return 100 - (100 / (1 + (gains / period) / (losses / period)));
}

function calcSMA(history, period) {
  if (history.length < period) return null;
  return history.slice(-period).reduce((s, b) => s + b.close, 0) / period;
}

function detectVolRegime(history, lookback, trendThresh, crisisThresh) {
  if (history.length < lookback + 1) return 'RANGE';
  const returns = [];
  for (let i = history.length - lookback; i < history.length; i++) {
    const prev = history[i - 1].close;
    if (prev > 0) returns.push((history[i].close - prev) / prev);
  }
  if (returns.length < 2) return 'RANGE';
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
  const realizedVol = Math.sqrt(variance) * Math.sqrt(252);
  if (realizedVol > crisisThresh) return 'CRISIS';
  if (realizedVol > trendThresh) return 'TREND';
  return 'RANGE';
}

// S3-like momentum signal (inline)
function s3Signal(bar, s) {
  const lp = bar._liq_pressure;
  const bs = bar._burst_score;
  const rf = bar._regime_flag || '';
  if (lp == null || bs == null) return 'HOLD';
  if (lp >= s.liq_threshold && bs >= s.burst_threshold) {
    if (rf.startsWith('BEAR')) return 'SELL';
    if (rf.startsWith('BULL')) return 'BUY';
  }
  return 'HOLD';
}

// S4-like mean-reversion signal (inline)
function s4Signal(bar, s, history) {
  if (history.length < Math.max(s.rsi_period + 2, s.sma_period + 1)) return 'HOLD';
  const rsi = calcRSI(history, s.rsi_period);
  const sma = calcSMA(history, s.sma_period);
  if (sma === null || sma === 0) return 'HOLD';
  const deviation = (bar.close - sma) / sma;
  if (rsi < s.rsi_oversold && deviation < -s.sma_deviation_pct) return 'BUY';
  if (rsi > s.rsi_overbought && deviation > s.sma_deviation_pct) return 'SELL';
  return 'HOLD';
}

export function onBar(bar, state, history) {
  const s = { ...state };

  // ── IN POSITION: manage trade ──
  if (s.position !== 'FLAT') {
    s.bars_held++;

    if (s.position === 'LONG') {
      if (bar.close >= s.profit_target || bar.close <= s.stop_loss || s.bars_held >= s.max_hold_bars) {
        s.position = 'FLAT'; s.entry_price = 0; s.stop_loss = 0; s.profit_target = 0;
        s.confidence = 0; s.sub_strategy = null;
        return { signal: 'SELL', state: s };
      }
    }
    if (s.position === 'SHORT') {
      if (bar.close <= s.profit_target || bar.close >= s.stop_loss || s.bars_held >= s.max_hold_bars) {
        s.position = 'FLAT'; s.entry_price = 0; s.stop_loss = 0; s.profit_target = 0;
        s.confidence = 0; s.sub_strategy = null;
        return { signal: 'BUY', state: s };
      }
    }
    return { signal: 'HOLD', state: s };
  }

  // ── FLAT: detect regime + quality gate + dispatch ──

  // 1. Vol regime detection (G15)
  s.regime = detectVolRegime(history, s.vol_lookback, s.vol_trend_thresh, s.vol_crisis_thresh);
  if (s.regime === 'CRISIS') {
    s.confidence = 0; s.sub_strategy = null;
    return { signal: 'HOLD', state: s };
  }

  // 2. Quality gate
  const qualityScore = computeQualityScore(bar);
  if (qualityScore < s.quality_gate) {
    s.confidence = 0; s.sub_strategy = null;
    return { signal: 'HOLD', state: s };
  }

  // 3. Compute sub-strategy signals
  const momentum = s3Signal(bar, s);
  const meanrev = s4Signal(bar, s, history);

  // 4. G14 — Adaptive Signal Blending (CONFLUENCE)
  if (momentum !== 'HOLD' && meanrev !== 'HOLD' && momentum === meanrev) {
    s.confidence = 1.0;
    s.sub_strategy = 'CONFLUENCE';
    return enterPosition(bar, s, momentum, history);
  }

  // 5. Regime dispatch
  if (s.regime === 'TREND' && momentum !== 'HOLD') {
    s.confidence = 0.7;
    s.sub_strategy = 's3_momentum';
    return enterPosition(bar, s, momentum, history);
  }
  if (s.regime === 'RANGE' && meanrev !== 'HOLD') {
    s.confidence = 0.6;
    s.sub_strategy = 's4_meanrev';
    return enterPosition(bar, s, meanrev, history);
  }

  s.confidence = 0; s.sub_strategy = null;
  return { signal: 'HOLD', state: s };
}

function enterPosition(bar, s, signal, history) {
  const atr = calcATR(history, s.atr_period);
  const stopDist = atr > 0 ? atr * s.atr_stop_mult : bar.close * s.stop_loss_pct;

  if (signal === 'BUY') {
    s.position = 'LONG';
    s.entry_price = bar.close;
    s.stop_loss = bar.close - stopDist;
    s.profit_target = bar.close * (1 + s.profit_target_pct);
    s.bars_held = 0;
  } else if (signal === 'SELL') {
    s.position = 'SHORT';
    s.entry_price = bar.close;
    s.stop_loss = bar.close + stopDist;
    s.profit_target = bar.close * (1 - s.profit_target_pct);
    s.bars_held = 0;
  }
  return { signal, state: s };
}
