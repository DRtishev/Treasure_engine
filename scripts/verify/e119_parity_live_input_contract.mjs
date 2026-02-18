#!/usr/bin/env node
import fs from 'node:fs';
const p = fs.readFileSync('reports/evidence/E119/PARITY_COURT_V4.md', 'utf8');
if (!/- live_inputs: (true|false)/.test(p)) throw new Error('E119_PARITY_INPUT_FLAG_MISSING');
console.log('e119_parity_live_input_contract: PASS');
