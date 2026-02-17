#!/usr/bin/env node
// E108 Strategy: Breakout ATR
// Enters long when price breaks above N-bar high + ATR filter.
// Exits when price drops below trailing stop (ATR-based).

export function meta() {
  return {
    name: 'breakout_atr',
    version: '1.0.0',
    description: 'ATR-filtered breakout: buy on N-bar high break, sell on trailing ATR stop',
    params_schema: {
      lookback: { type: 'integer', min: 5, max: 50, description: 'Lookback period for high/low' },
      atr_period: { type: 'integer', min: 5, max: 30, description: 'ATR calculation period' },
      atr_mult: { type: 'number', min: 0.5, max: 4.0, description: 'ATR multiplier for entry/exit' }
    },
    default_params: { lookback: 10, atr_period: 14, atr_mult: 1.5 },
    assumptions: 'Works in trending markets with clear breakouts and sufficient volatility',
    failure_modes: 'Choppy/ranging markets cause whipsaws; large gaps can bypass stops'
  };
}

export function init(config) {
  return {
    lookback: config.lookback || 10,
    atr_period: config.atr_period || 14,
    atr_mult: config.atr_mult || 1.5,
    position: 'FLAT', // FLAT or LONG
    entry_price: 0,
    trailing_stop: 0
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

  if (history.length < s.lookback + 1) {
    return { signal: 'HOLD', state: s };
  }

  const atr = calcATR(history, s.atr_period);
  const recentHighs = history.slice(-s.lookback - 1, -1).map(b => b.high);
  const channelHigh = Math.max(...recentHighs);

  if (s.position === 'FLAT') {
    // Entry: breakout above channel high + ATR filter
    if (bar.close > channelHigh && atr > 0) {
      s.position = 'LONG';
      s.entry_price = bar.close;
      s.trailing_stop = bar.close - atr * s.atr_mult;
      return { signal: 'BUY', state: s };
    }
    return { signal: 'HOLD', state: s };
  }

  // LONG position: update trailing stop, check exit
  const newStop = bar.close - atr * s.atr_mult;
  if (newStop > s.trailing_stop) {
    s.trailing_stop = newStop;
  }

  if (bar.close < s.trailing_stop) {
    s.position = 'FLAT';
    s.entry_price = 0;
    s.trailing_stop = 0;
    return { signal: 'SELL', state: s };
  }

  return { signal: 'HOLD', state: s };
}
