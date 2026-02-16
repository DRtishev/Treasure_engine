#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E96_ROOT=path.resolve('reports/evidence/E96');
export const E96_LOCK_PATH=path.resolve('.foundation-seal/E96_KILL_LOCK.md');
export const E96_REASON_FIX=path.resolve('core/edge/state/fixtures/e96_reason_history_fuzz_fixture.md');
export const E96_CAD_FIX=path.resolve('core/edge/state/fixtures/e96_cadence_fuzz_fixture.md');
export const E96_POL=path.resolve('core/edge/contracts/e96_risk_envelopes.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function minimalLog(msg){console.log(msg);} 
export function fmt4(n){return Number(n).toFixed(4);} 
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath)) return '';const m=fs.readFileSync(filePath,'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);return m?m[1]:'';}

export function anchorsE96(){
  const maybe=(p)=>fs.existsSync(path.resolve(p));
  const hashOrAbsent=(p)=>maybe(p)?sha256File(path.resolve(p)):'ABSENT';
  const readCanon=(p)=>{if(!maybe(p)) return 'ABSENT';const m=fs.readFileSync(path.resolve(p),'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);return m?m[1]:'ABSENT';};
  return {
    e95_canonical_fingerprint:readCanon('reports/evidence/E95/CLOSEOUT.md'),
    reason_history_fingerprint:hashOrAbsent('core/edge/state/reason_history_state.md'),
    cadence_ledger_fingerprint:hashOrAbsent('core/edge/state/cadence_ledger_state.md'),
    e96_policy_hash:hashOrAbsent(E96_POL),
    e96_reason_fixture_hash:hashOrAbsent(E96_REASON_FIX),
    e96_cadence_fixture_hash:hashOrAbsent(E96_CAD_FIX)
  };
}

export function parseReasonFix(){const t=fs.readFileSync(E96_REASON_FIX,'utf8');return [...t.matchAll(/^\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|$/gm)].map((m)=>({case_id:m[1].trim(),symbol:m[2].trim(),tier:m[3].trim(),days_observed:Number(m[4]),reject_rate:Number(m[5]),hold_rate:Number(m[6]),park_rate:Number(m[7]),variance:Number(m[8]),active_park:m[9].trim()==='true',expected:m[10].trim()}));}
export function parseCadFix(){const t=fs.readFileSync(E96_CAD_FIX,'utf8');return [...t.matchAll(/^\|\s([^|]+)\s\|\s([^|]+)\s\|\s(\d{4}-\d{2}-\d{2})\s\|\s(\d{4}-\d{2}-\d{2})\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([a-f0-9]{64})\s\|$/gm)].map((m)=>({case_id:m[1].trim(),symbol:m[2].trim(),date_start_utc:m[3],date_end_utc:m[4],windows:m[5].trim(),cadence_pattern:m[6].trim(),digest:m[7]}));}
export function parseTierPolicy(){const t=fs.readFileSync(E96_POL,'utf8');const tiers=new Map([...t.matchAll(/^\|\s(T[0-3])\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|$/gm)].map((m)=>[m[1],{min_days:Number(m[2]),reject_max:Number(m[3]),hold_max:Number(m[4]),park_max:Number(m[5]),var_max:Number(m[6])}]));const ov=new Map([...t.matchAll(/^\|\s([A-Z]+)\s\|\s(T[0-3])\s\|$/gm)].map((m)=>[m[1],m[2]]));const def=(t.match(/- default_tier:\s*(T[0-3])/)||[])[1]||'T1';return {tiers,ov,def};}

export function readSumsCoreTextE96(){const p=path.join(E96_ROOT,'SHA256SUMS.md');if(!fs.existsSync(p)) return '';const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');const lines=raw.split('\n').filter((line)=>{if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;return !line.endsWith(' reports/evidence/E96/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E96/VERDICT.md')&&!line.endsWith(' reports/evidence/E96/SHA256SUMS.md');});return `${lines.join('\n').replace(/\s+$/g,'')}\n`;}
export function rewriteSumsE96(){const lines=fs.readdirSync(E96_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E96_ROOT,f))}  reports/evidence/E96/${f}`);writeMd(path.join(E96_ROOT,'SHA256SUMS.md'),`# E96 SHA256SUMS\n\n${lines.join('\n')}`);}
export function verifySumsE96(){const raw=fs.readFileSync(path.join(E96_ROOT,'SHA256SUMS.md'),'utf8');if(/\sreports\/evidence\/E96\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));const mdFiles=fs.readdirSync(E96_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').map((f)=>`reports/evidence/E96/${f}`);for(const rel of mdFiles) if(!rows.find((r)=>r.endsWith(`  ${rel}`))) throw new Error(`missing sha row ${rel}`);for(const line of rows){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);} }
export function evidenceFingerprintE96(){const req=['PREFLIGHT.md','FIXTURE_SNAPSHOT.md','ADVERSARIAL_SUITE.md','ADVERSARIAL_ASSERTIONS.md','RUNS_ADVERSARIAL_X2.md','INVARIANT_FUZZ.md','INVARIANT_ASSERTIONS.md','RUNS_FUZZ_X2.md','PERF_NOTES.md'];if(req.some((f)=>!fs.existsSync(path.join(E96_ROOT,f)))) return '';const chunks=[`## ANCHORS\n${JSON.stringify(anchorsE96())}\n`];for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E96_ROOT,f),'utf8')}`);if(fs.existsSync(path.join(E96_ROOT,'REAL_STATE_TIERED_PROMOTION.md'))) chunks.push(`## REAL_STATE_TIERED_PROMOTION.md\n${fs.readFileSync(path.join(E96_ROOT,'REAL_STATE_TIERED_PROMOTION.md'),'utf8')}`);if(fs.existsSync(path.join(E96_ROOT,'REAL_STATE_ASSERTIONS.md'))) chunks.push(`## REAL_STATE_ASSERTIONS.md\n${fs.readFileSync(path.join(E96_ROOT,'REAL_STATE_ASSERTIONS.md'),'utf8')}`);chunks.push(`## SUMS_CORE\n${readSumsCoreTextE96()}`);return sha256Text(chunks.join('\n'));}
