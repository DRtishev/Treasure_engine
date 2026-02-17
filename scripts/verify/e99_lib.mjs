#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E99_ROOT = path.resolve('reports/evidence/E99');
export const E99_LOCK_PATH = path.resolve('.foundation-seal/E99_KILL_LOCK.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function minimalLog(msg){console.log(msg);}

// CI truthiness hardening - treat both "true" and "1" as truthy
export function isCIMode(){
  const ci=String(process.env.CI||'');
  return ci==='true'||ci==='1';
}

export function readCanonicalFingerprintFromMd(filePath){
  if(!fs.existsSync(filePath)) return '';
  const m=fs.readFileSync(filePath,'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);
  return m?m[1]:'';
}

export function anchorsE99(){
  const hashOrAbsent=(p)=>fs.existsSync(path.resolve(p))?sha256File(path.resolve(p)):'ABSENT';
  const readCanon=(p)=>{
    if(!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const m=fs.readFileSync(path.resolve(p),'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m?m[1]:'ABSENT';
  };
  return {
    e98_canonical_fingerprint: readCanon('reports/evidence/E98/CLOSEOUT.md'),
    e97_canonical_fingerprint: readCanon('reports/evidence/E97/CLOSEOUT.md'),
    e97_overlay_hash: hashOrAbsent('core/edge/contracts/e97_envelope_tuning_overlay.md'),
    pre_apply_e97_fingerprint: readCanon('reports/evidence/E99/PRE_APPLY_E97_SNAPSHOT.md'),
    post_apply_e97_fingerprint: readCanon('reports/evidence/E99/POST_APPLY_E97_SNAPSHOT.md')
  };
}

export function readSumsCoreTextE99(){
  const p=path.join(E99_ROOT,'SHA256SUMS.md');
  if(!fs.existsSync(p)) return '';
  const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
  const lines=raw.split('\n').filter((line)=>{
    if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    return !line.endsWith(' reports/evidence/E99/CLOSEOUT.md')&&
           !line.endsWith(' reports/evidence/E99/VERDICT.md')&&
           !line.endsWith(' reports/evidence/E99/SHA256SUMS.md');
  });
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}

export function rewriteSumsE99(){
  const lines=fs.readdirSync(E99_ROOT)
    .filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md')
    .sort()
    .map((f)=>`${sha256File(path.join(E99_ROOT,f))}  reports/evidence/E99/${f}`);
  writeMd(path.join(E99_ROOT,'SHA256SUMS.md'),`# E99 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsE99(){
  const raw=fs.readFileSync(path.join(E99_ROOT,'SHA256SUMS.md'),'utf8');
  if(/\sreports\/evidence\/E99\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');
  const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));
  const mdFiles=fs.readdirSync(E99_ROOT)
    .filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md')
    .map((f)=>`reports/evidence/E99/${f}`);
  for(const rel of mdFiles)
    if(!rows.find((r)=>r.endsWith(`  ${rel}`)))
      throw new Error(`missing sha row ${rel}`);
  for(const line of rows){
    const [h,rel]=line.split(/\s{2}/);
    if(sha256File(path.resolve(rel))!==h)
      throw new Error(`sha mismatch ${rel}`);
  }
}

export function evidenceFingerprintE99(){
  const req=[
    'PREFLIGHT.md',
    'APPLY_REHEARSAL.md',
    'RUNS_APPLY_REHEARSAL_X2.md',
    'POST_APPLY_STABILITY.md',
    'POST_APPLY_ASSERTIONS.md',
    'CONTRACTS_SUMMARY.md',
    'PERF_NOTES.md'
  ];
  if(req.some((f)=>!fs.existsSync(path.join(E99_ROOT,f)))) return '';
  const chunks=[`## ANCHORS\n${JSON.stringify(anchorsE99())}\n`];
  for(const f of req)
    chunks.push(`## ${f}\n${fs.readFileSync(path.join(E99_ROOT,f),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE99()}`);
  return sha256Text(chunks.join('\n'));
}
