import crypto from 'node:crypto';

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function round(v, s = 6) { const p = 10 ** s; return Math.round(v * p) / p; }

const VOL_MULT = { LOW: 1.0, MID: 0.8, HIGH: 0.55, CRISIS: 0.25 };

export function sizingPolicy({ dd = 0, dd_speed = 0, vol_regime = 'MID', pbo_flag = false, dsr_flag = false } = {}) {
  const ddPenalty = clamp(dd / 0.35, 0, 1); // full penalty by 35% drawdown
  const speedPenalty = clamp(dd_speed / 0.1, 0, 1); // full penalty by 10%/day drawdown speed
  let size = 1 - (0.65 * ddPenalty) - (0.2 * speedPenalty);
  size *= VOL_MULT[vol_regime] ?? VOL_MULT.MID;
  if (pbo_flag) size *= 0.65;
  if (dsr_flag) size *= 0.75;
  return round(clamp(size, 0, 1), 6);
}

export function hardStopPolicy({ tradeLossPct = 0, dayLossPct = 0, weekLossPct = 0 } = {}) {
  const limits = { trade: 0.025, day: 0.06, week: 0.12 };
  const triggered = {
    trade: tradeLossPct >= limits.trade,
    day: dayLossPct >= limits.day,
    week: weekLossPct >= limits.week
  };
  const halt = triggered.trade || triggered.day || triggered.week;
  const reason = triggered.week ? 'WEEK_STOP' : triggered.day ? 'DAY_STOP' : triggered.trade ? 'TRADE_STOP' : 'NONE';
  return { limits, triggered, halt, reason };
}

export function applyRiskFortress(riskInput) {
  const stop = hardStopPolicy(riskInput);
  const sizeFactor = stop.halt ? 0 : sizingPolicy(riskInput);
  return {
    state: stop.halt ? 'HALTED' : (sizeFactor < 0.35 ? 'DEGRADED' : 'ACTIVE'),
    hard_stop: stop,
    size_factor: sizeFactor,
    invariant_non_bypassable: stop.halt ? sizeFactor === 0 : true
  };
}

function xorshift32(seed = 123456789) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

export function generateDeterministicCrisisSuite(seed = 4401) {
  const rng = xorshift32(seed);
  const scenarios = ['gap_down', 'whipsaw', 'vol_expansion', 'liquidity_vacuum'].map((name, idx) => {
    const points = Array.from({ length: 10 }, (_, i) => {
      const base = 100 - idx * 3 - i * (name === 'gap_down' ? 1.9 : 0.25);
      const shock = name === 'whipsaw' ? ((i % 2 === 0 ? 1 : -1) * (2 + rng() * 3))
        : name === 'vol_expansion' ? ((rng() - 0.5) * (6 + i * 0.4))
          : name === 'liquidity_vacuum' ? (i > 5 ? -4 - rng() * 3 : -0.4)
            : (i === 1 ? -9 : -0.5 - rng());
      return round(base + shock, 6);
    });
    return { id: name, seed: seed + idx, points };
  });
  const manifest = { seed, scenarios };
  manifest.fingerprint = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  return manifest;
}

export function runRiskFortressSimulation(inputs = []) {
  return inputs.map((row) => ({ input: row, output: applyRiskFortress(row) }));
}
