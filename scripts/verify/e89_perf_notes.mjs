#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E89_ROOT, ensureDir } from './e89_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const mode=String(process.env.CHAIN_MODE||(process.env.CI==='true'?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FAST','FAST_PLUS','FULL'].includes(mode)) throw new Error('CHAIN_MODE must be FAST|FAST_PLUS|FULL');
const update=process.env.UPDATE_E89_EVIDENCE==='1';
const body=['# E89 PERF NOTES',`- chain_mode: ${mode}`,'- ci_mode_target: FAST_PLUS','- heavy_work: fixture court compute path only; no network operations','- quiet_mode: QUIET excluded from fingerprint inputs'].join('\n');
ensureDir(E89_ROOT);
if(update&&process.env.CI!=='true') writeMd(path.join(E89_ROOT,'PERF_NOTES.md'),body);
if(!update&&!fs.existsSync(path.join(E89_ROOT,'PERF_NOTES.md'))) throw new Error('missing PERF_NOTES.md');
console.log('verify:e89:perf:notes PASSED');
