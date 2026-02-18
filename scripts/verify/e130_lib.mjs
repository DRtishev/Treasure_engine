import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { sha256File, sha256Text } from './e66_lib.mjs';
export const E130_ROOT=path.resolve('reports/evidence/E130');
export const E130_REQUIRED=['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','TRANSPORT_MATRIX.md','TIME_SYNC_V3.md','OPERATOR_REMEDIATION_V2.md','QUORUM_POLICY_V5.md','QUORUM_SCORE_V6.md','ANTI_FAKE_FULL.md','CAMPAIGN_PLAN.md','ATTEMPTS_INDEX.md','LIVE_FILL_PROOF.md','LIVE_FILL_GATE.md','LEDGER_CAMPAIGN_REPORT.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md','CODEX_REPORT.md'];
export const E130_TARGETS=[
 {provider:'BINANCE',channel:'REST',endpoint:'https://api.binance.com/api/v3/time'},
 {provider:'BINANCE',channel:'WS',endpoint:'wss://stream.binance.com:443/ws/btcusdt@trade'},
 {provider:'BYBIT',channel:'REST',endpoint:'https://api-testnet.bybit.com/v5/market/time'},
 {provider:'BYBIT',channel:'WS',endpoint:'wss://stream-testnet.bybit.com/v5/public/linear'},
 {provider:'KRAKEN',channel:'REST',endpoint:'https://api.kraken.com/0/public/Time'},
 {provider:'KRAKEN',channel:'WS',endpoint:'wss://ws.kraken.com'}
];
export function runDirE130(){return path.resolve(process.env.TREASURE_RUN_DIR||'.run/treasure/E130_1700000000');}
export function isCITruthy(){const ci=String(process.env.CI||''); return ci==='true'||ci==='1';}
export function modeE130(){const m=['OFFLINE_ONLY','ONLINE_OPTIONAL','ONLINE_REQUIRED'].filter((k)=>process.env[k]==='1'); if(m.length>1) throw new Error(`E130_MODE_CONFLICT:${m.join(',')}`); return m[0]||'OFFLINE_ONLY';}
export function atomicWrite(p,b){fs.mkdirSync(path.dirname(p),{recursive:true}); const t=`${p}.tmp-${process.pid}-${Date.now()}`; const fd=fs.openSync(t,'w',0o644); try{fs.writeFileSync(fd,b,'utf8'); fs.fsyncSync(fd);} finally{fs.closeSync(fd);} fs.renameSync(t,p);} export function writeMdAtomic(p,t){atomicWrite(p,`${String(t).replace(/\r\n/g,'\n').replace(/\s+$/gm,'').trimEnd()}\n`);} export function cmdOut(c,a){return spawnSync(c,a,{encoding:'utf8'}).stdout.trim();} export function redactHash(v){return v?sha256Text(String(v)):'NONE';}
export function enforceCIBoundaryE130(){if(!isCITruthy()) return; for(const [k,vRaw] of Object.entries(process.env)){const v=String(vRaw||'').trim(); if(!v) continue; if(k.startsWith('UPDATE_')||k==='ENABLE_NET'||k.startsWith('ONLINE_')||k.startsWith('WS_')||k==='I_UNDERSTAND_LIVE_RISK'||k==='ARM_LIVE'||k==='TESTNET') throw new Error(`E130_CI_FORBIDDEN_ENV:${k}`);}}
export function snapshotState(paths){return sha256Text(paths.map((p)=>{const a=path.resolve(p); if(!fs.existsSync(a)) return `${p}:ABSENT`; const st=fs.statSync(a); if(st.isFile()) return `${p}:FILE:${sha256File(a)}`; return `${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`;}).join('\n'));}
export function evidenceFingerprintE130(){return sha256Text(E130_REQUIRED.filter((f)=>!['CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md'].includes(f)).map((f)=>{const full=path.join(E130_ROOT,f); return `${f}:${fs.existsSync(full)?sha256File(full):'ABSENT'}`;}).join('\n'));}
