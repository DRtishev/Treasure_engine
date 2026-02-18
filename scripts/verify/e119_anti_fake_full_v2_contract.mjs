#!/usr/bin/env node
import fs from 'node:fs';
const anti = fs.readFileSync('reports/evidence/E119/ANTI_FAKE_FULL.md', 'utf8');
const verdict = /status:\s*(\w+)/.exec(fs.readFileSync('reports/evidence/E119/VERDICT.md', 'utf8'))?.[1] || 'UNKNOWN';
const fallback = Number(/fallback_ratio:\s*([0-9.]+)/.exec(anti)?.[1] || '1');
const fresh = /freshness_ok:\s*true/.test(anti);
const parityLive = /parity_live_inputs:\s*true/.test(anti);
if (verdict === 'FULL' && (fallback > 0 || !fresh || !parityLive)) throw new Error('E119_ANTI_FAKE_FULL_FAIL');
console.log('e119_anti_fake_full_v2_contract: PASS');
