import { E117_WS_ERRORS } from '../data/ws_provider_interface.mjs';

export function parityCourtE117({ wsBars = [], restBars = [], tolerance = 1e-6, maxGapMs = 60_000 }) {
  if (!wsBars.length || !restBars.length) return { verdict: 'WARN', reason: E117_WS_ERRORS.EMPTY, rows: [] };
  const rows = [];
  const restByTs = new Map(restBars.map((r) => [Number(r.ts), r]));
  let pass = 0;
  for (const w of wsBars) {
    const r = restByTs.get(Number(w.ts));
    if (!r) {
      rows.push({ ts: w.ts, verdict: 'FAIL', reason: 'E_GAP_TOO_WIDE' });
      continue;
    }
    if (Math.abs(Number(w.event_ts || w.ts) - Number(r.ts)) > maxGapMs) {
      rows.push({ ts: w.ts, verdict: 'FAIL', reason: 'E_TIME_DRIFT' });
      continue;
    }
    const same = ['o', 'h', 'l', 'c', 'v'].every((k) => Math.abs(Number(w[k]) - Number(r[k])) <= tolerance);
    if (!same) {
      rows.push({ ts: w.ts, verdict: 'FAIL', reason: 'E_SCHEMA_DRIFT' });
      continue;
    }
    rows.push({ ts: w.ts, verdict: 'PASS', reason: 'PARITY_OK' });
    pass += 1;
  }
  return { verdict: pass > 0 && rows.every((r) => r.verdict === 'PASS') ? 'PASS' : (pass > 0 ? 'WARN' : 'FAIL'), reason: pass ? 'PARITY_OK' : 'E_PROVIDER_DOWN', rows };
}
