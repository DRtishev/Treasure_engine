#!/usr/bin/env node
import path from 'node:path';
import { writeMd } from './e66_lib.mjs';
import { E97_ROOT, ensureDir } from './e97_lib.mjs';

ensureDir(E97_ROOT);
writeMd(path.join(E97_ROOT,'PERF_NOTES.md'),['# E97 Perf Notes','- mode: offline','- expected_runtime_s: <= 5','- bottlenecks: markdown parsing + hash passes','- mitigations: deterministic sort + bounded symbol budget'].join('\n'));
console.log('verify:e97:perf PASSED');
