#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeMd } from './e66_lib.mjs';
import { runE78ProfitSearch } from '../../core/edge/e78_profit_search.mjs';
import { E78_ROOT, ensureDir, defaultNormalizedEnv } from './e78_lib.mjs';

const update=process.env.UPDATE_E78_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E78_EVIDENCE forbidden in CI');

function once(label,seed){const temp=fs.mkdtempSync(path.join(os.tmpdir(),`e78-profit-${label}-`));const r=runE78ProfitSearch({seed});return{status:0,temp,fp:r.profit_search_fingerprint};}
const base=Number(process.env.SEED||defaultNormalizedEnv().SEED||'12345');
const s1=Number(process.env.E78_PROFIT_RUN1_SEED||base), s2=Number(process.env.E78_PROFIT_RUN2_SEED||base);
const r1=once('run1',s1), r2=once('run2',s2);
const det=r1.fp===r2.fp;
if(!det) throw new Error('profit_search_x2 mismatch');
if(update&&process.env.CI!=='true'){
  ensureDir(E78_ROOT);
  writeMd(path.join(E78_ROOT,'RUNS_EDGE_PROFIT_SEARCH_X2.md'),['# E78 RUNS EDGE PROFIT SEARCH X2',`- run1_seed: ${s1}`,`- run2_seed: ${s2}`,`- run1_fingerprint: ${r1.fp}`,`- run2_fingerprint: ${r2.fp}`,'- deterministic_match: true','- run1_root: <tmp-run1>','- run2_root: <tmp-run2>'].join('\n'));
}
console.log(`verify:edge:profit:search:x2 PASSED run_fingerprint=${r1.fp}`);
