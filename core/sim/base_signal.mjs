// core/sim/base_signal.mjs
function ema(values, period) {
  const k = 2 / (period + 1);
  let emaVal = values[0];
  const result = [emaVal];
  for (let i = 1; i < values.length; i++) {
    emaVal = values[i] * k + emaVal * (1 - k);
    result.push(emaVal);
  }
  return result;
}

function zscore(value, mean, std) {
  return std > 0 ? (value - mean) / std : 0;
}

export function generateBaseSignals(bars) {
  const closes = bars.map(b => b.c);
  const regimes = bars.map(b => b.regime);
  
  const emaFast = ema(closes, 10);
  const emaSlow = ema(closes, 30);
  
  let slopeTrendThr = 50;
  let slopeDefaultThr = 20;
  let zThr = 1.5;
  
  function buildSignals() {
    const signals = [];
    for (let i = 50; i < bars.length; i++) {
      const slope = emaFast[i] - emaSlow[i];
      const regime = regimes[i];
      
      const window = closes.slice(Math.max(0, i - 20), i);
      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      const std = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length);
      const z = zscore(closes[i], mean, std);
      
      let signal = 'none';
      
      if (regime === 'trend' && Math.abs(slope) > slopeTrendThr) {
        signal = slope > 0 ? 'long' : 'short';
      } else if (regime === 'range' && Math.abs(z) > zThr) {
        signal = z < 0 ? 'long' : 'short';
      } else if (regime === 'turbulent') {
        signal = 'none';
      } else {
        if (Math.abs(slope) > slopeDefaultThr) {
          signal = slope > 0 ? 'long' : 'short';
        }
      }
      
      signals.push({ idx: i, signal, slope, z, regime });
    }
    return signals;
  }
  
  let signals = buildSignals();
  let tries = 0;
  while (signals.filter(s => s.signal !== 'none').length < 30 && tries < 8) {
    slopeTrendThr *= 0.8;
    slopeDefaultThr *= 0.8;
    zThr *= 0.9;
    signals = buildSignals();
    tries++;
  }
  
  return signals;
}
