#!/usr/bin/env node
import fs from 'node:fs';
const p=fs.readFileSync('reports/evidence/E123/LIVE_FILL_PROOF.md','utf8');
if(/status:\s*PASS/.test(p)&&!/qty_exact_match:\s*true/.test(p)) throw new Error('E123_FILL_LEDGER_MISMATCH');
