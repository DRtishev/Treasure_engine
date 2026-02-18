import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E115_ROOT = path.resolve('reports/evidence/E115');
export const INPUT_BINDING_PATH = path.resolve('.foundation-seal/E115_INPUT_BINDING.json');

export function isCITruthy(){ const ci=String(process.env.CI||''); return ci==='true'||ci==='1'; }
export function modeE115(){ const m=['OFFLINE_ONLY','ONLINE_OPTIONAL','ONLINE_REQUIRED'].filter(k=>process.env[k]==='1'); if(m.length>1) throw new Error(`E115_MODE_CONFLICT:${m.join(',')}`); return m[0]||'ONLINE_OPTIONAL'; }
export function enforceCIBoundaryE115(){ if(!isCITruthy()) return; for(const k of Object.keys(process.env)){ const v=String(process.env[k]||'').trim(); if(!v) continue; if(k.startsWith('UPDATE_')||k.startsWith('ONLINE_')||k.startsWith('LIVE_')||k.includes('RISK')||k==='ENABLE_NET'||k==='FORCE_NET_DOWN') throw new Error(`E115_CI_FORBIDDEN_ENV:${k}`);} }
export function assertNetGateE115(){ if(isCITruthy()) throw new Error('E115_NET_BLOCKED_CI'); if(process.env.ENABLE_NET!=='1'||process.env.I_UNDERSTAND_LIVE_RISK!=='1') throw new Error('E115_NET_GUARD_BLOCKED'); }
export function stampE115(){ return `E115_${process.env.SOURCE_DATE_EPOCH||'1700000000'}`; }
export function runDirE115(){ return path.resolve(process.env.TREASURE_RUN_DIR||path.join('.foundation-seal','runs',stampE115())); }
export function pinDirE115(){ return path.resolve(path.join('.foundation-seal','capsules',stampE115())); }
export function latestPin(){ const b=path.resolve('.foundation-seal/capsules'); if(!fs.existsSync(b)) return null; const ds=fs.readdirSync(b).filter(d=>/^E11[345]_\d+$/.test(d)).sort(); return ds.length?path.join(b,ds[ds.length-1]):null; }
export function atomicWrite(p, body){ fs.mkdirSync(path.dirname(p),{recursive:true}); const t=`${p}.tmp-${process.pid}-${Date.now()}`; const fd=fs.openSync(t,'w',0o644); try{fs.writeFileSync(fd,body,'utf8'); fs.fsyncSync(fd);} finally{fs.closeSync(fd);} fs.renameSync(t,p); }
export function writeMdAtomic(p,t){ atomicWrite(p, `${t.replace(/\r\n/g,'\n').replace(/\s+$/gm,'').trimEnd()}\n`); }
export function snapshotState(paths){ const rows=[]; for(const p of paths){ const f=path.resolve(p); if(!fs.existsSync(f)){rows.push(`${p}:ABSENT`); continue;} const st=fs.statSync(f); if(st.isFile()) rows.push(`${p}:FILE:${sha256File(f)}`); else rows.push(`${p}:DIR:${sha256Text(fs.readdirSync(f).sort().join('|'))}`);} return sha256Text(rows.join('\n')); }

export function readInputBinding(){ if(!fs.existsSync(INPUT_BINDING_PATH)) return null; return JSON.parse(fs.readFileSync(INPUT_BINDING_PATH,'utf8')); }
export function writeInputBinding(binding){ atomicWrite(INPUT_BINDING_PATH, `${JSON.stringify(binding,null,2)}\n`); }

export function evidenceFingerprintE115(){ const core=['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','PROVIDERS.md','PROVIDER_FIXTURES.md','BINANCE_WSS.md','WSS_REPLAY_X2.md','INPUT_BINDING.md','SNAPSHOT_INTEGRITY.md','NET_FULLNESS.md','ZERO_WRITES_ON_FAIL.md','REPLAY_X2.md']; const parts=[]; for(const f of core){ const p=path.join(E115_ROOT,f); if(fs.existsSync(p)) parts.push(`${f}:${sha256File(p)}`); } return sha256Text(parts.join('\n')); }
export function anchorsE115(){ const canon=(p)=>{ if(!fs.existsSync(path.resolve(p))) return 'ABSENT'; const t=fs.readFileSync(path.resolve(p),'utf8'); const m=t.match(/canonical_fingerprint:\s*([a-f0-9]{64})/); return m?m[1]:'NOT_FOUND';}; return { e114_canonical_fingerprint: canon('reports/evidence/E114/CLOSEOUT.md'), e115_run_hash: fs.existsSync('scripts/verify/e115_run.mjs')?sha256File('scripts/verify/e115_run.mjs'):'ABSENT' }; }
export function cmdOut(c,a){ return spawnSync(c,a,{encoding:'utf8'}).stdout.trim(); }
