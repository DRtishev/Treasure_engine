#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256Text } from './e66_lib.mjs';
const t=fs.readFileSync(path.resolve('reports/evidence/E115/SNAPSHOT_INTEGRITY.md'),'utf8');
if(!/status:\s*PASS/.test(t)) throw new Error('E115_SNAPSHOT_INTEGRITY_FAIL');
const rows=[...t.matchAll(/- ([A-Z0-9]+USDT): bars=(\d+), sha256=([a-f0-9]{64})/g)]; if(!rows.length) throw new Error('E115_SNAPSHOT_ROWS_MISSING');
console.log(`e115_snapshot_integrity_contract: PASS rows=${rows.length}`);
