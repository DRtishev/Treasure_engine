export function parityCourtV4({ window, wsBars = [], restBars = [], closeBpsLimit = 8, timeDriftSecLimit = 45 }) {
  const sameWindow = (b) => Number(b.ts) >= Number(window.start_ts) && Number(b.ts) <= Number(window.end_ts);
  const wsIn = wsBars.filter(sameWindow);
  const restIn = restBars.filter(sameWindow);
  const restByTs = new Map(restIn.map((r) => [Number(r.ts), r]));
  const rows = [];
  for (const w of wsIn) {
    const r = restByTs.get(Number(w.ts));
    if (!r) {
      rows.push({ ts: Number(w.ts), verdict: 'FAIL', reason: 'E_WINDOW_MISMATCH' });
      continue;
    }
    const time_drift_sec = Math.abs(Number((w.event_ts ?? w.ts) - r.ts)) / 1000;
    const close_diff_bps = Math.abs((Number(w.c) - Number(r.c)) / (Number(r.c) || 1)) * 10000;
    const high_diff_bps = Math.abs((Number(w.h) - Number(r.h)) / (Number(r.h) || 1)) * 10000;
    const low_diff_bps = Math.abs((Number(w.l) - Number(r.l)) / (Number(r.l) || 1)) * 10000;
    const volume_diff_pct = Math.abs((Number(w.v) - Number(r.v)) / (Math.abs(Number(r.v)) || 1)) * 100;
    const pass = time_drift_sec <= timeDriftSecLimit && close_diff_bps <= closeBpsLimit;
    rows.push({ ts: Number(w.ts), time_drift_sec, close_diff_bps, high_diff_bps, low_diff_bps, volume_diff_pct, verdict: pass ? 'PASS' : 'FAIL', reason: pass ? 'PARITY_OK' : 'E_SCHEMA_DRIFT' });
  }
  const vals = (k) => rows.map((r) => r[k]).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const med = (a) => a.length ? a[Math.floor(a.length / 2)] : null;
  const closeVals = vals('close_diff_bps');
  const driftVals = vals('time_drift_sec');
  const summary = {
    max_close_diff_bps: closeVals.length ? closeVals[closeVals.length - 1] : null,
    median_close_diff_bps: med(closeVals),
    max_time_drift_sec: driftVals.length ? driftVals[driftVals.length - 1] : null,
    rows: rows.length,
    pass: rows.filter((r) => r.verdict === 'PASS').length,
    fail: rows.filter((r) => r.verdict === 'FAIL').length
  };
  const verdict = rows.length && summary.fail === 0 ? 'PASS' : (summary.pass > 0 ? 'WARN' : 'FAIL');
  return { verdict, reason: verdict === 'PASS' ? 'PARITY_OK' : (summary.fail ? 'E_SCHEMA_DRIFT' : 'E_EMPTY'), summary, rows };
}
