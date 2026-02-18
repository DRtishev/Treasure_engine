import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E114_ROOT = path.resolve('reports/evidence/E114');

export function isCITruthy() { const ci=String(process.env.CI||''); return ci==='true'||ci==='1'; }
export function modeE114() {
  const m=['OFFLINE_ONLY','ONLINE_OPTIONAL','ONLINE_REQUIRED'].filter(k=>process.env[k]==='1');
  if (m.length>1) throw new Error(`E114_MODE_CONFLICT:${m.join(',')}`);
  return m[0]||'ONLINE_OPTIONAL';
}
export function enforceCIBoundaryE114() {
  if (!isCITruthy()) return;
  for (const k of Object.keys(process.env)) {
    const v=String(process.env[k]||'').trim(); if(!v) continue;
    if (k.startsWith('UPDATE_')||k.startsWith('ONLINE_')||k.includes('LIVE_RISK')||k==='ENABLE_NET'||k==='FORCE_NET_DOWN') throw new Error(`E114_CI_FORBIDDEN_ENV:${k}`);
  }
}
export function assertNetGateE114() {
  if (isCITruthy()) throw new Error('E114_NET_BLOCKED_CI');
  if (process.env.ENABLE_NET!=='1'||process.env.I_UNDERSTAND_LIVE_RISK!=='1') throw new Error('E114_NET_GUARD_BLOCKED');
}
export function stampE114(){ return `E114_${process.env.SOURCE_DATE_EPOCH||'1700000000'}`; }
export function runDirE114(){ return path.resolve(process.env.TREASURE_RUN_DIR||path.join('.foundation-seal','runs',stampE114())); }
export function pinDirE114(){ return path.resolve(path.join('.foundation-seal','capsules',stampE114())); }
export function latestPin(){ const b=path.resolve('.foundation-seal/capsules'); if(!fs.existsSync(b)) return null; const d=fs.readdirSync(b).filter(x=>/^E11[34]_\d+$/.test(x)).sort(); return d.length?path.join(b,d[d.length-1]):null; }

export function atomicWrite(p, body){ fs.mkdirSync(path.dirname(p),{recursive:true}); const t=`${p}.tmp-${process.pid}-${Date.now()}`; const fd=fs.openSync(t,'w',0o644); try{fs.writeFileSync(fd,body,'utf8'); fs.fsyncSync(fd);} finally{fs.closeSync(fd);} fs.renameSync(t,p); }
export function writeMdAtomic(p,t){ atomicWrite(p,`${t.replace(/\r\n/g,'\n').replace(/\s+$/gm,'').trimEnd()}\n`); }

export function snapshotState(paths){ const rows=[]; for(const p of paths){ const f=path.resolve(p); if(!fs.existsSync(f)){rows.push(`${p}:ABSENT`); continue;} const st=fs.statSync(f); if(st.isFile()) rows.push(`${p}:FILE:${sha256File(f)}`); else rows.push(`${p}:DIR:${sha256Text(fs.readdirSync(f).sort().join('|'))}`);} return sha256Text(rows.join('\n')); }

export function evidenceFingerprintE114(){
  const core=['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','NET_PROOF.md','PROVIDERS.md','PROVIDER_PARITY.md','REALITY_FUEL.md','CAPSULE_MANIFEST.md','PROMOTION_REPORT.md','DATA_QUORUM_V5.md','GRADUATION_REALISM_GATE.md','REPLAY_BUNDLE.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md'];
  const parts=[]; for(const f of core){ const p=path.join(E114_ROOT,f); if(fs.existsSync(p)) parts.push(`${f}:${sha256File(p)}`); }
  return sha256Text(parts.join('\n'));
}
export function anchorsE114(){
  const canon=(p)=>{ if(!fs.existsSync(path.resolve(p))) return 'ABSENT'; const t=fs.readFileSync(path.resolve(p),'utf8'); const m=t.match(/canonical_fingerprint:\s*([a-f0-9]{64})/); return m?m[1]:'NOT_FOUND'; };
  return { e113_canonical_fingerprint: canon('reports/evidence/E113/CLOSEOUT.md'), e114_run_hash: fs.existsSync('scripts/verify/e114_run.mjs')?sha256File('scripts/verify/e114_run.mjs'):'ABSENT' };
}
export function cmdOut(c,a){ return spawnSync(c,a,{encoding:'utf8'}).stdout.trim(); }
