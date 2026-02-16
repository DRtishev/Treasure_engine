#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E88_ROOT=path.resolve('reports/evidence/E88');
export const E88_LOCK_PATH=path.resolve('.foundation-seal/E88_KILL_LOCK.md');
export const E88_STATE_PATH=path.resolve('core/edge/state/reason_history_state.md');
export const E88_POLICY_PATH=path.resolve('core/edge/contracts/e88_park_aging_policy.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function minimalLog(msg){console.log(msg);}
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath)) return '';const m=fs.readFileSync(filePath,'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);return m?m[1]:'';}
export function demoDailySentinel(){const p=path.resolve('reports/evidence/E86/EXEC_RECON_DEMO_DAILY.md');if(!fs.existsSync(p)) return 'DEMO_DAILY=ABSENT';return `DEMO_DAILY=SHA256:${sha256File(p)}`;}
export function readSumsCoreTextE88(){const p=path.join(E88_ROOT,'SHA256SUMS.md');if(!fs.existsSync(p)) return '';const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');const lines=raw.split('\n').filter((line)=>{if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;return !line.endsWith(' reports/evidence/E88/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E88/VERDICT.md')&&!line.endsWith(' reports/evidence/E88/SHA256SUMS.md');});return `${lines.join('\n').replace(/\s+$/g,'')}\n`;}
export function rewriteSumsE88(){const lines=fs.readdirSync(E88_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E88_ROOT,f))}  reports/evidence/E88/${f}`);writeMd(path.join(E88_ROOT,'SHA256SUMS.md'),`# E88 SHA256SUMS\n\n${lines.join('\n')}`);}
export function verifySumsE88(){const raw=fs.readFileSync(path.join(E88_ROOT,'SHA256SUMS.md'),'utf8');if(/\sreports\/evidence\/E88\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));const mdFiles=fs.readdirSync(E88_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').map((f)=>`reports/evidence/E88/${f}`);for(const rel of mdFiles) if(!rows.find((r)=>r.endsWith(`  ${rel}`))) throw new Error(`missing sha row ${rel}`);for(const line of rows){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);}}

export function readAnchorBundle(){
  return {
    recon_fingerprint:(fs.readFileSync(path.resolve('reports/evidence/E84/EXEC_RECON_OBSERVED_MULTI.md'),'utf8').match(/recon_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'',
    demo_daily_sentinel:demoDailySentinel(),
    calibration_hash:(fs.readFileSync(path.resolve('reports/evidence/E82/CALIBRATION_COURT.md'),'utf8').match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'',
    threshold_policy_hash:sha256File(path.resolve('core/edge/contracts/e86_threshold_policy.md')),
    canary_stage_policy_hash:sha256File(path.resolve('core/edge/contracts/e86_canary_stage_policy.md')),
    shortlist_fingerprint:(fs.readFileSync(path.resolve('reports/evidence/E80/EDGE_SHORTLIST.md'),'utf8').match(/shortlist_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'',
    profit_ledger_fingerprint:(fs.readFileSync(path.resolve('reports/evidence/E84/PROFIT_LEDGER.md'),'utf8').match(/ledger_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'',
    reason_history_fingerprint:sha256File(E88_STATE_PATH)
  };
}

export function evidenceFingerprintE88(){
  const req=['PREFLIGHT.md','REASON_HISTORY_SNAPSHOT.md','PARK_AGING_COURT.md','PARK_AGING_DIFF.md','RUNS_APPLY_X2.md','PERF_NOTES.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E88_ROOT,f)))) return '';
  const chunks=[`## ANCHORS\n${JSON.stringify(readAnchorBundle())}\n`,`## REASON_HISTORY_STATE\n${fs.readFileSync(E88_STATE_PATH,'utf8')}`];
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E88_ROOT,f),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE88()}`);
  return sha256Text(chunks.join('\n'));
}
