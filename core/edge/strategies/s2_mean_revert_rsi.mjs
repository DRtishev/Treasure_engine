#!/usr/bin/env node
// E108 Strategy: Mean Reversion RSI
// Buys when RSI is oversold, sells when RSI is overbought.
// Simple but effective in ranging markets.

export function meta() {
  return {
    name: 'mean_revert_rsi',
    version: '1.0.0',
    description: 'RSI mean reversion: buy on oversold (<30), sell on overbought (>70)',
    params_schema: {
      rsi_period: { type: 'integer', min: 5, max: 30, description: 'RSI calculation period' },
      oversold: { type: 'number', min: 10, max: 40, description: 'Oversold threshold (buy)' },
      overbought: { type: 'number', min: 60, max: 90, description: 'Overbought threshold (sell)' }
    },
    default_params: { rsi_period: 14, oversold: 30, overbought: 70 },
    assumptions: 'Works in mean-reverting / ranging markets; price oscillates around fair value',
    failure_modes: 'Strong trends cause continuous losses; buying dips in downtrend = catching knives'
  };
}

export function init(config) {
  return {
    rsi_period: config.rsi_period || 14,
    oversold: config.oversold || 30,
    overbought: config.overbought || 70,
    position: 'FLAT'
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

export function onBar(bar, state, history) {
  const s = { ...state };

  if (history.length < s.rsi_period + 2) {
    return { signal: 'HOLD', state: s };
  }

  const rsi = calcRSI(history, s.rsi_period);

  if (s.position === 'FLAT') {
    if (rsi < s.oversold) {
      s.position = 'LONG';
      return { signal: 'BUY', state: s };
    }
    return { signal: 'HOLD', state: s };
  }

  // LONG: sell on overbought
  if (rsi > s.overbought) {
    s.position = 'FLAT';
    return { signal: 'SELL', state: s };
  }

  return { signal: 'HOLD', state: s };
}
