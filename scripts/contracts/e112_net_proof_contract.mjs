#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { modeState } from '../verify/e112_lib.mjs';

const mode = modeState();
const p = path.resolve('reports/evidence/E112/NET_PROOF.md');
if (mode === 'ONLINE_REQUIRED') {
  if (!fs.existsSync(p)) throw new Error('E112_NET_PROOF_MISSING');
  const t = fs.readFileSync(p, 'utf8');
  if (!/checks_passed:\s*3\/3/.test(t) || !/status:\s*PASS/.test(t)) throw new Error('E112_NET_PROOF_NOT_FULL');
}
console.log(`e112_net_proof_contract: PASS mode=${mode}`);
