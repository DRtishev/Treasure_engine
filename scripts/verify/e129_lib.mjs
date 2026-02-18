import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E129_ROOT = path.resolve('reports/evidence/E129');
export const E129_REQUIRED = [
  'PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','EGRESS_DIAG_V8.md','TIME_SYNC_V2.md','OPERATOR_REMEDIATION.md',
  'PROVIDER_MATRIX.md','PROVIDER_COMPAT.md','LOOPBACK_PROOF.md','QUORUM_POLICY_V4.md','QUORUM_SCORE_V5.md','ANTI_FAKE_FULL.md','ZERO_WRITES_ON_FAIL.md',
  'CAMPAIGN_PLAN.md','ATTEMPTS_INDEX.md','LIVE_FILL_PROOF.md','LIVE_FILL_GATE.md','LEDGER_CAMPAIGN_REPORT.md','EXEC_RELIABILITY_COURT.md',
  'CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md','CODEX_REPORT.md'
];

export const targets = [
  {provider:'BINANCE',channel:'REST',endpoint:'https://api.binance.com/api/v3/time',symbol:'BTCUSDT',timeframe:'1m'},
  {provider:'BINANCE',channel:'WS',endpoint:'wss://stream.binance.com:9443/ws/btcusdt@trade',symbol:'BTCUSDT',timeframe:'1m'},
  {provider:'BYBIT',channel:'REST',endpoint:'https://api-testnet.bybit.com/v5/market/time',symbol:'BTCUSDT',timeframe:'1m'},
  {provider:'BYBIT',channel:'WS',endpoint:'wss://stream-testnet.bybit.com/v5/public/linear',symbol:'BTCUSDT',timeframe:'1m'},
  {provider:'KRAKEN',channel:'REST',endpoint:'https://api.kraken.com/0/public/Time',symbol:'XBTUSD',timeframe:'1m'},
  {provider:'KRAKEN',channel:'WS',endpoint:'wss://ws.kraken.com',symbol:'XBTUSD',timeframe:'1m'}
];

export function runDirE129(){return path.resolve(process.env.TREASURE_RUN_DIR||'.run/treasure/E129_1700000000');}
export function isCITruthy(){const ci=String(process.env.CI||''); return ci==='true'||ci==='1';}
export function modeE129(){const m=['OFFLINE_ONLY','ONLINE_OPTIONAL','ONLINE_REQUIRED'].filter((k)=>process.env[k]==='1'); if(m.length>1) throw new Error(`E129_MODE_CONFLICT:${m.join(',')}`); return m[0]||'OFFLINE_ONLY';}
export function atomicWrite(p,b){fs.mkdirSync(path.dirname(p),{recursive:true}); const t=`${p}.tmp-${process.pid}-${Date.now()}`; const fd=fs.openSync(t,'w',0o644); try{fs.writeFileSync(fd,b,'utf8'); fs.fsyncSync(fd);} finally{fs.closeSync(fd);} fs.renameSync(t,p);}
export function writeMdAtomic(p,t){atomicWrite(p,`${String(t).replace(/\r\n/g,'\n').replace(/\s+$/gm,'').trimEnd()}\n`);} export function cmdOut(c,a){return spawnSync(c,a,{encoding:'utf8'}).stdout.trim();}
export function redactHash(v){return v?sha256Text(String(v)):'NONE';}
export function enforceCIBoundaryE129(){ if(!isCITruthy()) return; for(const [k,vRaw] of Object.entries(process.env)){const v=String(vRaw||'').trim(); if(!v) continue; if(k.startsWith('UPDATE_')||k==='ENABLE_NET'||k.startsWith('ONLINE_')||k.startsWith('WS_')||k.startsWith('ARMED_')||k.startsWith('LIVE_')||k==='I_UNDERSTAND_LIVE_RISK'||k==='ARM_LIVE'||k==='TESTNET_ONLY') throw new Error(`E129_CI_FORBIDDEN_ENV:${k}`);} }
export function snapshotState(paths){return sha256Text(paths.map((p)=>{const a=path.resolve(p); if(!fs.existsSync(a)) return `${p}:ABSENT`; const st=fs.statSync(a); if(st.isFile()) return `${p}:FILE:${sha256File(a)}`; return `${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`;}).join('\n'));}
export function evidenceFingerprintE129(){return sha256Text(E129_REQUIRED.filter((f)=>!['CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md'].includes(f)).map((f)=>{const full=path.join(E129_ROOT,f); return `${f}:${fs.existsSync(full)?sha256File(full):'ABSENT'}`;}).join('\n'));}
