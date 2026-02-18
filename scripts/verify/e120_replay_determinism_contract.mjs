#!/usr/bin/env node
import fs from 'node:fs';
const t = fs.readFileSync('reports/evidence/E120/REPLAY_X2.md', 'utf8');
if (!/- verdict: MATCH/.test(t)) throw new Error('E120_REPLAY_DETERMINISM_FAIL');
