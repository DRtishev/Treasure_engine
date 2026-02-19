import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E134_ROOT = path.resolve('reports/evidence/E134');
export const E134_REQUIRED = [
  'PREFLIGHT.md','NODE_INSTALL.md','NODE_TRUTH_POLICY.md','BASELINE_VERIFY.md','PROXY_DISPATCHER.md','EGRESS_DIAG_V10.md','TRANSPORT_STAGE_MATRIX.md','PROXY_BREAKOUT_MATRIX.md','OPERATOR_REACHABILITY_RUNBOOK.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md'
];
export const E134_TARGETS = [
  { scenario:'direct', target:'https://api.binance.com/api/v3/time', channel:'REST' },
  { scenario:'direct', target:'wss://stream.binance.com:443/ws/btcusdt@trade', channel:'WS' },
  { scenario:'proxy', target:'https://api-testnet.bybit.com/v5/market/time', channel:'REST' },
  { scenario:'proxy', target:'wss://stream-testnet.bybit.com/v5/public/linear', channel:'WS' }
];

export function modeE134(){ const m=['OFFLINE_ONLY','ONLINE_OPTIONAL','ONLINE_REQUIRED'].filter((k)=>process.env[k]==='1'); if(m.length>1) throw new Error(`E134_MODE_CONFLICT:${m.join(',')}`); return m[0]||'OFFLINE_ONLY'; }
export function isCITruthy(){ const ci=String(process.env.CI||''); return ci==='true'||ci==='1'; }
export function runDirE134(){ return path.resolve(process.env.TREASURE_RUN_DIR || '.run/treasure/E134_1700000000'); }
export function atomicWrite(p,b){ fs.mkdirSync(path.dirname(p),{recursive:true}); const t=`${p}.tmp-${process.pid}-${Date.now()}`; fs.writeFileSync(t,b,'utf8'); fs.renameSync(t,p); }
export function writeMdAtomic(p,t){ atomicWrite(p,`${String(t).replace(/\r\n/g,'\n').replace(/\s+$/gm,'').trimEnd()}\n`); }
export function cmdOut(c,a){ return spawnSync(c,a,{encoding:'utf8'}).stdout.trim(); }
export function enforceCIBoundaryE134(){ if(!isCITruthy()) return; for(const [k,vRaw] of Object.entries(process.env)){ const v=String(vRaw||'').trim(); if(!v) continue; if(k.startsWith('UPDATE_')||k==='ENABLE_NET'||k.startsWith('ONLINE_')||k==='I_UNDERSTAND_LIVE_RISK'||k==='FORCE_NET_DOWN') throw new Error(`E134_CI_FORBIDDEN_ENV:${k}`);} }
export function snapshotState(paths){ return sha256Text(paths.map((p)=>{ const a=path.resolve(p); if(!fs.existsSync(a)) return `${p}:ABSENT`; const st=fs.statSync(a); if(st.isFile()) return `${p}:FILE:${sha256File(a)}`; return `${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`; }).join('\n')); }
export function evidenceFingerprintE134(){ const ignore=new Set(['CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md']); return sha256Text(E134_REQUIRED.filter((f)=>!ignore.has(f)).map((f)=>{ const full=path.join(E134_ROOT,f); return `${f}:${fs.existsSync(full)?sha256File(full):'ABSENT'}`; }).join('\n')); }
