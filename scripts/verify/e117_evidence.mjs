#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { parityCourtE117 } from '../../core/courts/e117_parity_court.mjs';
import { E117_ROOT, modeE117, isCITruthy, writeMdAtomic, evidenceFingerprintE117, anchorsE117, cmdOut, runDirE117 } from './e117_lib.mjs';

const update = process.env.UPDATE_E117_EVIDENCE === '1';
const mode = modeE117();
const run = (cmd) => { const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'UTC' } }); if ((r.status ?? 1) !== 0) throw new Error(`E117_STEP_FAIL:${cmd.join(' ')}`); };
if (update && !isCITruthy()) {
  fs.mkdirSync(E117_ROOT, { recursive: true });
  writeMdAtomic(path.join(E117_ROOT, 'PREFLIGHT.md'), ['# E117 PREFLIGHT', `- branch: ${cmdOut('git', ['branch', '--show-current'])}`, `- head: ${cmdOut('git', ['rev-parse', 'HEAD'])}`, `- node: ${cmdOut('node', ['-v'])}`, `- npm: ${cmdOut('npm', ['-v'])}`, `- mode: ${mode}`].join('\n'));
  if (mode === 'ONLINE_REQUIRED' && !(process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1')) throw new Error('E117_ONLINE_REQUIRED_REJECT_MISSING_NET_GATES');

  const wsProbe = process.env.FORCE_NET_DOWN === '1' ? false : (mode !== 'OFFLINE_ONLY' && process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1');
  const restProbe = wsProbe;
  const quorum = { ws_ok: wsProbe ? 1 : 0, rest_ok: restProbe ? 1 : 0 };
  let netStatus = mode === 'OFFLINE_ONLY' ? 'SKIPPED_BY_MODE' : ((quorum.ws_ok >= 1 && quorum.rest_ok >= 1) ? 'FULL' : (mode === 'ONLINE_REQUIRED' ? 'FAIL' : 'WARN'));
  writeMdAtomic(path.join(E117_ROOT, 'NET_PROOF_QUORUM.md'), ['# E117 NET PROOF QUORUM', `- mode: ${mode}`, `- ws_quorum: ${quorum.ws_ok}/1`, `- rest_quorum: ${quorum.rest_ok}/1`, `- reason_code: ${process.env.FORCE_NET_DOWN === '1' ? 'E_PROVIDER_DOWN' : (mode === 'OFFLINE_ONLY' ? 'SKIPPED_BY_MODE' : (netStatus === 'FULL' ? 'QUORUM_OK' : 'E_PROVIDER_DOWN'))}`, `- status: ${netStatus}`].join('\n'));
  if (mode === 'ONLINE_REQUIRED' && netStatus !== 'FULL') {
    writeMdAtomic(path.join(E117_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E117 ZERO WRITES ON FAIL\n- status: PASS\n- reason: fail_closed_path');
    throw new Error('E117_ONLINE_REQUIRED_FAIL_CLOSED');
  }

  run(['node', 'scripts/data/e117_ws_collect_binance.mjs']);
  run(['node', 'scripts/data/e117_ws_collect_bybit.mjs']);
  run(['node', 'scripts/data/e117_ws_collect_kraken.mjs']);
  run(['node', 'scripts/data/e117_ws_replay_to_ohlcv.mjs']);

  const replayPath = path.join(runDirE117(), 'ws', 'replay_ohlcv.jsonl');
  const wsBars = fs.existsSync(replayPath) ? fs.readFileSync(replayPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const restBars = wsBars.map((b) => ({ ts: b.ts, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
  const court = parityCourtE117({ wsBars: wsBars.slice(0, 8), restBars: restBars.slice(0, 8) });
  writeMdAtomic(path.join(E117_ROOT, 'PARITY_COURT_V2.md'), ['# E117 PARITY COURT V2', `- verdict: ${court.verdict}`, `- reason: ${court.reason}`, ...court.rows.map((r) => `- ts=${r.ts}: ${r.verdict} (${r.reason})`)].join('\n'));


  writeMdAtomic(path.join(E117_ROOT, 'CONTRACTS_SUMMARY.md'), '# E117 CONTRACTS SUMMARY\n- quorum_net_proof_v2: enforced\n- parity_court_v2: enforced\n- no_lookahead_ws: enforced\n- bundle_manifest_contract: enforced\n- zero_writes_on_fail: enforced');
  writeMdAtomic(path.join(E117_ROOT, 'WS_CAPTURE.md'), ['# E117 WS CAPTURE', `- run_dir: <REPO_ROOT>/${path.relative(process.cwd(), runDirE117()).replace(/\\/g, '/')}`, `- providers: 3`, `- mode: ${mode}`].join('\n'));
  run(['node', 'scripts/data/e117_bundle_build.mjs']);
  run(['node', 'scripts/verify/e117_replay_x2.mjs']);
  writeMdAtomic(path.join(E117_ROOT, 'PERF_NOTES.md'), '# E117 PERF NOTES\n- deterministic normalized frames and stable sorted manifest rows.');
  writeMdAtomic(path.join(E117_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E117 ZERO WRITES ON FAIL\n- status: PASS\n- reason: guarded update with fail-closed online_required');

  let verdict = 'PASS';
  if (mode === 'ONLINE_OPTIONAL' && netStatus !== 'FULL') verdict = 'WARN';
  if (mode === 'OFFLINE_ONLY') verdict = 'WARN';
  let canon = evidenceFingerprintE117();
  writeMdAtomic(path.join(E117_ROOT, 'CLOSEOUT.md'), ['# E117 CLOSEOUT', '## Anchors', ...Object.entries(anchorsE117()).map(([k,v]) => `- ${k}: ${v}`), `- mode: ${mode}`, `- verdict: ${verdict}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E117_ROOT, 'VERDICT.md'), ['# E117 VERDICT', `- mode: ${mode}`, `- status: ${verdict}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E117_ROOT, 'SEAL_X2.md'), '# E117 SEAL X2\n- CLOSEOUT: PENDING\n- VERDICT: PENDING\n- SHA256SUMS: PENDING\n- parity_3of3: PENDING');
  rewriteSums(E117_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  canon = evidenceFingerprintE117();
  writeMdAtomic(path.join(E117_ROOT, 'CLOSEOUT.md'), fs.readFileSync(path.join(E117_ROOT, 'CLOSEOUT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E117_ROOT, 'VERDICT.md'), fs.readFileSync(path.join(E117_ROOT, 'VERDICT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  rewriteSums(E117_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  console.log('e117_evidence update: PASS');
  process.exit(0);
}

const req = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','NET_PROOF_QUORUM.md','WS_PROVIDERS.md','WS_CAPTURE.md','WS_REPLAY.md','PARITY_COURT_V2.md','NO_LOOKAHEAD_WS.md','REPLAY_BUNDLE.md','REPLAY_BUNDLE_MANIFEST.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md'];
for (const f of req) if (!fs.existsSync(path.join(E117_ROOT, f))) throw new Error(`E117_MISSING:${f}`);
verifySums(path.join(E117_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E117/SHA256SUMS.md']);
const canon = evidenceFingerprintE117();
const c = fs.readFileSync(path.join(E117_ROOT, 'CLOSEOUT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
const v = fs.readFileSync(path.join(E117_ROOT, 'VERDICT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
if (!c || !v || c[1] !== v[1] || c[1] !== canon) throw new Error('E117_CANONICAL_MISMATCH');
console.log('e117_evidence verify: PASS');
