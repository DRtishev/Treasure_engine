#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E89_ROOT=path.resolve('reports/evidence/E89');
export const E89_FIXTURE=path.resolve('core/edge/state/fixtures/e89_reason_history_fixture.md');
export const E89_LOCK_PATH=path.resolve('.foundation-seal/E89_KILL_LOCK.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function minimalLog(msg){console.log(msg);}
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath)) return '';const m=fs.readFileSync(filePath,'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);return m?m[1]:'';}
export function readSumsCoreTextE89(){const p=path.join(E89_ROOT,'SHA256SUMS.md');if(!fs.existsSync(p)) return '';const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');const lines=raw.split('\n').filter((line)=>{if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;return !line.endsWith(' reports/evidence/E89/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E89/VERDICT.md')&&!line.endsWith(' reports/evidence/E89/SHA256SUMS.md');});return `${lines.join('\n').replace(/\s+$/g,'')}\n`;}
export function rewriteSumsE89(){const lines=fs.readdirSync(E89_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E89_ROOT,f))}  reports/evidence/E89/${f}`);writeMd(path.join(E89_ROOT,'SHA256SUMS.md'),`# E89 SHA256SUMS\n\n${lines.join('\n')}`);}
export function verifySumsE89(){const raw=fs.readFileSync(path.join(E89_ROOT,'SHA256SUMS.md'),'utf8');if(/\sreports\/evidence\/E89\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));const mdFiles=fs.readdirSync(E89_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').map((f)=>`reports/evidence/E89/${f}`);for(const rel of mdFiles) if(!rows.find((r)=>r.endsWith(`  ${rel}`))) throw new Error(`missing sha row ${rel}`);for(const line of rows){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);}}
export function evidenceFingerprintE89(){
  const req=['PREFLIGHT.md','FIXTURE_STATE_SNAPSHOT.md','PARK_AGING_FIXTURE_COURT.md','ASSERTIONS.md','RUNS_FIXTURE_COURT_X2.md','PERF_NOTES.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E89_ROOT,f)))) return '';
  const chunks=[`## FIXTURE\n${fs.readFileSync(E89_FIXTURE,'utf8')}`];
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E89_ROOT,f),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE89()}`);
  return sha256Text(chunks.join('\n'));
}
