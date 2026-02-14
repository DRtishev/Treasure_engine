#!/usr/bin/env node
import fs from 'node:fs';
import { readJson, renderWowCatalog } from './derived_views.mjs';

const out = 'docs/WOW_CATALOG.md';
const ledger = readJson('specs/wow/WOW_LEDGER.json');
fs.writeFileSync(out, renderWowCatalog(ledger));
console.log(`truth:wow:catalog wrote ${out}`);
