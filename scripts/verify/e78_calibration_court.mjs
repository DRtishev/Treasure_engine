#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeMd } from './e66_lib.mjs';

const E78 = path.resolve('reports/evidence/E78');
const CAL = path.resolve('core/edge/calibration/e78_execution_envelope_calibration.md');
const E77_COURT = path.resolve('reports/evidence/E77/CALIBRATION_COURT.md');

function norm(t){return t.replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,'').trimEnd()+'\n';}
function h(p){return crypto.createHash('sha256').update(norm(fs.readFileSync(p,'utf8'))).digest('hex');}

function parseCal(raw){
  const prev=(raw.match(/- previous_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  const round=(raw.match(/- rounding_policy:\s*([A-Z_]+)/)||[])[1]||'';
  const migration=(raw.match(/- migration_notes:\s*(.+)/)||[])[1]||'';
  const syms=[...raw.matchAll(/^\|\s*([A-Z0-9]+USDT)\s*\|/gm)].map((m)=>m[1]).sort();
  return {prev,round,migration,syms};
}

export function evaluateE78CalibrationCourt(){
  const e77Hash=(fs.readFileSync(E77_COURT,'utf8').match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  if(!e77Hash) throw new Error('E77 calibration hash missing');
  const raw=fs.readFileSync(CAL,'utf8');
  const p=parseCal(raw);
  const newHash=h(CAL);
  const reasons=[];
  if(!p.prev) reasons.push('CALIBRATION_CHAIN_BREAK');
  if(p.prev!==e77Hash) reasons.push('CALIBRATION_CHAIN_BREAK');
  if(p.round!=='HALF_UP') reasons.push('ROUNDING_POLICY_CHANGED');
  if(p.syms.length<3) reasons.push('SYMBOL_TABLE_CHANGED_MATERIAL');
  if(reasons.includes('ROUNDING_POLICY_CHANGED') && (!p.migration||p.migration==='N/A')) reasons.push('FAIL_MIGRATION_NOTES_REQUIRED');
  const status=reasons.some((x)=>x.startsWith('FAIL_')||x==='CALIBRATION_CHAIN_BREAK')?'FAIL':'PASS';
  return {status,e77_cal_hash:e77Hash,previous_cal_hash:p.prev,new_cal_hash:newHash,reasons:[...new Set(reasons.length?reasons:['NONE'])],symbols:p.syms};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const update=process.env.UPDATE_E78_EVIDENCE==='1';
  const updateCal=process.env.UPDATE_E78_CALIBRATION==='1';
  if(process.env.CI==='true'&&(update||updateCal)) throw new Error('UPDATE_E78 flags forbidden in CI');
  const r=evaluateE78CalibrationCourt();
  if(update&&process.env.CI!=='true'){
    if(!updateCal) throw new Error('UPDATE_E78_CALIBRATION=1 required');
    fs.mkdirSync(E78,{recursive:true});
    writeMd(path.join(E78,'CALIBRATION_COURT.md'),['# E78 CALIBRATION COURT',`- status: ${r.status}`,`- e77_calibration_hash: ${r.e77_cal_hash}`,`- previous_cal_hash: ${r.previous_cal_hash||'N/A'}`,`- new_cal_hash: ${r.new_cal_hash}`,`- reason_codes: ${r.reasons.join(', ')}`].join('\n'));
    writeMd(path.join(E78,'CALIBRATION_DIFF.md'),['# E78 CALIBRATION DIFF',`- previous_cal_hash: ${r.previous_cal_hash||'N/A'}`,`- new_cal_hash: ${r.new_cal_hash}`,'- deterministic_diff_summary:',`  - symbols: ${r.symbols.join(', ')}`,`  - reason_codes: ${r.reasons.join(', ')}`].join('\n'));
    writeMd(path.join(E78,'CALIBRATION_CHANGELOG.md'),['# E78 CALIBRATION CHANGELOG','- entry: e78-cal-v1 chained to E77 baseline',`- e77_calibration_hash: ${r.e77_cal_hash}`,`- hash: ${r.new_cal_hash}`].join('\n'));
  }
  if(r.status!=='PASS') throw new Error(`e78 calibration court failed: ${r.reasons.join(',')}`);
  console.log(`verify:e78:calibration:court PASSED hash=${r.new_cal_hash}`);
}
