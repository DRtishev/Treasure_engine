import { fingerprintObject } from './data_contracts.mjs';

function dedupKey(event) {
  if (event.trade_id != null) return `trade_id:${event.trade_id}`;
  return `heuristic:${event.ts_ms}|${event.price}|${event.qty}|${event.side}`;
}

export function evaluateDataQuality(events, {
  maxTimeGapMs = 1500,
  dedupWindowMs = 500,
  allowOutOfOrder = 2
} = {}) {
  const warnings = [];
  let dedupCount = 0;
  let gapCount = 0;
  let outOfOrderCount = 0;
  let reconnectCount = 0;
  let heuristicDedupCount = 0;

  const seen = new Map();
  let prevTs = null;
  const normalized = [];

  for (const event of events) {
    const key = dedupKey(event);
    if (key.startsWith('heuristic:')) heuristicDedupCount += 1;

    const prevSeenTs = seen.get(key);
    if (prevSeenTs != null && Math.abs(event.ts_ms - prevSeenTs) <= dedupWindowMs) {
      dedupCount += 1;
      continue;
    }

    seen.set(key, event.ts_ms);

    if (prevTs != null) {
      if (event.ts_ms < prevTs) outOfOrderCount += 1;
      if (event.ts_ms - prevTs > maxTimeGapMs) {
        gapCount += 1;
        reconnectCount += 1;
      }
    }
    prevTs = event.ts_ms;
    normalized.push(event);
  }

  const inChunkSorted = [...normalized].sort((a, b) => {
    if (a.ts_ms !== b.ts_ms) return a.ts_ms - b.ts_ms;
    return a.output_fingerprint.localeCompare(b.output_fingerprint);
  });

  if (outOfOrderCount > allowOutOfOrder) warnings.push(`out_of_order_count_exceeds:${allowOutOfOrder}`);
  if (gapCount > 0) warnings.push(`time_gaps:${gapCount}`);
  if (dedupCount > 0) warnings.push(`dedups:${dedupCount}`);

  const report = {
    schema_version: '1.0.0',
    input_events: events.length,
    output_events: inChunkSorted.length,
    dedup_count: dedupCount,
    heuristic_dedup_key_events: heuristicDedupCount,
    gap_count: gapCount,
    out_of_order_count: outOfOrderCount,
    reconnect_count: reconnectCount,
    warnings,
    fingerprint: fingerprintObject({
      output_events: inChunkSorted.map((e) => e.output_fingerprint),
      dedup_count: dedupCount,
      gap_count: gapCount,
      out_of_order_count: outOfOrderCount
    })
  };

  return { normalizedEvents: inChunkSorted, report };
}
