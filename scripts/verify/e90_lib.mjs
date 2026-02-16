#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E90_ROOT=path.resolve('reports/evidence/E90');
export const E90_LOCK_PATH=path.resolve('.foundation-seal/E90_KILL_LOCK.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function minimalLog(msg){console.log(msg);}
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath)) return '';const m=fs.readFileSync(filePath,'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);return m?m[1]:'';}

export function anchorsE90(){
  const fixture='core/edge/state/fixtures/e89_reason_history_fixture.md';
  const e89Close='reports/evidence/E89/CLOSEOUT.md';
  const maybe=(p)=>fs.existsSync(path.resolve(p));
  const readCanon=(p)=>{if(!maybe(p)) return 'ABSENT';const m=fs.readFileSync(path.resolve(p),'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);return m?m[1]:'ABSENT';};
  return {
    fixture_fingerprint:maybe(fixture)?sha256File(path.resolve(fixture)):'ABSENT',
    park_policy_hash:maybe('core/edge/contracts/e88_park_aging_policy.md')?sha256File(path.resolve('core/edge/contracts/e88_park_aging_policy.md')):'ABSENT',
    threshold_policy_hash:maybe('core/edge/contracts/e86_threshold_policy.md')?sha256File(path.resolve('core/edge/contracts/e86_threshold_policy.md')):'ABSENT',
    canary_policy_hash:maybe('core/edge/contracts/e86_canary_stage_policy.md')?sha256File(path.resolve('core/edge/contracts/e86_canary_stage_policy.md')):'ABSENT',
    e89_canonical_fingerprint:readCanon(e89Close)
  };
}

export function readSumsCoreTextE90(){const p=path.join(E90_ROOT,'SHA256SUMS.md');if(!fs.existsSync(p)) return '';const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');const lines=raw.split('\n').filter((line)=>{if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;return !line.endsWith(' reports/evidence/E90/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E90/VERDICT.md')&&!line.endsWith(' reports/evidence/E90/SHA256SUMS.md');});return `${lines.join('\n').replace(/\s+$/g,'')}\n`;}
export function rewriteSumsE90(){const lines=fs.readdirSync(E90_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E90_ROOT,f))}  reports/evidence/E90/${f}`);writeMd(path.join(E90_ROOT,'SHA256SUMS.md'),`# E90 SHA256SUMS\n\n${lines.join('\n')}`);}
export function verifySumsE90(){const raw=fs.readFileSync(path.join(E90_ROOT,'SHA256SUMS.md'),'utf8');if(/\sreports\/evidence\/E90\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));const mdFiles=fs.readdirSync(E90_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').map((f)=>`reports/evidence/E90/${f}`);for(const rel of mdFiles) if(!rows.find((r)=>r.endsWith(`  ${rel}`))) throw new Error(`missing sha row ${rel}`);for(const line of rows){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);}}
export function evidenceFingerprintE90(){
  const req=['PREFLIGHT.md','METAMORPHIC_SUITE.md','METAMORPHIC_ASSERTIONS.md','DATE_BOUNDARY_FUZZ.md','RUNS_METAMORPHIC_X2.md','PERF_NOTES.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E90_ROOT,f)))) return '';
  const chunks=[`## ANCHORS\n${JSON.stringify(anchorsE90())}\n`];
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E90_ROOT,f),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE90()}`);
  return sha256Text(chunks.join('\n'));
}
