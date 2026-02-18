#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { modeE113 } from './e113_lib.mjs';

const mode = modeE113();
const p = path.resolve('reports/evidence/E113/NET_PROOF.md');
if (!fs.existsSync(p)) throw new Error('E113_NET_PROOF_MISSING');
const t = fs.readFileSync(p, 'utf8');
for (const req of ['mode:', 'provider_success_count:', 'endpoint_attempts:', 'status:', 'Endpoint Reason Codes']) {
  if (!t.includes(req)) throw new Error(`E113_NET_PROOF_FIELD_MISSING:${req}`);
}
if (mode === 'ONLINE_REQUIRED' && !/status:\s*PASS/.test(t)) throw new Error('E113_ONLINE_REQUIRED_PROOF_NOT_PASS');
if (mode === 'ONLINE_OPTIONAL' && !/status:\s*(PASS|WARN)/.test(t)) throw new Error('E113_OPTIONAL_INVALID_STATUS');
if (mode === 'OFFLINE_ONLY' && !/status:\s*OFFLINE/.test(t)) throw new Error('E113_OFFLINE_PROOF_INVALID');
console.log(`e113_online_proof_contract: PASS mode=${mode}`);
