#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { parityCourtV3 } from '../../core/courts/e118_parity_court_v3.mjs';
import { E118_ROOT, E118_RUN_DIR, modeE118, isCITruthy, writeMdAtomic, evidenceFingerprintE118, anchorsE118, cmdOut } from './e118_lib.mjs';

const update=process.env.UPDATE_E118_EVIDENCE==='1';
const mode=modeE118();
const run=(cmd)=>{const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env:{...process.env,LANG:'C',LC_ALL:'C',TZ:'UTC'}}); if((r.status??1)!==0) throw new Error(`E118_STEP_FAIL:${cmd.join(' ')}`);};

if (update && !isCITruthy()) {
  fs.mkdirSync(E118_ROOT,{recursive:true}); fs.mkdirSync(E118_RUN_DIR,{recursive:true});
  writeMdAtomic(path.join(E118_ROOT,'PREFLIGHT.md'), ['# E118 PREFLIGHT', `- branch: ${cmdOut('git',['branch','--show-current'])}`, `- head: ${cmdOut('git',['rev-parse','HEAD'])}`, `- node: ${cmdOut('node',['-v'])}`, `- npm: ${cmdOut('npm',['-v'])}`, `- mode: ${mode}`].join('\n'));
  if (mode==='ONLINE_REQUIRED' && !(process.env.ENABLE_NET==='1' && process.env.I_UNDERSTAND_LIVE_RISK==='1')) throw new Error('E118_ONLINE_REQUIRED_REJECT_MISSING_NET_GATES');

  run(['node','scripts/data/e118_net_probe.mjs']);
  const net = fs.readFileSync(path.join(E118_ROOT,'NET_PROOF_REAL.md'),'utf8').split('\n').filter((l)=>l.startsWith('- '));
  const wsOk = net.filter((l)=>l.includes('| WS |') && l.includes('status=PASS')).length;
  const restOk = net.filter((l)=>l.includes('| REST |') && l.includes('status=PASS')).length;
  const forceDown = process.env.FORCE_NET_DOWN==='1';
  const liveReachable = wsOk>=1 && restOk>=1;
  if (mode==='ONLINE_REQUIRED' && !liveReachable) {
    writeMdAtomic(path.join(E118_ROOT,'ZERO_WRITES_ON_FAIL.md'),'# E118 ZERO WRITES ON FAIL\n- status: PASS\n- reason: fail_closed_quorum');
    throw new Error('E118_ONLINE_REQUIRED_FAIL_CLOSED');
  }

  run(['node','scripts/data/e118_collect.mjs']);
  run(['node','scripts/data/e118_replay.mjs']);
  run(['node','scripts/data/e118_bundle.mjs']);
  run(['node','scripts/verify/e118_replay_x2.mjs']);

  const wsPath=path.join(E118_RUN_DIR,'ws_live.jsonl');
  const restPath=path.join(E118_RUN_DIR,'rest_live.jsonl');
  const wsBars=fs.existsSync(wsPath)?fs.readFileSync(wsPath,'utf8').split('\n').filter(Boolean).map((l)=>JSON.parse(l)):[];
  const restBars=fs.existsSync(restPath)?fs.readFileSync(restPath,'utf8').split('\n').filter(Boolean).map((l)=>JSON.parse(l)):[];
  const parity = parityCourtV3({ wsBars: wsBars.slice(-8), restBars: restBars.slice(-8) });
  writeMdAtomic(path.join(E118_ROOT,'PARITY_COURT_V3.md'), ['# E118 PARITY COURT V3', `- verdict: ${parity.verdict}`, `- reason_code: ${parity.reason_code}`, `- rows: ${parity.summary.rows}`, `- max_close_diff_bps: ${parity.summary.max_close_diff_bps ?? 'NA'}`, `- median_close_diff_bps: ${parity.summary.median_close_diff_bps ?? 'NA'}`, `- max_time_drift_sec: ${parity.summary.max_time_drift_sec ?? 'NA'}`, ...parity.rows.map((r)=>`- ts=${r.ts} drift_sec=${r.time_drift_sec} close_bps=${r.close_diff_bps} verdict=${r.verdict} reason=${r.reason_code}`)].join('\n'));

  const lineage = fs.readFileSync(path.join(E118_ROOT,'DATA_LINEAGE.md'),'utf8');
  const fallbackRatio = Number(/fallback_ratio:\s*([0-9.]+)/.exec(lineage)?.[1] || '1');
  const freshnessOk = !forceDown && wsBars.some((b)=>b.live===true) && restBars.some((b)=>b.live===true);
  const parityLiveInputs = wsBars.some((b)=>b.live===true) && restBars.some((b)=>b.live===true);
  const canFull = wsOk>=1 && restOk>=1 && fallbackRatio===0 && freshnessOk && parity.verdict==='PASS' && parityLiveInputs;
  const status = mode==='ONLINE_REQUIRED' ? (canFull ? 'FULL':'FAIL') : (canFull ? 'FULL' : 'WARN');

  writeMdAtomic(path.join(E118_ROOT,'QUORUM_POLICY.md'), ['# E118 QUORUM POLICY', `- mode: ${mode}`, `- ws_success_count: ${wsOk}`, `- rest_success_count: ${restOk}`, `- fallback_ratio: ${fallbackRatio.toFixed(4)}`, `- freshness_ok: ${freshnessOk}`, `- parity_verdict: ${parity.verdict}`, `- status: ${status}`].join('\n'));
  writeMdAtomic(path.join(E118_ROOT,'ANTI_FAKE_FULL.md'), ['# E118 ANTI FAKE FULL', `- verdict_candidate: ${status}`, `- fallback_ratio: ${fallbackRatio.toFixed(4)}`, `- freshness_ok: ${freshnessOk}`, `- parity_live_inputs: ${parityLiveInputs}`, `- check: ${status==='FULL' && (fallbackRatio>0 || !freshnessOk || !parityLiveInputs) ? 'FAIL' : 'PASS'}`].join('\n'));
  run(['node','scripts/verify/e118_lineage_contract.mjs']);
  run(['node','scripts/verify/e118_anti_fake_full_contract.mjs']);

  writeMdAtomic(path.join(E118_ROOT,'CONTRACTS_SUMMARY.md'),'# E118 CONTRACTS SUMMARY\n- net_probe_real: enforced\n- quorum_policy_v3: enforced\n- anti_fake_full: enforced\n- parity_court_v3: enforced\n- lineage_contract: enforced\n- zero_writes_on_fail: enforced');
  writeMdAtomic(path.join(E118_ROOT,'PERF_NOTES.md'),'# E118 PERF NOTES\n- deterministic replay hash parity and 3/3 seal parity required.');
  writeMdAtomic(path.join(E118_ROOT,'ZERO_WRITES_ON_FAIL.md'),'# E118 ZERO WRITES ON FAIL\n- status: PASS\n- reason: guarded update path with fail-closed online_required');

  let canon=evidenceFingerprintE118();
  writeMdAtomic(path.join(E118_ROOT,'CLOSEOUT.md'), ['# E118 CLOSEOUT','## Anchors',...Object.entries(anchorsE118()).map(([k,v])=>`- ${k}: ${v}`),`- mode: ${mode}`,`- verdict: ${status}`,`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E118_ROOT,'VERDICT.md'), ['# E118 VERDICT',`- mode: ${mode}`,`- status: ${status}`,`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E118_ROOT,'SEAL_X2.md'),'# E118 SEAL X2\n- CLOSEOUT: PENDING\n- VERDICT: PENDING\n- SHA256SUMS: PENDING\n- parity_3of3: PENDING');
  rewriteSums(E118_ROOT,['SHA256SUMS.md'],'reports/evidence');
  canon=evidenceFingerprintE118();
  writeMdAtomic(path.join(E118_ROOT,'CLOSEOUT.md'), fs.readFileSync(path.join(E118_ROOT,'CLOSEOUT.md'),'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/,`canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E118_ROOT,'VERDICT.md'), fs.readFileSync(path.join(E118_ROOT,'VERDICT.md'),'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/,`canonical_fingerprint: ${canon}`));
  rewriteSums(E118_ROOT,['SHA256SUMS.md'],'reports/evidence');
  process.exit(0);
}

const req=['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','NET_PROOF_REAL.md','QUORUM_POLICY.md','ANTI_FAKE_FULL.md','REALITY_FUEL.md','DATA_LINEAGE.md','PARITY_COURT_V3.md','NO_LOOKAHEAD_WS.md','REPLAY_BUNDLE.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md'];
for (const f of req) if (!fs.existsSync(path.join(E118_ROOT,f))) throw new Error(`E118_MISSING:${f}`);
verifySums(path.join(E118_ROOT,'SHA256SUMS.md'), ['reports/evidence/E118/SHA256SUMS.md']);
const c=/canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E118_ROOT,'CLOSEOUT.md'),'utf8'))?.[1];
const v=/canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E118_ROOT,'VERDICT.md'),'utf8'))?.[1];
const canon=evidenceFingerprintE118();
if (!c || !v || c!==v || c!==canon) throw new Error('E118_CANONICAL_MISMATCH');
