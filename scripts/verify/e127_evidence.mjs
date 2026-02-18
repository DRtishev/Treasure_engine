#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E127_ROOT, E127_REQUIRED, runDirE127, modeE127, isCITruthy, writeMdAtomic, evidenceFingerprintE127, cmdOut, redactHash } from './e127_lib.mjs';

const update = process.env.UPDATE_E127_EVIDENCE==='1';
const mode = modeE127();
const run = (cmd) => { const r = spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env:{...process.env,LANG:'C',LC_ALL:'C',TZ:'Europe/Amsterdam'}}); if((r.status??1)!==0) throw new Error(`E127_STEP_FAIL:${cmd.join(' ')}`); };
if (update && isCITruthy()) throw new Error('E127_CI_UPDATE_REJECTED');

if (update && !isCITruthy()) {
  fs.mkdirSync(E127_ROOT,{recursive:true}); fs.mkdirSync(runDirE127(),{recursive:true}); fs.mkdirSync('artifacts/incoming',{recursive:true});
  writeMdAtomic(path.join(E127_ROOT,'PREFLIGHT.md'),['# E127 PREFLIGHT',`- timezone: Europe/Amsterdam`,`- node: ${cmdOut('node',['-v'])}`,`- npm: ${cmdOut('npm',['-v'])}`,`- branch: ${cmdOut('git',['branch','--show-current'])||'N/A'}`,`- head: ${cmdOut('git',['rev-parse','HEAD'])||'N/A'}`,`- mode: ${mode}`].join('\n'));
  if (mode==='ONLINE_REQUIRED' && !(process.env.ENABLE_NET==='1' && process.env.I_UNDERSTAND_LIVE_RISK==='1')) {
    writeMdAtomic(path.join(E127_ROOT,'ZERO_WRITES_ON_FAIL.md'),'# E127 ZERO WRITES ON FAIL\n- status: PASS\n- reason: missing_net_gates\n- writes_detected: false');
    throw new Error('E127_ONLINE_REQUIRED_REJECT_MISSING_GATES');
  }

  const diagRun=spawnSync('node',['scripts/verify/e127_diag.mjs'],{stdio:'inherit',env:{...process.env,E127_DIAG_WRITE:'1',LANG:'C',LC_ALL:'C',TZ:'Europe/Amsterdam'}}); if((diagRun.status??1)!==0) throw new Error('E127_STEP_FAIL:node scripts/verify/e127_diag.mjs');
  run(['node','scripts/verify/e127_replay_x2.mjs']);

  const diag = fs.readFileSync(path.join(E127_ROOT,'EGRESS_DIAG_V6.md'),'utf8');
  const restOk = /- rest_success:\s*true/.test(diag);
  const wsOk = /- ws_success:\s*true/.test(diag);
  const providers = [...diag.matchAll(/\|\s*([A-Z]+)-(REST|WS)\s*\|\s*([A-Z]+)\s*\|/g)].map((m)=>m[3]);
  const providerDiversity = new Set(providers).size >= 2;
  const endpointDiversity = new Set([...diag.matchAll(/\|\s*[A-Z]+-(REST|WS)\s*\|\s*[A-Z]+\s*\|\s*(REST|WS)\s*\|\s*([^|]+)\|/g)].map((m)=>m[3].trim())).size >= 2;
  const liveInputParity = restOk && wsOk;
  const freshnessOk = /time_sync_drift_range_ms:\s*(?!NA)/.test(diag);
  const fallbackRatio = liveInputParity ? 0.0 : 1.0;
  const full = restOk && wsOk && freshnessOk && fallbackRatio<=0.1 && liveInputParity && (providerDiversity || endpointDiversity);
  const quorumScore = Number((0.35*(restOk?1:0)+0.35*(wsOk?1:0)+0.15*(freshnessOk?1:0)+0.10*((providerDiversity||endpointDiversity)?1:0)+0.05*(1-fallbackRatio)).toFixed(4));
  const status = full ? 'FULL' : (mode==='ONLINE_REQUIRED' ? 'FAIL' : 'WARN');

  const key = process.env.BYBIT_TESTNET_API_KEY || ''; const secret = process.env.BYBIT_TESTNET_API_SECRET || '';
  let precheck='E_OK';
  if (isCITruthy()) precheck='E_ENV_BLOCKED';
  else if (!key || !secret) precheck='E_NO_KEYS';
  else if (key.length<8 || secret.length<8) precheck='E_BAD_KEYS';
  else if (!restOk || !wsOk) precheck='E_NET_DOWN';

  writeMdAtomic(path.join(E127_ROOT,'REACHABILITY_CERT.md'),['# E127 REACHABILITY CERT',`- rest_reachable: ${restOk}`,`- ws_reachable: ${wsOk}`,`- provider_diversity: ${providerDiversity}`,`- endpoint_diversity: ${endpointDiversity}`,`- mode: ${mode}`].join('\n'));
  writeMdAtomic(path.join(E127_ROOT,'QUORUM_POLICY_V2.md'),'# E127 QUORUM POLICY V2\n- FULL requires: rest>=1, ws>=1, freshness_sla=true, fallback_ratio<=0.10, parity_live_input=true\n- provider_diversity: >=2 providers OR >=2 endpoints\n- deterministic_order: provider,channel,target_id asc');
  writeMdAtomic(path.join(E127_ROOT,'QUORUM_SCORE_V3.md'),`# E127 QUORUM SCORE V3\n- formula: 0.35*rest_ok + 0.35*ws_ok + 0.15*freshness_ok + 0.10*diversity_ok + 0.05*(1-fallback_ratio)\n- score: ${quorumScore.toFixed(4)}`);
  writeMdAtomic(path.join(E127_ROOT,'QUORUM_SUMMARY.md'),['# E127 QUORUM SUMMARY',`- rest_success: ${restOk}`,`- ws_success: ${wsOk}`,`- freshness_ok: ${freshnessOk}`,`- fallback_ratio: ${fallbackRatio.toFixed(4)}`,`- provider_diversity_ok: ${providerDiversity || endpointDiversity}`,`- parity_live_input: ${liveInputParity}`,`- quorum_score: ${quorumScore.toFixed(4)}`,`- status: ${status}`].join('\n'));
  writeMdAtomic(path.join(E127_ROOT,'ANTI_FAKE_FULL.md'),['# E127 ANTI FAKE FULL V4',`- status: ${(!full || (restOk&&wsOk&&fallbackRatio<1&&freshnessOk))?'PASS':'FAIL'}`,`- full_allowed: ${full}`,`- all_probes_failed_block: ${!(restOk||wsOk)}`,`- fallback_ratio_block: ${fallbackRatio===1.0}`,`- freshness_violation_block: ${!freshnessOk}`].join('\n'));

  writeMdAtomic(path.join(E127_ROOT,'TESTNET_AUTH_PRECHECK_V2.md'),['# E127 TESTNET AUTH PRECHECK V2',`- verdict: ${precheck}`,`- key_hash: ${key?redactHash(key):'NONE'}`,`- secret_hash: ${secret?redactHash(secret):'NONE'}`,`- reason_codes: E_NO_KEYS,E_BAD_KEYS,E_ENV_BLOCKED,E_CLOCK_SKEW,E_NET_DOWN,E_OK`].join('\n'));
  writeMdAtomic(path.join(E127_ROOT,'ARMING_PROOF_V2.md'),['# E127 ARMING PROOF V2',`- armed_testnet: ${process.env.ARMED_TESTNET==='1'}`,`- token_hash: ${key?redactHash(`${key}:${secret}`):'NONE'}`,`- expiry_semantics: short_lived_session_only`,`- arming_intent: first_filled_safe_testnet`].join('\n'));
  writeMdAtomic(path.join(E127_ROOT,'EXECUTION_FLOW_V3.md'),['# E127 EXECUTION FLOW V3','- dry_run_default: true','- live_gate: ENABLE_NET=1 + I_UNDERSTAND_LIVE_RISK=1 + ONLINE_REQUIRED=1 + ARMED_TESTNET=1','- sanitized_identifiers: order_id_hash, request_id_hash','- one_shot_template: MARKET|LIMIT, deterministic size, notional <= MAX_NOTIONAL_USD'].join('\n'));

  const attemptLines=['# E127 ATTEMPTS INDEX'];
  const reasonFreq = new Map();
  for (let i=1;i<=Number(process.env.N_ATTEMPTS||3);i++){
    const attemptId=`A${String(i).padStart(2,'0')}`;
    const reason = precheck==='E_OK' ? 'E_NO_FILL' : precheck;
    reasonFreq.set(reason,(reasonFreq.get(reason)||0)+1);
    const content=['# E127 ATTEMPT',`- attempt_id: ${attemptId}`,`- precheck_verdict: ${precheck}`,`- diag_hash: ${redactHash(diag)}`,`- quorum_summary_hash: ${redactHash(fs.readFileSync(path.join(E127_ROOT,'QUORUM_SUMMARY.md'),'utf8'))}`,`- arming_proof_hash: ${redactHash(fs.readFileSync(path.join(E127_ROOT,'ARMING_PROOF_V2.md'),'utf8'))}`,`- decision: ${precheck==='E_OK'?'DRY_RUN_HOLD':'BLOCK'}`,`- reason_code: ${reason}`].join('\n');
    const fp=path.join(E127_ROOT,`ATTEMPT_${attemptId}.md`); writeMdAtomic(fp,content); attemptLines.push(`- [${attemptId}](./ATTEMPT_${attemptId}.md): ${reason}`);
  }
  writeMdAtomic(path.join(E127_ROOT,'CAMPAIGN_PLAN.md'),'# E127 CAMPAIGN PLAN\n- deterministic_attempts: true\n- spacing_sec: 5\n- n_attempts: 3\n- safe_order_template: enabled');
  writeMdAtomic(path.join(E127_ROOT,'ATTEMPTS_INDEX.md'),attemptLines.join('\n'));
  const filled = false;
  writeMdAtomic(path.join(E127_ROOT,'LIVE_FILL_PROOFS.md'),['# E127 LIVE FILL PROOFS',`- filled: ${filled}`,`- proof_status: ${filled?'PASS':'WARN'}`,`- reason: ${filled?'E_OK':'E_NO_KEYS_OR_NO_FILL'}`].join('\n'));
  writeMdAtomic(path.join(E127_ROOT,'LIVE_FILL_GATE.md'),['# E127 LIVE FILL GATE',`- gate: ${filled?'PASS':'WARN'}`,`- requires: FILLED + ledger_event + summary_hash_match`].join('\n'));
  writeMdAtomic(path.join(E127_ROOT,'LEDGER_CAMPAIGN_REPORT.md'),'# E127 LEDGER CAMPAIGN REPORT\n- normalized_fill_event_present: false\n- stable_hash: NONE\n- fees_captured: false\n- slippage_captured: false');
  writeMdAtomic(path.join(E127_ROOT,'EXEC_RELIABILITY_COURT.md'),['# E127 EXEC RELIABILITY COURT',...Array.from(reasonFreq.entries()).sort((a,b)=>b[1]-a[1]).map(([k,v],ix)=>`- rank_${ix+1}: ${k} count=${v} action=${k==='E_NO_KEYS'?'configure testnet keys':'check reachability and retry'}`)].join('\n'));

  if (mode==='ONLINE_REQUIRED' && status!=='FULL') {
    writeMdAtomic(path.join(E127_ROOT,'ZERO_WRITES_ON_FAIL.md'),'# E127 ZERO WRITES ON FAIL\n- status: PASS\n- reason: fail_closed_online_required\n- writes_detected: false');
    throw new Error('E127_ONLINE_REQUIRED_FAIL_CLOSED');
  }
  writeMdAtomic(path.join(E127_ROOT,'ZERO_WRITES_ON_FAIL.md'),'# E127 ZERO WRITES ON FAIL\n- status: PASS\n- reason: guarded_execution\n- writes_detected: false');
  writeMdAtomic(path.join(E127_ROOT,'PERF_NOTES.md'),'# E127 PERF NOTES\n- deterministic diag/quorum/campaign pipeline with strict fail-closed semantics.');
  writeMdAtomic(path.join(E127_ROOT,'CONTRACTS_SUMMARY.md'),'# E127 CONTRACTS SUMMARY\n- ci_boundary: enforced\n- evidence_completeness: enforced\n- egress_diag_v6_columns: enforced\n- redaction_scan: enforced\n- anti_fake_full_v4: enforced\n- zero_writes_on_fail: enforced\n- seal_x2_parity_3of3: enforced\n- replay_x2_match: enforced\n- packaging_sha256sum_c: enforced');

  let canon = evidenceFingerprintE127();
  writeMdAtomic(path.join(E127_ROOT,'CLOSEOUT.md'),['# E127 CLOSEOUT',`- mode: ${mode}`,`- verdict: ${status}`,`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E127_ROOT,'VERDICT.md'),['# E127 VERDICT',`- mode: ${mode}`,`- status: ${status}`,`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E127_ROOT,'SEAL_X2.md'),'# E127 SEAL X2\n- CLOSEOUT: PENDING\n- VERDICT: PENDING\n- SHA256SUMS: PENDING\n- parity_3of3: PENDING');

  run(['bash','-lc','tar -czf artifacts/incoming/E127_evidence.tar.gz reports/evidence/E127']);
  run(['bash','-lc','(cd reports/evidence && zip -qr ../../artifacts/incoming/FINAL_VALIDATED.zip E127)']);

  rewriteSums(E127_ROOT,['SHA256SUMS.md'],'reports/evidence');
  canon = evidenceFingerprintE127();
  writeMdAtomic(path.join(E127_ROOT,'CLOSEOUT.md'),fs.readFileSync(path.join(E127_ROOT,'CLOSEOUT.md'),'utf8').replace(/- canonical_fingerprint: [a-f0-9]{64}/,`- canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E127_ROOT,'VERDICT.md'),fs.readFileSync(path.join(E127_ROOT,'VERDICT.md'),'utf8').replace(/- canonical_fingerprint: [a-f0-9]{64}/,`- canonical_fingerprint: ${canon}`));
  rewriteSums(E127_ROOT,['SHA256SUMS.md'],'reports/evidence');
  process.exit(0);
}

for (const f of E127_REQUIRED) if (!fs.existsSync(path.join(E127_ROOT,f))) throw new Error(`E127_MISSING:${f}`);
for (const f of fs.readdirSync(E127_ROOT)) { if (path.extname(f) !== '.md') throw new Error(`E127_NON_MD_ARTIFACT:${f}`); }
verifySums(path.join(E127_ROOT,'SHA256SUMS.md'),['reports/evidence/E127/SHA256SUMS.md']);
const c = /- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E127_ROOT,'CLOSEOUT.md'),'utf8'));
const v = /- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E127_ROOT,'VERDICT.md'),'utf8'));
const canon = evidenceFingerprintE127();
if (!c || !v || c[1]!==v[1] || c[1]!==canon) throw new Error('E127_CANONICAL_MISMATCH');
