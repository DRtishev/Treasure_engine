import crypto from 'node:crypto';

function fp(v) { return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex'); }

export function dedupPublicTrades(rows = [], options = {}) {
  const strict = options.strict === true;
  const seen = new Set();
  const out = [];
  let dedup_count = 0;
  let heuristic_dedup_used = false;

  for (const r of rows) {
    const hasId = r.trade_id !== null && r.trade_id !== undefined && r.trade_id !== '';
    if (!hasId) heuristic_dedup_used = true;
    const key = hasId ? `id:${r.trade_id}` : `heur:${r.ts_ms}|${r.price}|${r.qty}|${r.symbol}`;
    if (seen.has(key)) {
      dedup_count += 1;
      continue;
    }
    seen.add(key);
    out.push(r);
  }

  if (strict && heuristic_dedup_used) throw new Error('STRICT_DEDUP_REQUIRES_TRADE_ID');
  return {
    rows: out,
    report: {
      dedup_count,
      heuristic_dedup_used,
      fingerprint: fp(out.map((x) => x.output_fingerprint || keyOf(x)))
    }
  };
}

function keyOf(r) {
  return `${r.ts_ms}|${r.price}|${r.qty}|${r.symbol}|${r.side}`;
}
