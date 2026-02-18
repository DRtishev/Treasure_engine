export function parityCourtV3({ wsBars = [], restBars = [], closeBpsLimit = 5, timeDriftSecLimit = 30 }) {
  const restByTs = new Map(restBars.map((r) => [Number(r.ts), r]));
  const rows = [];
  for (const w of wsBars) {
    const r = restByTs.get(Number(w.ts));
    if (!r) {
      rows.push({ ts: Number(w.ts), verdict: 'FAIL', reason_code: 'E_GAP_TOO_WIDE', time_drift_sec: null, close_diff_bps: null, range_diff: null });
      continue;
    }
    const timeDriftSec = Math.abs(Number((w.event_ts ?? w.ts) - r.ts)) / 1000;
    const closeDiffBps = Math.abs((Number(w.c) - Number(r.c)) / (Number(r.c) || 1)) * 10000;
    const wr = Number(w.h) - Number(w.l);
    const rr = Number(r.h) - Number(r.l);
    const rangeDiff = Math.abs(wr - rr);
    let verdict = 'PASS';
    let reason = 'PARITY_OK';
    if (timeDriftSec > timeDriftSecLimit) { verdict = 'FAIL'; reason = 'E_TIME_DRIFT'; }
    else if (closeDiffBps > closeBpsLimit) { verdict = 'FAIL'; reason = 'E_SCHEMA_DRIFT'; }
    rows.push({ ts: Number(w.ts), verdict, reason_code: reason, time_drift_sec: timeDriftSec, close_diff_bps: closeDiffBps, range_diff: rangeDiff });
  }
  const passRows = rows.filter((r) => r.verdict === 'PASS');
  const closeBps = rows.map((r) => r.close_diff_bps).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const timeDrifts = rows.map((r) => r.time_drift_sec).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const median = (a) => (a.length ? a[Math.floor(a.length / 2)] : null);
  const summary = {
    rows: rows.length,
    pass: passRows.length,
    fail: rows.length - passRows.length,
    max_close_diff_bps: closeBps.length ? closeBps[closeBps.length - 1] : null,
    median_close_diff_bps: median(closeBps),
    max_time_drift_sec: timeDrifts.length ? timeDrifts[timeDrifts.length - 1] : null,
    median_time_drift_sec: median(timeDrifts)
  };
  const verdict = rows.length > 0 && summary.fail === 0 ? 'PASS' : (passRows.length > 0 ? 'WARN' : 'FAIL');
  return { verdict, reason_code: verdict === 'PASS' ? 'PARITY_OK' : (passRows.length > 0 ? 'E_SCHEMA_DRIFT' : 'E_PROVIDER_DOWN'), summary, rows };
}
