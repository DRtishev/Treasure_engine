#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E71_ROOT = path.resolve('reports/evidence/E71');
export const E71_LOCK_PATH = path.resolve('.foundation-seal/E71_KILL_LOCK.md');

export function ensureDir(p){ fs.mkdirSync(p,{recursive:true}); }
export function defaultNormalizedEnv(){ return { TZ:'UTC', LANG:'C', LC_ALL:'C', SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000', SEED:String(process.env.SEED||'12345')}; }
export function readCanonicalFingerprintFromMd(filePath){ if(!fs.existsSync(filePath)) return ''; const m=fs.readFileSync(filePath,'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i); return m?m[1]:''; }

export function readE70Bindings(){
  const closeout=path.resolve('reports/evidence/E70/CLOSEOUT.md');
  const verdict=path.resolve('reports/evidence/E70/VERDICT.md');
  const materials=path.resolve('reports/evidence/E70/MATERIALS.md');
  const a=readCanonicalFingerprintFromMd(closeout); const b=readCanonicalFingerprintFromMd(verdict);
  if(!a||!b||a!==b) throw new Error('E70 canonical mismatch');
  const mat=fs.readFileSync(materials,'utf8');
  const chainBundle=(mat.match(/chain_bundle_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  if(!chainBundle) throw new Error('E70 chain_bundle_fingerprint missing');
  return { e70_canonical_fingerprint:a, chain_bundle_fingerprint:chainBundle };
}

export function readSumsCoreTextE71(){
  const sums=path.join(E71_ROOT,'SHA256SUMS.md');
  if(!fs.existsSync(sums)) return '';
  const raw=fs.readFileSync(sums,'utf8').replace(/\r\n/g,'\n');
  const lines=raw.split('\n').filter((line)=>{
    if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    if(line.endsWith(' reports/evidence/E71/CLOSEOUT.md')) return false;
    if(line.endsWith(' reports/evidence/E71/VERDICT.md')) return false;
    if(line.endsWith(' reports/evidence/E71/SHA256SUMS.md')) return false;
    return true;
  });
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}

export function evidenceFingerprintE71(){
  const required=['MATERIALS.md','WOW_LIBRARY.md','EDGE_META.md','RUNS_EDGE_META_X2.md'];
  if(required.some((f)=>!fs.existsSync(path.join(E71_ROOT,f)))) return '';
  const materials=fs.readFileSync(path.join(E71_ROOT,'MATERIALS.md'),'utf8');
  const runs=fs.readFileSync(path.join(E71_ROOT,'RUNS_EDGE_META_X2.md'),'utf8');
  const wow=(materials.match(/wow_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const edge=(materials.match(/edge_meta_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const chain=(materials.match(/chain_bundle_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const run1=(runs.match(/run1_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const run2=(runs.match(/run2_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const det=(runs.match(/deterministic_match:\s*(true|false)/)||[])[1]||'false';
  if(!wow||!edge||!chain||!run1||!run2) return '';
  return sha256Text([
    `## E70_BINDINGS\n${JSON.stringify(readE70Bindings())}\n`,
    `## SCALARS\nwow=${wow}\nedge=${edge}\nchain=${chain}\nrun1=${run1}\nrun2=${run2}\ndeterministic_match=${det}\n`,
    `## MATERIALS\n${materials}`,
    `## WOW_LIBRARY\n${fs.readFileSync(path.join(E71_ROOT,'WOW_LIBRARY.md'),'utf8')}`,
    `## EDGE_META\n${fs.readFileSync(path.join(E71_ROOT,'EDGE_META.md'),'utf8')}`,
    `## SUMS_CORE\n${readSumsCoreTextE71()}`
  ].join('\n'));
}

export function materialsHashesE71(){
  const files=[
    'docs/wow/WOW_LEDGER.md','docs/wow/tricks','core/edge/alpha/edge_magic_meta_suite_v1.mjs','scripts/verify/e71_wow_verify.mjs','scripts/verify/e71_lib.mjs','scripts/verify/e71_edge_metamorphic_x2.mjs','scripts/verify/e71_evidence.mjs','scripts/verify/e71_run.mjs','package-lock.json'
  ];
  const rows=[];
  for(const f of files){
    const abs=path.resolve(f);
    if(!fs.existsSync(abs)) continue;
    if(fs.statSync(abs).isDirectory()){
      const nested=fs.readdirSync(abs).filter((x)=>x.endsWith('.md')).sort();
      for(const n of nested){ const a=path.join(abs,n); rows.push({file:path.relative(process.cwd(),a).split(path.sep).join('/'),sha256:sha256File(a)}); }
    } else rows.push({file:f,sha256:sha256File(abs)});
  }
  return rows.sort((a,b)=>a.file.localeCompare(b.file));
}

export function rewriteSumsE71(){
  const lines=fs.readdirSync(E71_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>{const abs=path.join(E71_ROOT,f);const rel=path.relative(process.cwd(),abs).split(path.sep).join('/');return `${sha256File(abs)}  ${rel}`;});
  writeMd(path.join(E71_ROOT,'SHA256SUMS.md'),`# E71 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsRowsE71(){
  const raw=fs.readFileSync(path.join(E71_ROOT,'SHA256SUMS.md'),'utf8');
  if(!/\sreports\/evidence\/E71\/CLOSEOUT\.md$/m.test(raw)||!/\sreports\/evidence\/E71\/VERDICT\.md$/m.test(raw)) throw new Error('SHA rows missing closeout/verdict');
  if(/\sreports\/evidence\/E71\/SHA256SUMS\.md$/m.test(raw)) throw new Error('self-row forbidden');
  for(const line of raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x))){ const [hash,rel]=line.split(/\s{2}/); if(sha256File(path.resolve(rel))!==hash) throw new Error(`sha mismatch ${rel}`); }
}
