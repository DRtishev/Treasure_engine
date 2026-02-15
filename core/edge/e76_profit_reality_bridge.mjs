#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseEdgeFixtureCsv } from './e75_profit_harness.mjs';

const DEC = 8;
function round(v, d = DEC) { const f = 10 ** d; return Math.round(v * f) / f; }

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}

function lcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (1664525 * s + 1013904223) >>> 0) / 0x100000000);
}

export function parseObservedReconFixture(csvPath) {
  const [header, ...rows] = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
  if (header !== 'ts,symbol,notional,spread_bps,slippage_bps,decision_submit_ms,submit_ack_ms,ack_fill_ms,maker_fee_bps,taker_fee_bps,tick_size,lot_size,min_qty,min_notional') {
    throw new Error('E76_OBSERVED_BAD_HEADER');
  }
  return rows.map((line) => {
    const [ts, symbol, notional, spread, slip, ds, sa, af, maker, taker, tick, lot, minQty, minNotional] = line.split(',');
    return {
      ts,
      symbol,
      notional: Number(notional),
      spread_bps: Number(spread),
      slippage_bps: Number(slip),
      decision_submit_ms: Number(ds),
      submit_ack_ms: Number(sa),
      ack_fill_ms: Number(af),
      maker_fee_bps: Number(maker),
      taker_fee_bps: Number(taker),
      tick_size: Number(tick),
      lot_size: Number(lot),
      min_qty: Number(minQty),
      min_notional: Number(minNotional)
    };
  }).sort((a, b) => a.ts.localeCompare(b.ts));
}

export function deriveExecutionEnvelope(observedRows, opts = {}) {
  const seed = Number(opts.seed ?? 12345);
  const byNotional = [...observedRows].sort((a, b) => a.notional - b.notional);
  const b1 = byNotional.filter((r) => r.notional < 250);
  const b2 = byNotional.filter((r) => r.notional >= 250 && r.notional < 1000);
  const b3 = byNotional.filter((r) => r.notional >= 1000);
  const allSpread = observedRows.map((r) => r.spread_bps).sort((a, b) => a - b);
  const allLat1 = observedRows.map((r) => r.decision_submit_ms).sort((a, b) => a - b);
  const allLat2 = observedRows.map((r) => r.submit_ack_ms).sort((a, b) => a - b);
  const allLat3 = observedRows.map((r) => r.ack_fill_ms).sort((a, b) => a - b);

  function bucketStats(rows) {
    const sl = rows.map((r) => r.slippage_bps).sort((a, b) => a - b);
    return { median: round(percentile(sl, 0.5), 4), p95: round(percentile(sl, 0.95), 4) };
  }

  const base = {
    seed,
    fees: {
      maker_bps: round(percentile(observedRows.map((r) => r.maker_fee_bps).sort((a, b) => a - b), 0.5), 4),
      taker_bps: round(percentile(observedRows.map((r) => r.taker_fee_bps).sort((a, b) => a - b), 0.5), 4),
      rebate_bps: 0
    },
    spread_bps: {
      median: round(percentile(allSpread, 0.5), 4),
      p95: round(percentile(allSpread, 0.95), 4)
    },
    slippage_bps_buckets: {
      small: bucketStats(b1),
      medium: bucketStats(b2),
      large: bucketStats(b3)
    },
    latency_ms: {
      decision_submit: { median: round(percentile(allLat1, 0.5)), p95: round(percentile(allLat1, 0.95)) },
      submit_ack: { median: round(percentile(allLat2, 0.5)), p95: round(percentile(allLat2, 0.95)) },
      ack_fill: { median: round(percentile(allLat3, 0.5)), p95: round(percentile(allLat3, 0.95)) }
    },
    constraints: {
      tick_size: observedRows[0]?.tick_size ?? 0.1,
      lot_size: observedRows[0]?.lot_size ?? 0.001,
      min_qty: observedRows[0]?.min_qty ?? 0.001,
      min_notional: observedRows[0]?.min_notional ?? 5
    },
    rounding_policy: 'HALF_UP'
  };

  const jitter = lcg(seed);
  function mkEnv(id, spreadMult, slipMult, latMult, feeOffset) {
    return {
      id,
      fees: { maker_bps: round(base.fees.maker_bps + feeOffset, 4), taker_bps: round(base.fees.taker_bps + feeOffset, 4), rebate_bps: base.fees.rebate_bps },
      spread_bps: { median: round(base.spread_bps.median * spreadMult, 4), p95: round(base.spread_bps.p95 * spreadMult, 4) },
      slippage_bps_buckets: {
        small: { median: round(base.slippage_bps_buckets.small.median * slipMult, 4), p95: round(base.slippage_bps_buckets.small.p95 * slipMult, 4) },
        medium: { median: round(base.slippage_bps_buckets.medium.median * slipMult, 4), p95: round(base.slippage_bps_buckets.medium.p95 * slipMult, 4) },
        large: { median: round(base.slippage_bps_buckets.large.median * slipMult, 4), p95: round(base.slippage_bps_buckets.large.p95 * slipMult, 4) }
      },
      latency_ms: {
        decision_submit: { median: round(base.latency_ms.decision_submit.median * latMult), p95: round(base.latency_ms.decision_submit.p95 * latMult) },
        submit_ack: { median: round(base.latency_ms.submit_ack.median * latMult), p95: round(base.latency_ms.submit_ack.p95 * latMult) },
        ack_fill: { median: round(base.latency_ms.ack_fill.median * latMult), p95: round(base.latency_ms.ack_fill.p95 * latMult) }
      },
      constraints: base.constraints,
      rounding_policy: base.rounding_policy,
      jitter_tag: round(jitter(), 8)
    };
  }

  const envelopes = [
    mkEnv('BEST', 0.8, 0.8, 0.8, -0.3),
    mkEnv('MEDIAN', 1, 1, 1, 0),
    mkEnv('WORST', 1.3, 1.35, 1.4, 0.5)
  ];

  const envelopeFingerprint = crypto.createHash('sha256').update(JSON.stringify({ base, envelopes })).digest('hex');
  return { base, envelopes, envelope_fingerprint: envelopeFingerprint };
}

function applyConstraints(size, price, c) {
  const qtyRounded = round(Math.round(size / c.lot_size) * c.lot_size, 6);
  const pxRounded = round(Math.round(price / c.tick_size) * c.tick_size, 6);
  if (qtyRounded < c.min_qty) return { ok: false, reason: 'LOT_CONSTRAINT_FAIL', qty: qtyRounded, px: pxRounded };
  if (round(qtyRounded * pxRounded, 8) < c.min_notional) return { ok: false, reason: 'MIN_NOTIONAL_FAIL', qty: qtyRounded, px: pxRounded };
  return { ok: true, qty: qtyRounded, px: pxRounded };
}

function metrics(trades) {
  const trade_count = trades.length;
  const net_pnl = round(trades.reduce((a, t) => a + t, 0));
  const wins = trades.filter((x) => x > 0).length;
  const winrate = round(trade_count ? wins / trade_count : 0, 8);
  const pos = trades.filter((x) => x > 0).reduce((a, b) => a + b, 0);
  const neg = Math.abs(trades.filter((x) => x < 0).reduce((a, b) => a + b, 0));
  const profit_factor = round(neg ? pos / neg : 0, 8);
  const expectancy = round(trade_count ? net_pnl / trade_count : 0, 8);
  let equity = 0; let peak = 0; let max_drawdown = 0;
  for (const t of trades) { equity = round(equity + t); peak = Math.max(peak, equity); max_drawdown = Math.max(max_drawdown, round(peak - equity)); }
  const mean = trade_count ? net_pnl / trade_count : 0;
  const variance = trade_count ? trades.reduce((a, b) => a + ((b - mean) ** 2), 0) / trade_count : 0;
  const sharpe_simple = round(variance ? mean / Math.sqrt(variance) : 0, 8);
  return { trade_count, net_pnl, winrate, profit_factor, expectancy, max_drawdown, sharpe_simple };
}

function leakageSentinel(rows, params) {
  const normal = rows.slice(1).map((r, i) => (r.mid - rows[i].mid) / rows[i].mid);
  const shifted = rows.slice(2).map((r, i) => (r.mid - rows[i + 1].mid) / rows[i + 1].mid);
  const a = normal.filter((x) => Math.abs(x) > params.threshold).length;
  const b = shifted.filter((x) => Math.abs(x) > params.threshold).length;
  return Math.abs(a - b) <= Math.max(2, Math.floor(rows.length * 0.02));
}

function strategies() {
  return [
    { id: 'trend_follow', speculative: false, params: [{ id: 'tf_a', threshold: 0.0011, size: 0.08 }, { id: 'tf_b', threshold: 0.0016, size: 0.12 }] },
    { id: 'mean_revert', speculative: false, params: [{ id: 'mr_a', threshold: 0.0013, size: 0.07 }, { id: 'mr_b', threshold: 0.0018, size: 0.1 }] }
  ];
}

export function runE76ProfitEnvelope(opts = {}) {
  const seed = Number(opts.seed ?? 12345);
  const observedPath = path.resolve(opts.observedFixture || 'core/edge/fixtures/e76_recon_observed_fixture.csv');
  const observed = parseObservedReconFixture(observedPath);
  const envelope = deriveExecutionEnvelope(observed, { seed });
  const envMap = Object.fromEntries(envelope.envelopes.map((e) => [e.id, e]));
  const datasets = [
    ['v1', 'core/edge/fixtures/edge_magic_v1.csv'],
    ['v2', 'core/edge/fixtures/edge_magic_v2.csv'],
    ['stress_chop', 'core/edge/fixtures/edge_magic_stress_chop.csv'],
    ['stress_flashcrash', 'core/edge/fixtures/edge_magic_stress_flashcrash.csv'],
    ['stress_spread', 'core/edge/fixtures/edge_magic_stress_spread.csv']
  ].map(([id, rel]) => ({ id, rows: parseEdgeFixtureCsv(path.resolve(rel)) }));

  const out = [];
  for (const s of strategies()) {
    for (const p of s.params) {
      const id = `${s.id}:${p.id}`;
      let reason = 'OK';
      const leakageBad = datasets.some((d) => !leakageSentinel(d.rows, p));
      if (leakageBad) reason = 'LOOKAHEAD_SUSPECT';
      const metricsByEnv = {};
      for (const envId of ['BEST', 'MEDIAN', 'WORST']) {
        const env = envMap[envId];
        const trades = [];
        if (reason === 'LOOKAHEAD_SUSPECT') { metricsByEnv[envId] = metrics([]); continue; }
        for (const ds of datasets) {
          for (let i = 1; i < ds.rows.length; i += 1) {
            const prev = ds.rows[i - 1];
            const cur = ds.rows[i];
            const ret = (cur.mid - prev.mid) / prev.mid;
            if (Math.abs(ret) < p.threshold) continue;
            const side = ret > 0 ? 1 : -1;
            const c = applyConstraints(p.size, cur.mid, env.constraints);
            if (!c.ok) { reason = c.reason; break; }
            const nextMid = i + 1 < ds.rows.length ? ds.rows[i + 1].mid : cur.mid;
            const spreadFee = (env.spread_bps.p95 + env.fees.taker_bps + env.slippage_bps_buckets.medium.p95) / 10000;
            const gross = (nextMid - c.px) * side * c.qty;
            const cost = c.px * c.qty * spreadFee;
            trades.push(round(gross - cost));
          }
        }
        metricsByEnv[envId] = metrics(trades);
      }
      const best = metricsByEnv.BEST;
      const worst = metricsByEnv.WORST;
      if (reason === 'OK' && best.net_pnl > 0 && worst.net_pnl < 0 && !s.speculative) reason = 'NOT_ROBUST';
      if (reason === 'OK' && worst.trade_count < 8) reason = 'INVALID_SAMPLE';
      const pfClamped = Math.max(0, Math.min(3, worst.profit_factor));
      const tradeFactor = Math.min(1, worst.trade_count / 80);
      const robust_score = round(Math.min(worst.sharpe_simple, pfClamped) * tradeFactor, 8);
      out.push({ candidate_id: id, speculative: s.speculative, reason_code: reason, metrics: metricsByEnv, robust_score });
    }
  }

  out.sort((a, b) => {
    if (b.robust_score !== a.robust_score) return b.robust_score - a.robust_score;
    if (b.metrics.WORST.net_pnl !== a.metrics.WORST.net_pnl) return b.metrics.WORST.net_pnl - a.metrics.WORST.net_pnl;
    return a.candidate_id.localeCompare(b.candidate_id);
  });
  const payload = { seed, envelope_fingerprint: envelope.envelope_fingerprint, top: out.map((x) => ({ c: x.candidate_id, r: x.reason_code, rs: x.robust_score, w: x.metrics.WORST.net_pnl })) };
  const run_fingerprint = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return { seed, observed_fixture: observedPath, envelope, candidates: out, run_fingerprint };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(runE76ProfitEnvelope(), null, 2));
}
