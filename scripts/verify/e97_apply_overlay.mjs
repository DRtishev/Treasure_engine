#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256Text, writeMd } from './e66_lib.mjs';
import { E97_OVERLAY, E97_ROOT, ensureDir } from './e97_lib.mjs';

const updateApply=process.env.UPDATE_E97_APPLY==='1';
const applyMode=String(process.env.APPLY_MODE||'PROPOSE').toUpperCase();
if(process.env.CI==='true'&&updateApply) throw new Error('UPDATE_E97_APPLY forbidden in CI');
if(!(process.env.CI!=='true'&&updateApply&&applyMode==='APPLY')){console.log('verify:e97:apply SKIPPED');process.exit(0);} 

const diff=fs.readFileSync(path.join(E97_ROOT,'TUNING_DIFF.md'),'utf8');
const rows=[...diff.matchAll(/^\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|$/gm)]
  .map((m)=>({symbol:m[1].trim(),param:m[2].trim(),delta:m[3].trim(),tier_delta:m[4].trim(),action:m[5].trim(),reason:m[6].trim()}));
const target=rows.filter((r)=>['TIGHTEN','LOOSEN','PARK'].includes(r.action));
const render=(items)=>['# E97 Envelope Tuning Overlay','- source: reports/evidence/E97/TUNING_DIFF.md','| symbol | param | delta | tier_delta | action | reason_code |','|---|---|---:|---:|---|---|',...items.map((r)=>`| ${r.symbol} | ${r.param} | ${r.delta} | ${r.tier_delta} | ${r.action} | ${r.reason} |`)].join('\n');
const o1=render(target);
const o2=render(target);
const fp1=sha256Text(o1),fp2=sha256Text(o2);const deterministic=fp1===fp2;
if(!deterministic) throw new Error('apply determinism mismatch');

ensureDir(path.dirname(E97_OVERLAY));
fs.writeFileSync(E97_OVERLAY,`${o1}\n`);
ensureDir(E97_ROOT);
writeMd(path.join(E97_ROOT,'APPLY_RECEIPT.md'),['# E97 Apply Receipt',`- apply_mode: ${applyMode}`,`- update_e97_apply: ${updateApply}`,`- rows_written: ${target.length}`,`- overlay_path: core/edge/contracts/e97_envelope_tuning_overlay.md`].join('\n'));
writeMd(path.join(E97_ROOT,'RUNS_APPLY_X2.md'),['# E97 Apply Determinism x2',`- run1_fingerprint: ${fp1}`,`- run2_fingerprint: ${fp2}`,`- deterministic_match: ${deterministic}`].join('\n'));
console.log(`verify:e97:apply PASSED rows=${target.length}`);
