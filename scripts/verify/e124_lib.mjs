import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';
export const E124_ROOT=path.resolve('reports/evidence/E124');
export function runDirE124(){return path.resolve(process.env.TREASURE_RUN_DIR||'.run/treasure/E124_1700000000');}
export function isCITruthy(){const ci=String(process.env.CI||''); return ci==='true'||ci==='1';}
export function modeE124(){const m=['OFFLINE_ONLY','ONLINE_OPTIONAL','ONLINE_REQUIRED'].filter(k=>process.env[k]==='1'); if(m.length>1) throw new Error(`E124_MODE_CONFLICT:${m.join(',')}`); return m[0]||'OFFLINE_ONLY';}
export function atomicWrite(p,b){fs.mkdirSync(path.dirname(p),{recursive:true}); const t=`${p}.tmp-${process.pid}-${Date.now()}`; const fd=fs.openSync(t,'w',0o644); try{fs.writeFileSync(fd,b,'utf8'); fs.fsyncSync(fd);} finally{fs.closeSync(fd);} fs.renameSync(t,p);}
export function writeMdAtomic(p,t){atomicWrite(p,`${String(t).replace(/\r\n/g,'\n').replace(/\s+$/gm,'').trimEnd()}\n`);}
export function cmdOut(cmd,args){return spawnSync(cmd,args,{encoding:'utf8'}).stdout.trim();}
export function enforceCIBoundaryE124(){if(!isCITruthy()) return; for(const [k,vRaw] of Object.entries(process.env)){const v=String(vRaw||'').trim(); if(!v) continue; if(k.startsWith('UPDATE_')||k==='ENABLE_NET'||k.startsWith('ONLINE_')||k.startsWith('LIVE_')||k.startsWith('WS_')||k.startsWith('ARM_')||k.startsWith('CONFIRM_')||k==='I_UNDERSTAND_LIVE_RISK') throw new Error(`E124_CI_FORBIDDEN_ENV:${k}`);}}
export function snapshotState(paths){return sha256Text(paths.map((p)=>{const a=path.resolve(p); if(!fs.existsSync(a)) return `${p}:ABSENT`; const st=fs.statSync(a); if(st.isFile()) return `${p}:FILE:${sha256File(a)}`; return `${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`;}).join('\n'));}
export function evidenceFingerprintE124(){const files=['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','CAMPAIGN_PLAN.md','ATTEMPTS_INDEX.md','LIVE_SAFETY_V2.md','CONNECTIVITY_DIAG_V3.md','QUORUM_SCORE_V2.md','LIVE_FILL_PROOFS.md','LEDGER_CAMPAIGN_REPORT.md','ANTI_FAKE_FULL.md','ZERO_WRITES_ON_FAIL.md','REPLAY_X2.md','CODEX_REPORT.md'];
const att=fs.existsSync(E124_ROOT)?fs.readdirSync(E124_ROOT).filter(f=>/^ATTEMPT_.*\.md$/.test(f)).sort():[];
return sha256Text([...files,...att].map(f=>`${f}:${fs.existsSync(path.join(E124_ROOT,f))?sha256File(path.join(E124_ROOT,f)):'ABSENT'}`).join('\n'));}
