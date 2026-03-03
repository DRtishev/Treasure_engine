#!/usr/bin/env node
// EPOCH-73 Strategy S3: Liq+Vol Fusion
//
// Edge Hypothesis: Liquidation cascades during volatility bursts create
// predictable momentum. Enter in cascade direction with ATR-filtered confirmation.
//
// NOTE: _liq_pressure is a PROXY synthesized from OHLCV fixtures
// (see strategy_bar_enricher.mjs). Not real exchange liquidation data.

export function meta() {
  return {
    name: 'liq_vol_fusion',
    version: '1.0.0',
    description: 'Liquidation cascade momentum with volatility-filtered ATR confirmation',
    params_schema: {
      liq_threshold:   { type: 'number',  min: 0.55, max: 0.80, description: 'Liq pressure threshold' },
      burst_threshold: { type: 'number',  min: 1.5,  max: 3.0,  description: 'Volume burst multiplier' },
      atr_period:      { type: 'integer', min: 5,    max: 30,   description: 'ATR period' },
      atr_stop_mult:   { type: 'number',  min: 1.0,  max: 3.0,  description: 'ATR multiplier for stop' },
      profit_target_r: { type: 'number',  min: 1.0,  max: 3.0,  description: 'R-multiple profit target' },
      max_hold_bars:   { type: 'integer', min: 5,    max: 50,   description: 'Max bars to hold' },
    },
    default_params: {
      liq_threshold: 0.55,
      burst_threshold: 1.4,
      atr_period: 10,
      atr_stop_mult: 1.5,
      profit_target_r: 2.5,
      max_hold_bars: 20,
    },
    assumptions: 'Works during liquidation cascades with high volume. Bear cascade → SHORT momentum, Bull cascade → LONG momentum. _liq_pressure is synthesized proxy from OHLCV fixtures.',
    failure_modes: 'Choppy markets with frequent false cascades. Low volume environments where burst_score is unreliable.',
    signal_inputs: ['liq_pressure', 'burst_score', 'regime_flag'],
    regime_preference: 'TREND',
  };
}

export function init(config) {
  const d = meta().default_params;
  return {
    liq_threshold:   config.liq_threshold   ?? d.liq_threshold,
    burst_threshold: config.burst_threshold ?? d.burst_threshold,
    atr_period:      config.atr_period      ?? d.atr_period,
    atr_stop_mult:   config.atr_stop_mult   ?? d.atr_stop_mult,
    profit_target_r: config.profit_target_r ?? d.profit_target_r,
    max_hold_bars:   config.max_hold_bars   ?? d.max_hold_bars,
    position: 'FLAT',
    entry_price: 0,
    stop_loss: 0,
    profit_target: 0,
    bars_held: 0,
    entry_regime: null,
  };
}

function calcATR(history, period) {
  if (history.length < 2) return 0;
  const trs = [];
  for (let i = 1; i < history.length; i++) {
    const h = history[i].high;
    const l = history[i].low;
    const pc = history[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const slice = trs.slice(-period);
  if (slice.length === 0) return 0;
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

export function onBar(bar, state, history) {
  const s = { ...state };

  // Graceful degradation: no liq data → HOLD
  const liqPressure = bar._liq_pressure;
  const burstScore = bar._burst_score;
  const regimeFlag = bar._regime_flag;
  if (liqPressure == null || burstScore == null) {
    return { signal: 'HOLD', state: s };
  }

  // Need enough history for ATR
  if (history.length < s.atr_period + 1) {
    return { signal: 'HOLD', state: s };
  }

  const atr = calcATR(history, s.atr_period);
  if (atr <= 0) return { signal: 'HOLD', state: s };

  // ── FLAT: look for entry ──
  if (s.position === 'FLAT') {
    if (liqPressure >= s.liq_threshold && burstScore >= s.burst_threshold) {
      const isBear = regimeFlag && regimeFlag.startsWith('BEAR');
      const isBull = regimeFlag && regimeFlag.startsWith('BULL');

      if (isBear) {
        s.position = 'SHORT';
        s.entry_price = bar.close;
        s.stop_loss = bar.close + atr * s.atr_stop_mult;
        s.profit_target = bar.close - atr * s.atr_stop_mult * s.profit_target_r;
        s.bars_held = 0;
        s.entry_regime = regimeFlag;
        return { signal: 'SELL', state: s };
      }
      if (isBull) {
        s.position = 'LONG';
        s.entry_price = bar.close;
        s.stop_loss = bar.close - atr * s.atr_stop_mult;
        s.profit_target = bar.close + atr * s.atr_stop_mult * s.profit_target_r;
        s.bars_held = 0;
        s.entry_regime = regimeFlag;
        return { signal: 'BUY', state: s };
      }
    }
    return { signal: 'HOLD', state: s };
  }

  // ── IN POSITION: check exits ──
  s.bars_held++;

  if (s.position === 'LONG') {
    // Stop loss
    if (bar.close <= s.stop_loss) {
      s.position = 'FLAT'; s.entry_price = 0; s.stop_loss = 0; s.profit_target = 0;
      return { signal: 'SELL', state: s };
    }
    // Profit target
    if (bar.close >= s.profit_target) {
      s.position = 'FLAT'; s.entry_price = 0; s.stop_loss = 0; s.profit_target = 0;
      return { signal: 'SELL', state: s };
    }
    // Time stop
    if (s.bars_held >= s.max_hold_bars) {
      s.position = 'FLAT'; s.entry_price = 0; s.stop_loss = 0; s.profit_target = 0;
      return { signal: 'SELL', state: s };
    }
    // Regime flip: entered BULL, now BEAR
    if (s.entry_regime && s.entry_regime.startsWith('BULL') && regimeFlag && regimeFlag.startsWith('BEAR')) {
      s.position = 'FLAT'; s.entry_price = 0; s.stop_loss = 0; s.profit_target = 0;
      return { signal: 'SELL', state: s };
    }
    return { signal: 'HOLD', state: s };
  }

  if (s.position === 'SHORT') {
    // Stop loss
    if (bar.close >= s.stop_loss) {
      s.position = 'FLAT'; s.entry_price = 0; s.stop_loss = 0; s.profit_target = 0;
      return { signal: 'BUY', state: s };
    }
    // Profit target
    if (bar.close <= s.profit_target) {
      s.position = 'FLAT'; s.entry_price = 0; s.stop_loss = 0; s.profit_target = 0;
      return { signal: 'BUY', state: s };
    }
    // Time stop
    if (s.bars_held >= s.max_hold_bars) {
      s.position = 'FLAT'; s.entry_price = 0; s.stop_loss = 0; s.profit_target = 0;
      return { signal: 'BUY', state: s };
    }
    // Regime flip: entered BEAR, now BULL
    if (s.entry_regime && s.entry_regime.startsWith('BEAR') && regimeFlag && regimeFlag.startsWith('BULL')) {
      s.position = 'FLAT'; s.entry_price = 0; s.stop_loss = 0; s.profit_target = 0;
      return { signal: 'BUY', state: s };
    }
    return { signal: 'HOLD', state: s };
  }

  return { signal: 'HOLD', state: s };
}
