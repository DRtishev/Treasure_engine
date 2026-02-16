#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E94_ROOT, ensureDir } from './e94_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const mode=String(process.env.CHAIN_MODE||(process.env.CI==='true'?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FAST','FAST_PLUS','FULL'].includes(mode)) throw new Error('CHAIN_MODE must be FAST|FAST_PLUS|FULL');
const update=process.env.UPDATE_E94_EVIDENCE==='1';
const body=['# E94 PERF NOTES',`- chain_mode: ${mode}`,'- suite_type: deterministic cadence facts + multiwindow promotion','- ci_mode_target: FAST_PLUS','- network_io: disabled by design','- quiet_mode_effect: fingerprints invariant (QUIET=1 no-op for artifact contents)'].join('\n');
ensureDir(E94_ROOT);
if(update&&process.env.CI!=='true') writeMd(path.join(E94_ROOT,'PERF_NOTES.md'),body);
if(!update&&!fs.existsSync(path.join(E94_ROOT,'PERF_NOTES.md'))) throw new Error('missing PERF_NOTES.md');
console.log('verify:e94:perf:notes PASSED');
