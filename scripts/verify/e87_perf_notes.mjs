#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E87_ROOT, ensureDir } from './e87_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const mode=String(process.env.CHAIN_MODE||(process.env.CI==='true'?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FAST','FAST_PLUS','FULL'].includes(mode)) throw new Error('CHAIN_MODE must be FAST|FAST_PLUS|FULL');
const update=process.env.UPDATE_E87_EVIDENCE==='1';
const body=['# E87 PERF NOTES',`- chain_mode: ${mode}`,'- ci_mode_target: FAST_PLUS','- doctrine: skip duplicate heavy work in CI by reusing deterministic evidence hashes','- quiet_mode: QUIET=1 affects logs only; fingerprints exclude QUIET','- heavy_work_rules: FULL runs prior epoch verify, FAST_PLUS uses pack parity checks, FAST limits to local contracts'].join('\n');
ensureDir(E87_ROOT);
if(update&&process.env.CI!=='true') writeMd(path.join(E87_ROOT,'PERF_NOTES.md'),body);
if(!update&&!fs.existsSync(path.join(E87_ROOT,'PERF_NOTES.md'))) throw new Error('missing PERF_NOTES.md');
console.log('verify:e87:perf:notes PASSED');
