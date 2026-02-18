#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { modeState } from '../verify/e112_lib.mjs';

const mode = modeState();
const rf = fs.readFileSync(path.resolve('reports/evidence/E112/REALITY_FUEL.md'), 'utf8');
const verdict = (rf.match(/- verdict:\s*(\w+)/) || [])[1] || 'UNKNOWN';
const fallback = /- fallback_used:\s*yes/.test(rf);
if (mode === 'ONLINE_REQUIRED' && (fallback || verdict !== 'PASS')) {
  throw new Error('E112_NET_MODE_CONTRACT_FAIL:ONLINE_REQUIRED_NO_FALLBACK');
}
if (mode === 'OFFLINE_ONLY' && /LIVE_OK/.test(rf)) {
  throw new Error('E112_NET_MODE_CONTRACT_FAIL:OFFLINE_ATTEMPTED_LIVE');
}
console.log(`e112_net_mode_contract: PASS mode=${mode} verdict=${verdict}`);
