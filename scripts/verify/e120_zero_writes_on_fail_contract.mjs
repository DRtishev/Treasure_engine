#!/usr/bin/env node
import fs from 'node:fs';
const t = fs.readFileSync('reports/evidence/E120/ZERO_WRITES_ON_FAIL.md', 'utf8');
if (!/- status: PASS/.test(t)) throw new Error('E120_ZERO_WRITES_FAIL');
