#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applyRiskFortress, sizingPolicy, generateDeterministicCrisisSuite } from '../../core/edge/risk_fortress.mjs';

const root = process.cwd();
const evidence = process.env.EVIDENCE_EPOCH || 'EPOCH-44';
const runLabel = process.env.RUN_LABEL || 'manual';
const eDir = path.join(root, 'reports/evidence', evidence);
const rDir = path.join(eDir, 'gates', runLabel);
fs.mkdirSync(rDir, { recursive: true });

let passed = 0; let failed = 0;
const assert = (c, m) => c ? (passed++, console.log(`✓ ${m}`)) : (failed++, console.error(`✗ ${m}`));

const crisis = generateDeterministicCrisisSuite(4401);
const crisis2 = generateDeterministicCrisisSuite(4401);
assert(crisis.fingerprint === crisis2.fingerprint, 'crisis deterministic x2');

const hi = sizingPolicy({ dd: 0.28, dd_speed: 0.08, vol_regime: 'HIGH', pbo_flag: true, dsr_flag: true });
const lo = sizingPolicy({ dd: 0.03, dd_speed: 0.01, vol_regime: 'LOW', pbo_flag: false, dsr_flag: false });
assert(hi < lo, 'sizing degrades as drawdown worsens');

const halted = applyRiskFortress({ tradeLossPct: 0.03, dayLossPct: 0.01, weekLossPct: 0.02, dd: 0.1, dd_speed: 0.01 });
assert(halted.hard_stop.halt && halted.size_factor === 0, 'hard stop cannot be bypassed');

const normal = applyRiskFortress({ tradeLossPct: 0.001, dayLossPct: 0.002, weekLossPct: 0.003, dd: 0.02, dd_speed: 0.01 });
assert(!normal.hard_stop.halt && normal.size_factor > 0, 'normal path keeps sizing > 0');

fs.writeFileSync(path.join(eDir, 'crisis_manifest.json'), JSON.stringify(crisis, null, 2) + '\n');
const result = { passed, failed, crisis_fingerprint: crisis.fingerprint, low_dd_size: lo, high_dd_size: hi };
fs.writeFileSync(path.join(rDir, 'verify_epoch44_result.json'), JSON.stringify(result, null, 2) + '\n');

if (failed > 0) process.exit(1);
console.log(`PASS verify:epoch44 checks=${passed} fp=${crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex')}`);
