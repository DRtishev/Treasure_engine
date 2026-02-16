#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E91_ROOT, ensureDir } from './e91_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const mode=String(process.env.CHAIN_MODE||(process.env.CI==='true'?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FAST','FAST_PLUS','FULL'].includes(mode)) throw new Error('CHAIN_MODE must be FAST|FAST_PLUS|FULL');
const update=process.env.UPDATE_E91_EVIDENCE==='1';
const body=['# E91 PERF NOTES',`- chain_mode: ${mode}`,'- suite_type: deterministic sparsity metamorphic + operator chaos hardening','- ci_mode_target: FAST_PLUS','- network_io: disabled by design','- quiet_mode_effect: fingerprints invariant (QUIET=1 no-op for artifact contents)'].join('\n');
ensureDir(E91_ROOT);
if(update&&process.env.CI!=='true') writeMd(path.join(E91_ROOT,'PERF_NOTES.md'),body);
if(!update&&!fs.existsSync(path.join(E91_ROOT,'PERF_NOTES.md'))) throw new Error('missing PERF_NOTES.md');
console.log('verify:e91:perf:notes PASSED');
