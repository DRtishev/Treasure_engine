#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E90_ROOT, ensureDir } from './e90_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const mode=String(process.env.CHAIN_MODE||(process.env.CI==='true'?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FAST','FAST_PLUS','FULL'].includes(mode)) throw new Error('CHAIN_MODE must be FAST|FAST_PLUS|FULL');
const update=process.env.UPDATE_E90_EVIDENCE==='1';
const body=['# E90 PERF NOTES',`- chain_mode: ${mode}`,'- suite_type: deterministic metamorphic + fixed UTC boundary fuzz','- ci_mode_target: FAST_PLUS','- network_io: disabled by design'].join('\n');
ensureDir(E90_ROOT);
if(update&&process.env.CI!=='true') writeMd(path.join(E90_ROOT,'PERF_NOTES.md'),body);
if(!update&&!fs.existsSync(path.join(E90_ROOT,'PERF_NOTES.md'))) throw new Error('missing PERF_NOTES.md');
console.log('verify:e90:perf:notes PASSED');
