#!/usr/bin/env node
import fs from 'node:fs';
import { readJson, renderWowMatrix } from './derived_views.mjs';

const out = 'docs/STAGE2_IMPLEMENTATION_MATRIX.md';
const ledger = readJson('specs/wow/WOW_LEDGER.json');
fs.writeFileSync(out, renderWowMatrix(ledger));
console.log(`truth:wow:matrix wrote ${out}`);
