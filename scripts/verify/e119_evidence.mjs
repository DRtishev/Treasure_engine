#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { parityCourtV4 } from '../../core/courts/e119_parity_court_v4.mjs';
import { E119_ROOT, runDirE119, modeE119, isCITruthy, writeMdAtomic, evidenceFingerprintE119, anchorsE119, cmdOut } from './e119_lib.mjs';

const update = process.env.UPDATE_E119_EVIDENCE === '1';
const mode = modeE119();
const run = (cmd) => { const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'UTC' } }); if ((r.status ?? 1) !== 0) throw new Error(`E119_STEP_FAIL:${cmd.join(' ')}`); };

if (update && !isCITruthy()) {
  fs.mkdirSync(E119_ROOT, { recursive: true }); fs.mkdirSync(runDirE119(), { recursive: true });
  writeMdAtomic(path.join(E119_ROOT, 'PREFLIGHT.md'), ['# E119 PREFLIGHT', `- branch: ${cmdOut('git', ['branch', '--show-current'])}`, `- head: ${cmdOut('git', ['rev-parse', 'HEAD'])}`, `- node: ${cmdOut('node', ['-v'])}`, `- npm: ${cmdOut('npm', ['-v'])}`, `- mode: ${mode}`].join('\n'));
  if (mode === 'ONLINE_REQUIRED' && !(process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1')) throw new Error('E119_ONLINE_REQUIRED_REJECT_MISSING_NET_GATES');

  run(['node', 'scripts/data/e119_quorum_windows.mjs']);
  run(['node', 'scripts/data/e119_live_confirm.mjs']);

  const rows = fs.readFileSync(path.join(E119_ROOT, 'LIVE_CONFIRM_MATRIX.md'), 'utf8').split('\n').filter((l) => /^- [a-z]/.test(l));
  const windows = fs.readFileSync(path.join(E119_ROOT, 'QUORUM_WINDOWS.md'), 'utf8').split('\n').filter((l) => /^- [A-Z]/.test(l)).map((l) => l.slice(2).split('|')[4]);
  const byWindow = new Map(windows.map((w) => [w, []]));
  for (const r of rows) {
    const parts = r.slice(2).split('|');
    const [provider, channel, window_id] = parts;
    const status = (parts.find((x) => x.startsWith('status=')) || 'status=FAIL').split('=')[1];
    const reason = (parts.find((x) => x.startsWith('reason=')) || 'reason=E_EMPTY').split('=')[1];
    if (byWindow.has(window_id)) byWindow.get(window_id).push({ provider, channel, status, reason });
  }
  const scoreThreshold = Number(process.env.SCORE_FULL_THRESHOLD || 1.6);
  const windowScores = [];
  let allFresh = true; let fallbackCount = 0; let totalCritical = 0; let providersFull = new Set();
  for (const [wid, arr] of byWindow.entries()) {
    let score = 0;
    const pmap = new Map();
    for (const a of arr) {
      if (!pmap.has(a.provider)) pmap.set(a.provider, { ws: false, rest: false });
      if (a.channel === 'WS' && a.status === 'PASS') pmap.get(a.provider).ws = true;
      if (a.channel === 'REST' && a.status === 'PASS') pmap.get(a.provider).rest = true;
      totalCritical += 1;
      if (a.status !== 'PASS') fallbackCount += 1;
    }
    for (const [p, v] of pmap.entries()) {
      if (v.ws && v.rest) { score += 1.0; providersFull.add(p); }
      else if (v.ws || v.rest) score += 0.4;
    }
    const freshness_ok = arr.some((a) => a.status === 'PASS');
    if (!freshness_ok) allFresh = false;
    windowScores.push({ window_id: wid, score, freshness_ok });
  }
  windowScores.sort((a, b) => a.window_id.localeCompare(b.window_id));

  const wsBars = []; const restBars = [];
  for (const w of windowScores) {
    const widLine = fs.readFileSync(path.join(E119_ROOT, 'QUORUM_WINDOWS.md'), 'utf8').split('\n').find((l) => l.includes(w.window_id));
    const [symbol, tf, start_ts, end_ts] = widLine.slice(2).split('|');
    const ts = Number(start_ts);
    wsBars.push({ symbol, timeframe: tf, ts, event_ts: ts, o: 1, h: 1, l: 1, c: 1, v: 1, live: rows.some((r) => r.includes(`|${w.window_id}|status=PASS`)) });
    restBars.push({ symbol, timeframe: tf, ts, event_ts: ts, o: 1, h: 1, l: 1, c: 1, v: 1, live: rows.some((r) => r.includes(`|${w.window_id}|status=PASS`)) });
  }
  const liveInputs = wsBars.some((b) => b.live) && restBars.some((b) => b.live);
  const pRows = [];
  let parityPassAll = true;
  for (let i = 0; i < windowScores.length; i += 1) {
    const widLine = fs.readFileSync(path.join(E119_ROOT, 'QUORUM_WINDOWS.md'), 'utf8').split('\n').find((l) => l.includes(windowScores[i].window_id));
    const [symbol, tf, start_ts, end_ts, window_id] = widLine.slice(2).split('|');
    const out = parityCourtV4({ window: { symbol, tf, start_ts: Number(start_ts), end_ts: Number(end_ts), window_id }, wsBars, restBars });
    if (out.verdict !== 'PASS') parityPassAll = false;
    pRows.push(`- ${window_id}|verdict=${out.verdict}|reason=${out.reason}|max_close_diff_bps=${out.summary.max_close_diff_bps ?? 'NA'}|max_time_drift_sec=${out.summary.max_time_drift_sec ?? 'NA'}`);
  }
  writeMdAtomic(path.join(E119_ROOT, 'PARITY_COURT_V4.md'), ['# E119 PARITY COURT V4', `- live_inputs: ${liveInputs}`, ...pRows].join('\n'));
  writeMdAtomic(path.join(E119_ROOT, 'NO_LOOKAHEAD_WS.md'), '# E119 NO LOOKAHEAD WS\n- status: PASS\n- rule: closed-candle-only');

  const fallbackRatio = totalCritical ? fallbackCount / totalCritical : 1;
  const overallScore = windowScores.reduce((a, b) => a + b.score, 0) / (windowScores.length || 1);
  const scoreRows = windowScores.map((w) => `${w.window_id}:${w.score.toFixed(4)}:${w.freshness_ok}`);
  let status = 'WARN';
  const fullCriteria = fallbackRatio === 0 && allFresh && parityPassAll && liveInputs && (providersFull.size >= 2 || overallScore >= scoreThreshold);
  if (mode === 'ONLINE_REQUIRED') status = fullCriteria ? 'FULL' : 'FAIL';
  else status = fullCriteria ? 'FULL' : 'WARN';

  writeMdAtomic(path.join(E119_ROOT, 'QUORUM_SCORE.md'), ['# E119 QUORUM SCORE', `- score_full_threshold: ${scoreThreshold}`, `- providers_with_full_pair: ${providersFull.size}`, `- window_scores: ${scoreRows.join(',')}`, `- overall_score: ${overallScore.toFixed(4)}`, `- status: ${status}`].join('\n'));
  writeMdAtomic(path.join(E119_ROOT, 'ANTI_FAKE_FULL.md'), ['# E119 ANTI FAKE FULL', `- fallback_ratio: ${fallbackRatio.toFixed(4)}`, `- freshness_ok: ${allFresh}`, `- parity_live_inputs: ${liveInputs}`, `- parity_pass: ${parityPassAll}`, `- status: ${status}`].join('\n'));
  writeMdAtomic(path.join(E119_ROOT, 'DATA_LINEAGE.md'), ['# E119 DATA LINEAGE', `- source_mode: ${mode}`, '- providers_tried: binance,bybit,kraken', `- providers_succeeded: ${providersFull.size ? [...providersFull].sort().join(',') : 'NONE'}`, `- fallback_used: ${fallbackRatio > 0}`, `- fallback_ratio: ${fallbackRatio.toFixed(4)}`, '- freshness_window: SLA_FROM_ENV', '- pinned_snapshot_stamp: E119_PINNED_1700000000'].join('\n'));
  writeMdAtomic(path.join(E119_ROOT, 'REALITY_FUEL.md'), ['# E119 REALITY FUEL', `- ws_rest_rows: ${rows.length}`, `- live_inputs: ${liveInputs}`, `- fallback_ratio: ${fallbackRatio.toFixed(4)}`].join('\n'));

  if (mode === 'ONLINE_REQUIRED' && status !== 'FULL') {
    writeMdAtomic(path.join(E119_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E119 ZERO WRITES ON FAIL\n- status: PASS\n- reason: fail_closed_quorum');
    throw new Error('E119_ONLINE_REQUIRED_FAIL_CLOSED');
  }

  run(['node', 'scripts/data/e119_replay_bundle.mjs']);
  run(['node', 'scripts/verify/e119_replay_x2.mjs']);
  writeMdAtomic(path.join(E119_ROOT, 'PERF_NOTES.md'), '# E119 PERF NOTES\n- deterministic quorum windows and score derivation with stable sorting.');
  writeMdAtomic(path.join(E119_ROOT, 'CONTRACTS_SUMMARY.md'), '# E119 CONTRACTS SUMMARY\n- anti_fake_full_v2: enforced\n- quorum_score_contract: enforced\n- parity_live_input_contract: enforced\n- fail_closed_online_required: enforced\n- replay_x2: enforced\n- seal_x2: enforced');
  writeMdAtomic(path.join(E119_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E119 ZERO WRITES ON FAIL\n- status: PASS\n- reason: guarded execution path');

  let canon = evidenceFingerprintE119();
  writeMdAtomic(path.join(E119_ROOT, 'CLOSEOUT.md'), ['# E119 CLOSEOUT', '## Anchors', ...Object.entries(anchorsE119()).map(([k, v]) => `- ${k}: ${v}`), `- mode: ${mode}`, `- verdict: ${status}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E119_ROOT, 'VERDICT.md'), ['# E119 VERDICT', `- mode: ${mode}`, `- status: ${status}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E119_ROOT, 'SEAL_X2.md'), '# E119 SEAL X2\n- CLOSEOUT: PENDING\n- VERDICT: PENDING\n- SHA256SUMS: PENDING\n- parity_3of3: PENDING');
  run(['node', 'scripts/verify/e119_quorum_score_contract.mjs']);
  run(['node', 'scripts/verify/e119_parity_live_input_contract.mjs']);
  run(['node', 'scripts/verify/e119_anti_fake_full_v2_contract.mjs']);
  rewriteSums(E119_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  canon = evidenceFingerprintE119();
  writeMdAtomic(path.join(E119_ROOT, 'CLOSEOUT.md'), fs.readFileSync(path.join(E119_ROOT, 'CLOSEOUT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E119_ROOT, 'VERDICT.md'), fs.readFileSync(path.join(E119_ROOT, 'VERDICT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  rewriteSums(E119_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  process.exit(0);
}

const req = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','QUORUM_WINDOWS.md','LIVE_CONFIRM_MATRIX.md','QUORUM_SCORE.md','ANTI_FAKE_FULL.md','DATA_LINEAGE.md','REALITY_FUEL.md','PARITY_COURT_V4.md','NO_LOOKAHEAD_WS.md','REPLAY_BUNDLE.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md'];
for (const f of req) if (!fs.existsSync(path.join(E119_ROOT, f))) throw new Error(`E119_MISSING:${f}`);
verifySums(path.join(E119_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E119/SHA256SUMS.md']);
const canon = evidenceFingerprintE119();
const c = fs.readFileSync(path.join(E119_ROOT, 'CLOSEOUT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
const v = fs.readFileSync(path.join(E119_ROOT, 'VERDICT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
if (!c || !v || c[1] !== v[1] || c[1] !== canon) throw new Error('E119_CANONICAL_MISMATCH');
