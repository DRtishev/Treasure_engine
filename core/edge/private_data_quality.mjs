import crypto from 'node:crypto';

function fp(obj) { return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex'); }

export function evaluatePrivateFillQuality(rows, {
  strict = false,
  dedupWindowMs = 1000,
  gapThresholdMs = 24 * 60 * 60 * 1000,
  maxQty = 1000,
  maxPrice = 2_000_000
} = {}) {
  const warnings = [];
  let dedup_count = 0;
  let gap_count = 0;
  let outlier_count = 0;
  let heuristic_used = false;

  const seen = new Map();
  const out = [];

  for (const r of rows) {
    let key;
    if (r.fill_id) {
      key = `id:${r.fill_id}`;
    } else {
      if (strict) throw new Error('strict mode requires fill_id for dedup');
      heuristic_used = true;
      key = `h:${r.ts_ms}|${r.symbol}|${r.side}|${r.qty}|${r.price}`;
    }

    if (seen.has(key)) {
      dedup_count += 1;
      continue;
    }
    seen.set(key, r.ts_ms);

    if (r.qty > maxQty || r.price > maxPrice || r.qty <= 0 || r.price <= 0) {
      outlier_count += 1;
      warnings.push(`outlier:${key}`);
    }

    out.push(r);
  }

  const sorted = [...out].sort((a, b) => a.ts_ms - b.ts_ms || String(a.fill_id).localeCompare(String(b.fill_id)));
  for (let i = 1; i < sorted.length; i += 1) {
    const d = sorted[i].ts_ms - sorted[i - 1].ts_ms;
    if (d > gapThresholdMs) gap_count += 1;
  }

  if (dedup_count) warnings.push(`dedups:${dedup_count}`);
  if (gap_count) warnings.push(`gaps:${gap_count}`);
  if (strict && heuristic_used) throw new Error('strict mode disallows heuristic dedup');

  return {
    schema_version: '1.0.0',
    input_rows: rows.length,
    output_rows: sorted.length,
    dedup_count,
    gap_count,
    outlier_count,
    heuristic_used,
    warnings,
    fingerprint: fp({ ids: sorted.map((r) => r.output_fingerprint), dedup_count, gap_count, outlier_count, heuristic_used })
  };
}
