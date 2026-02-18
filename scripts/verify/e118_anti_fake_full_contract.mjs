#!/usr/bin/env node
import fs from 'node:fs';
const qp = fs.readFileSync('reports/evidence/E118/QUORUM_POLICY.md','utf8');
const af = fs.readFileSync('reports/evidence/E118/ANTI_FAKE_FULL.md','utf8');
const verdict = /status:\s*(\w+)/.exec(qp)?.[1] || 'UNKNOWN';
const fallbackRatio = Number(/fallback_ratio:\s*([0-9.]+)/.exec(qp)?.[1] || '1');
const freshnessOk = /freshness_ok:\s*true/.test(qp);
const parityLive = /parity_live_inputs:\s*true/.test(af);
if (verdict === 'FULL' && (fallbackRatio > 0 || !freshnessOk || !parityLive)) throw new Error('E118_ANTI_FAKE_FULL_FAIL');
console.log('e118_anti_fake_full_contract: PASS');
