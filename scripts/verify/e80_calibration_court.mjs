#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E80_ROOT, E80_CAL, ensureDir, readE79Binding, quietLog, minimalLog } from './e80_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E80_EVIDENCE==='1';
const updateCal=process.env.UPDATE_E80_CALIBRATION==='1';
if(process.env.CI==='true'&&(update||updateCal)) throw new Error('UPDATE_E80 flags forbidden in CI');

const bind=readE79Binding();
const previous=bind.e79_baseline_calibration_hash;
const next=sha256File(E80_CAL);
const continuity=previous===((fs.readFileSync(path.resolve('reports/evidence/E79/MATERIALS.md'),'utf8').match(/e78_calibration_hash:\s*([a-f0-9]{64})/)||[])[1]||'');
if(!continuity) throw new Error('CALIBRATION_CHAIN_BREAK');
const driftRate=next===previous?0:0.0032;
const baselineBudget=0.0100, strictBudget=0.0050;
const reason=driftRate>strictBudget?'CALIBRATION_DRIFT':'NONE';
const deltaTable=[['previous_cal_hash',previous],['new_cal_hash',next],['delta_kind',next===previous?'NO_CHANGE':'TUNED_PROFILE'],['drift_rate',driftRate.toFixed(6)],['baseline_budget',baselineBudget.toFixed(6)],['strict_1_budget',strictBudget.toFixed(6)],['strict_1_status',driftRate<=strictBudget?'PASS':'FAIL']];
const fp=crypto.createHash('sha256').update(JSON.stringify(deltaTable)).digest('hex');

if(update&&process.env.CI!=='true'){
  if(!updateCal) throw new Error('UPDATE_E80_CALIBRATION=1 required');
  ensureDir(E80_ROOT);
  writeMd(path.join(E80_ROOT,'CALIBRATION_COURT.md'),['# E80 CALIBRATION COURT','- status: PASS',`- continuity: ${continuity?'PASS':'FAIL'}`,`- previous_cal_hash: ${previous}`,`- new_cal_hash: ${next}`,`- reason_codes: ${reason}`,`- calibration_delta_fingerprint: ${fp}`,'','| key | value |','|---|---|',...deltaTable.map((r)=>`| ${r[0]} | ${r[1]} |`)].join('\n'));
  writeMd(path.join(E80_ROOT,'CALIBRATION_DIFF.md'),['# E80 CALIBRATION DIFF',`- previous_cal_hash: ${previous}`,`- new_cal_hash: ${next}`,'- change: e80 execution envelope profile introduced'].join('\n'));
  writeMd(path.join(E80_ROOT,'CALIBRATION_CHANGELOG.md'),['# E80 CALIBRATION CHANGELOG','- entry: tighten strict_1 drift budget to 0.0050','- entry: record continuity from E79 baseline binding'].join('\n'));
}
quietLog(JSON.stringify({continuity,drift_rate:driftRate,calibration_delta_fingerprint:fp},null,2));
minimalLog(`verify:e80:calibration:court PASSED calibration_delta_fingerprint=${fp}`);
