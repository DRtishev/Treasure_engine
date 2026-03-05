#!/usr/bin/env node
// S10: Acquire fee tiers from exchange API
// BLOCKED without ALLOW_NETWORK file

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ALLOW = path.join(ROOT, 'artifacts/incoming/ALLOW_NETWORK');

if (!fs.existsSync(ALLOW) || !fs.readFileSync(ALLOW, 'utf8').includes('ALLOW_NETWORK: YES')) {
  console.error('[BLOCKED] acquire_fee_tiers — NETWORK_FORBIDDEN (ALLOW_NETWORK absent)');
  process.exit(1);
}

// TODO: when network unlocked, fetch real fee tier data from exchange API
// and write lock file to artifacts/incoming/LOCKS/fee_tiers_<exchange>.lock.json
console.log('[STUB] acquire_fee_tiers — network enabled but not yet implemented');
process.exit(0);
