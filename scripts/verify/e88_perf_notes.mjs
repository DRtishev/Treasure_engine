#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E88_ROOT, ensureDir } from './e88_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const mode=String(process.env.CHAIN_MODE||(process.env.CI==='true'?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FAST','FAST_PLUS','FULL'].includes(mode)) throw new Error('CHAIN_MODE must be FAST|FAST_PLUS|FULL');
const update=process.env.UPDATE_E88_EVIDENCE==='1';
const body=['# E88 PERF NOTES',`- chain_mode: ${mode}`,'- ci_mode_target: FAST_PLUS','- heavy_work: park court is run once per verify; x2 uses in-memory digest replay','- quiet_mode: QUIET=1 excluded from fingerprint inputs','- deterministic_time_source: SOURCE_DATE_EPOCH and UTC day helpers'].join('\n');
ensureDir(E88_ROOT);
if(update&&process.env.CI!=='true') writeMd(path.join(E88_ROOT,'PERF_NOTES.md'),body);
if(!update&&!fs.existsSync(path.join(E88_ROOT,'PERF_NOTES.md'))) throw new Error('missing PERF_NOTES.md');
console.log('verify:e88:perf:notes PASSED');
