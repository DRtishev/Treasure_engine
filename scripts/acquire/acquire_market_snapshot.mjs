#!/usr/bin/env node
// S10: Acquire minimal market snapshot (spread, depth, ATR) from exchange API
// BLOCKED without ALLOW_NETWORK file

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ALLOW = path.join(ROOT, 'artifacts/incoming/ALLOW_NETWORK');

if (!fs.existsSync(ALLOW) || !fs.readFileSync(ALLOW, 'utf8').includes('ALLOW_NETWORK: YES')) {
  console.error('[BLOCKED] acquire_market_snapshot — NETWORK_FORBIDDEN (ALLOW_NETWORK absent)');
  process.exit(1);
}

console.log('[STUB] acquire_market_snapshot — network enabled but not yet implemented');
process.exit(0);
