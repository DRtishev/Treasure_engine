#!/usr/bin/env node
// EPOCH-73 Strategy S4: Post-Cascade Mean Reversion
//
// Edge Hypothesis: After a liquidation cascade the market overshoots.
// Enter on pullback when pressure decays, RSI is extreme, and price
// deviates from SMA. Trade OPPOSITE to cascade direction.
//
// NOTE: _liq_pressure is a PROXY synthesized from OHLCV fixtures
// (see strategy_bar_enricher.mjs). Not real exchange liquidation data.

export function meta() {
  return {
    name: 'post_cascade_mr',
    version: '1.0.0',
    description: 'Mean reversion after liquidation cascade exhaustion',
    params_schema: {
      liq_peak_threshold:  { type: 'number',  min: 0.60, max: 0.85, description: 'Liq pressure peak to trigger watch' },
      liq_decay_threshold: { type: 'number',  min: 0.35, max: 0.55, description: 'Liq pressure decay = cascade over' },
      rsi_period:          { type: 'integer', min: 7,    max: 21,   description: 'RSI period' },
      rsi_oversold:        { type: 'number',  min: 15,   max: 35,   description: 'RSI oversold level' },
      rsi_overbought:      { type: 'number',  min: 65,   max: 85,   description: 'RSI overbought level' },
      sma_period:          { type: 'integer', min: 10,   max: 30,   description: 'SMA period' },
      sma_deviation_pct:   { type: 'number',  min: 0.01, max: 0.05, description: 'Min price deviation from SMA' },
      profit_target_pct:   { type: 'number',  min: 0.005, max: 0.02, description: 'Profit target %' },
      stop_loss_pct:       { type: 'number',  min: 0.01, max: 0.03, description: 'Stop loss %' },
      max_hold_bars:       { type: 'integer', min: 10,   max: 50,   description: 'Max hold period' },
      cooldown_bars:       { type: 'integer', min: 3,    max: 10,   description: 'Min bars after cascade peak' },
    },
    default_params: {
      liq_peak_threshold: 0.60,
      liq_decay_threshold: 0.45,
      rsi_period: 10,
      rsi_oversold: 30,
      rsi_overbought: 70,
      sma_period: 15,
      sma_deviation_pct: 0.003,
      profit_target_pct: 0.005,
      stop_loss_pct: 0.015,
      max_hold_bars: 30,
      cooldown_bars: 2,
    },
    assumptions: 'Works after liquidation cascades in mean-reverting conditions. Price snaps back to SMA. _liq_pressure is synthesized proxy from OHLCV fixtures.',
    failure_modes: 'Trending markets where cascade is start of sustained move. Multiple cascades in succession.',
    signal_inputs: ['liq_pressure', 'burst_score'],
    regime_preference: 'RANGE',
  };
}

export function init(config) {
  const d = meta().default_params;
  return {
    liq_peak_threshold:  config.liq_peak_threshold  ?? d.liq_peak_threshold,
    liq_decay_threshold: config.liq_decay_threshold ?? d.liq_decay_threshold,
    rsi_period:          config.rsi_period          ?? d.rsi_period,
    rsi_oversold:        config.rsi_oversold        ?? d.rsi_oversold,
    rsi_overbought:      config.rsi_overbought      ?? d.rsi_overbought,
    sma_period:          config.sma_period          ?? d.sma_period,
    sma_deviation_pct:   config.sma_deviation_pct   ?? d.sma_deviation_pct,
    profit_target_pct:   config.profit_target_pct   ?? d.profit_target_pct,
    stop_loss_pct:       config.stop_loss_pct       ?? d.stop_loss_pct,
    max_hold_bars:       config.max_hold_bars       ?? d.max_hold_bars,
    cooldown_bars:       config.cooldown_bars       ?? d.cooldown_bars,
    position: 'FLAT',
    phase: 'WATCHING',    // WATCHING | READY_TO_ENTER | IN_POSITION
    entry_price: 0,
    stop_loss: 0,
    profit_target: 0,
    bars_held: 0,
    peak_pressure: 0,
    peak_bar_index: -1,
    cascade_direction: null, // 'BEAR' | 'BULL'
    ready_countdown: 0,      // bars remaining in READY_TO_ENTER before timeout
    bar_index: 0,
  };
}

function calcRSI(history, period) {
  if (history.length < period + 1) return 50; // neutral
  const changes = [];
  for (let i = history.length - period; i < history.length; i++) {
    changes.push(history[i].close - history[i - 1].close);
  }
  let gains = 0, losses = 0;
  for (const c of changes) {
    if (c > 0) gains += c;
    else losses += Math.abs(c);
  }
  if (losses === 0) return 100;
  if (gains === 0) return 0;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

function calcSMA(history, period) {
  if (history.length < period) return null;
  const slice = history.slice(-period);
  return slice.reduce((s, b) => s + b.close, 0) / period;
}

export function onBar(bar, state, history) {
  const s = { ...state };
  s.bar_index++;

  const liqPressure = bar._liq_pressure;

  // Graceful degradation: no liq data → stay in WATCHING, never trade
  if (liqPressure == null) {
    return { signal: 'HOLD', state: s };
  }

  // ── WATCHING: detect cascade peak ──
  if (s.phase === 'WATCHING') {
    // Track peak pressure
    if (liqPressure >= s.liq_peak_threshold && liqPressure > s.peak_pressure) {
      s.peak_pressure = liqPressure;
      s.peak_bar_index = s.bar_index;
      // Determine cascade direction from regime flag
      const rf = bar._regime_flag || '';
      s.cascade_direction = rf.startsWith('BEAR') ? 'BEAR' : rf.startsWith('BULL') ? 'BULL' : null;
    }

    // Check for decay after peak
    if (s.peak_pressure >= s.liq_peak_threshold &&
        liqPressure < s.liq_decay_threshold &&
        (s.bar_index - s.peak_bar_index) >= s.cooldown_bars &&
        s.cascade_direction) {
      s.phase = 'READY_TO_ENTER';
      s.ready_countdown = 10; // 10-bar timeout window
    }
    return { signal: 'HOLD', state: s };
  }

  // ── READY_TO_ENTER: look for mean-reversion entry ──
  if (s.phase === 'READY_TO_ENTER') {
    s.ready_countdown--;
    if (s.ready_countdown <= 0) {
      // Timeout — go back to watching
      s.phase = 'WATCHING';
      s.peak_pressure = 0;
      s.peak_bar_index = -1;
      s.cascade_direction = null;
      return { signal: 'HOLD', state: s };
    }

    // Need enough history for RSI + SMA
    if (history.length < Math.max(s.rsi_period + 2, s.sma_period + 1)) {
      return { signal: 'HOLD', state: s };
    }

    const rsi = calcRSI(history, s.rsi_period);
    const sma = calcSMA(history, s.sma_period);
    if (sma === null) return { signal: 'HOLD', state: s };

    const deviation = (bar.close - sma) / sma;

    if (s.cascade_direction === 'BEAR') {
      // After BEAR cascade → price oversold → BUY (mean reversion long)
      if (rsi < s.rsi_oversold && deviation < -s.sma_deviation_pct) {
        s.phase = 'IN_POSITION';
        s.position = 'LONG';
        s.entry_price = bar.close;
        s.profit_target = bar.close * (1 + s.profit_target_pct);
        s.stop_loss = bar.close * (1 - s.stop_loss_pct);
        s.bars_held = 0;
        return { signal: 'BUY', state: s };
      }
    } else if (s.cascade_direction === 'BULL') {
      // After BULL cascade → price overbought → SELL (mean reversion short)
      if (rsi > s.rsi_overbought && deviation > s.sma_deviation_pct) {
        s.phase = 'IN_POSITION';
        s.position = 'SHORT';
        s.entry_price = bar.close;
        s.profit_target = bar.close * (1 - s.profit_target_pct);
        s.stop_loss = bar.close * (1 + s.stop_loss_pct);
        s.bars_held = 0;
        return { signal: 'SELL', state: s };
      }
    }

    return { signal: 'HOLD', state: s };
  }

  // ── IN_POSITION: manage trade ──
  if (s.phase === 'IN_POSITION') {
    s.bars_held++;

    if (s.position === 'LONG') {
      if (bar.close >= s.profit_target || bar.close <= s.stop_loss || s.bars_held >= s.max_hold_bars) {
        s.phase = 'WATCHING'; s.position = 'FLAT'; s.entry_price = 0;
        s.stop_loss = 0; s.profit_target = 0;
        s.peak_pressure = 0; s.peak_bar_index = -1; s.cascade_direction = null;
        return { signal: 'SELL', state: s };
      }
    }

    if (s.position === 'SHORT') {
      if (bar.close <= s.profit_target || bar.close >= s.stop_loss || s.bars_held >= s.max_hold_bars) {
        s.phase = 'WATCHING'; s.position = 'FLAT'; s.entry_price = 0;
        s.stop_loss = 0; s.profit_target = 0;
        s.peak_pressure = 0; s.peak_bar_index = -1; s.cascade_direction = null;
        return { signal: 'BUY', state: s };
      }
    }

    return { signal: 'HOLD', state: s };
  }

  return { signal: 'HOLD', state: s };
}
