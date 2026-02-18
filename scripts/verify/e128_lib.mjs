import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E128_ROOT = path.resolve('reports/evidence/E128');
export const E128_REQUIRED = [
  'PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','EGRESS_DIAG_V7.md','TIME_SYNC.md','TRANSPORT_MATRIX.md',
  'QUORUM_POLICY_V3.md','QUORUM_SCORE_V4.md','QUORUM_SUMMARY.md','ANTI_FAKE_FULL.md','TESTNET_AUTH_PRECHECK_V3.md',
  'ARMING_PROOF_V3.md','EXECUTION_FLOW_V4.md','CAMPAIGN_PLAN.md','ATTEMPTS_INDEX.md','LIVE_FILL_PROOF.md','LIVE_FILL_GATE.md',
  'LEDGER_CAMPAIGN_REPORT.md','EXEC_RELIABILITY_COURT.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md'
];

export function runDirE128(){ return path.resolve(process.env.TREASURE_RUN_DIR || '.run/treasure/E128_1700000000'); }
export function isCITruthy(){ const ci=String(process.env.CI||''); return ci==='true'||ci==='1'; }
export function modeE128(){ const m=['OFFLINE_ONLY','ONLINE_OPTIONAL','ONLINE_REQUIRED'].filter((k)=>process.env[k]==='1'); if(m.length>1) throw new Error(`E128_MODE_CONFLICT:${m.join(',')}`); return m[0]||'OFFLINE_ONLY'; }
export function atomicWrite(p,b){ fs.mkdirSync(path.dirname(p),{recursive:true}); const t=`${p}.tmp-${process.pid}-${Date.now()}`; const fd=fs.openSync(t,'w',0o644); try{fs.writeFileSync(fd,b,'utf8'); fs.fsyncSync(fd);} finally{fs.closeSync(fd);} fs.renameSync(t,p); }
export function writeMdAtomic(p,t){ atomicWrite(p,`${String(t).replace(/\r\n/g,'\n').replace(/\s+$/gm,'').trimEnd()}\n`); }
export function cmdOut(c,a){ return spawnSync(c,a,{encoding:'utf8'}).stdout.trim(); }
export function redactHash(v){ return v?sha256Text(String(v)):'NONE'; }

export function enforceCIBoundaryE128(){
  if(!isCITruthy()) return;
  for(const [k,vRaw] of Object.entries(process.env)){
    const v=String(vRaw||'').trim(); if(!v) continue;
    if(k.startsWith('UPDATE_')||k==='ENABLE_NET'||k.startsWith('ONLINE_')||k.startsWith('WS_')||k.startsWith('ARMED_')||k.startsWith('LIVE_')||k==='I_UNDERSTAND_LIVE_RISK') throw new Error(`E128_CI_FORBIDDEN_ENV:${k}`);
  }
}

export function snapshotState(paths){
  return sha256Text(paths.map((p)=>{ const a=path.resolve(p); if(!fs.existsSync(a)) return `${p}:ABSENT`; const st=fs.statSync(a); if(st.isFile()) return `${p}:FILE:${sha256File(a)}`; return `${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`; }).join('\n'));
}

export function evidenceFingerprintE128(){
  return sha256Text(E128_REQUIRED.filter((f)=>!['CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md'].includes(f)).map((f)=>{ const full=path.join(E128_ROOT,f); return `${f}:${fs.existsSync(full)?sha256File(full):'ABSENT'}`; }).join('\n'));
}
