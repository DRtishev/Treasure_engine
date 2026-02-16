#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E95_ROOT=path.resolve('reports/evidence/E95');
export const E95_LOCK_PATH=path.resolve('.foundation-seal/E95_KILL_LOCK.md');
export const FIX_REASON=path.resolve('core/edge/state/fixtures/e95_reason_history_adverse_fixture.md');
export const FIX_CADENCE=path.resolve('core/edge/state/fixtures/e95_cadence_adverse_fixture.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function minimalLog(msg){console.log(msg);}
export function fmt4(n){return Number(n).toFixed(4);} 
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath)) return '';const m=fs.readFileSync(filePath,'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);return m?m[1]:'';}

export function anchorsE95(){
  const maybe=(p)=>fs.existsSync(path.resolve(p));
  const hashOrAbsent=(p)=>maybe(p)?sha256File(path.resolve(p)):'ABSENT';
  const readCanon=(p)=>{if(!maybe(p)) return 'ABSENT';const m=fs.readFileSync(path.resolve(p),'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);return m?m[1]:'ABSENT';};
  return {
    e94_canonical_fingerprint:readCanon('reports/evidence/E94/CLOSEOUT.md'),
    reason_history_fingerprint:hashOrAbsent('core/edge/state/reason_history_state.md'),
    cadence_ledger_fingerprint:hashOrAbsent('core/edge/state/cadence_ledger_state.md'),
    readiness_policy_hash:hashOrAbsent('core/edge/contracts/e95_readiness_thresholds.md'),
    fixture_reason_hash:hashOrAbsent(FIX_REASON),
    fixture_cadence_hash:hashOrAbsent(FIX_CADENCE)
  };
}

export function parseFixtureReason(){
  const t=fs.readFileSync(FIX_REASON,'utf8');
  return [...t.matchAll(/^\|\s([^|]+)\s\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9]+)\s\|\s([0-9]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([^|]+)\s\|$/gm)]
    .map((m)=>({case_id:m[1].trim(),symbol:m[2].trim(),days_observed:Number(m[3]),rejects_count:Number(m[4]),holds_count:Number(m[5]),parks_count:Number(m[6]),variance_proxy:Number(m[7]),expected_decision:m[8].trim()}));
}

export function parseFixtureCadence(){
  const t=fs.readFileSync(FIX_CADENCE,'utf8');
  return [...t.matchAll(/^\|\s([^|]+)\s\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([a-f0-9]{64})\s\|$/gm)]
    .map((m)=>({case_id:m[1].trim(),symbol:m[2].trim(),days_observed:Number(m[3]),sentinel:m[4].trim(),windows:m[5].trim(),cadence_digest:m[6]}));
}

export function readSumsCoreTextE95(){
  const p=path.join(E95_ROOT,'SHA256SUMS.md'); if(!fs.existsSync(p)) return '';
  const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
  const lines=raw.split('\n').filter((line)=>{if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;return !line.endsWith(' reports/evidence/E95/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E95/VERDICT.md')&&!line.endsWith(' reports/evidence/E95/SHA256SUMS.md');});
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}
export function rewriteSumsE95(){const lines=fs.readdirSync(E95_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E95_ROOT,f))}  reports/evidence/E95/${f}`);writeMd(path.join(E95_ROOT,'SHA256SUMS.md'),`# E95 SHA256SUMS\n\n${lines.join('\n')}`);}
export function verifySumsE95(){const raw=fs.readFileSync(path.join(E95_ROOT,'SHA256SUMS.md'),'utf8');if(/\sreports\/evidence\/E95\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));const mdFiles=fs.readdirSync(E95_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').map((f)=>`reports/evidence/E95/${f}`);for(const rel of mdFiles) if(!rows.find((r)=>r.endsWith(`  ${rel}`))) throw new Error(`missing sha row ${rel}`);for(const line of rows){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);} }
export function evidenceFingerprintE95(){const req=['PREFLIGHT.md','FIXTURE_SNAPSHOT.md','ADVERSE_SUITE.md','ADVERSE_ASSERTIONS.md','RUNS_ADVERSE_X2.md','PERF_NOTES.md'];if(req.some((f)=>!fs.existsSync(path.join(E95_ROOT,f)))) return '';const chunks=[`## ANCHORS\n${JSON.stringify(anchorsE95())}\n`];for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E95_ROOT,f),'utf8')}`);if(fs.existsSync(path.join(E95_ROOT,'REAL_STATE_PROMOTION.md'))) chunks.push(`## REAL_STATE_PROMOTION.md\n${fs.readFileSync(path.join(E95_ROOT,'REAL_STATE_PROMOTION.md'),'utf8')}`);if(fs.existsSync(path.join(E95_ROOT,'REAL_STATE_ASSERTIONS.md'))) chunks.push(`## REAL_STATE_ASSERTIONS.md\n${fs.readFileSync(path.join(E95_ROOT,'REAL_STATE_ASSERTIONS.md'),'utf8')}`);chunks.push(`## SUMS_CORE\n${readSumsCoreTextE95()}`);return sha256Text(chunks.join('\n'));}
