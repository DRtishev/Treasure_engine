#!/usr/bin/env node
import fs from 'node:fs';
const t = fs.readFileSync('reports/evidence/E120/LIVE_SAFETY.md', 'utf8');
if (!/- status: PASS/.test(t)) throw new Error('E120_LIVE_SAFETY_FAIL');
