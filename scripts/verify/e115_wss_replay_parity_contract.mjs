#!/usr/bin/env node
import fs from 'node:fs';
const t=fs.readFileSync('reports/evidence/E115/WSS_REPLAY_X2.md','utf8');
if(!/verdict:\s*(MATCH|MISMATCH)/.test(t)) throw new Error('E115_WSS_PARITY_MISSING');
if(/verdict:\s*MISMATCH/.test(t)) throw new Error('E115_WSS_PARITY_FAIL');
console.log('e115_wss_replay_parity_contract: PASS');
