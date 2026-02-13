#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { runAgentMesh, replayAgentMeshFromLog } from '../../core/agent/mesh.mjs';

const root = process.cwd();
const evidence = process.env.EVIDENCE_EPOCH || 'EPOCH-45';
const runLabel = process.env.RUN_LABEL || 'manual';
const eDir = path.join(root, 'reports/evidence', evidence);
const rDir = path.join(eDir, 'gates', runLabel);
fs.mkdirSync(rDir, { recursive: true });

const eventLogPath = path.join(eDir, 'event_log.jsonl');
const run1 = runAgentMesh({ eventLogPath, seed: 4501 });
const replay = replayAgentMeshFromLog(eventLogPath);
const run2 = runAgentMesh({ seed: 4501 });

let passed = 0; let failed = 0;
const assert = (c, m) => c ? (passed++, console.log(`✓ ${m}`)) : (failed++, console.error(`✗ ${m}`));

assert(run1.output_fingerprint === run2.output_fingerprint, 'deterministic outputs x2');
assert(run1.output_fingerprint === replay.output_fingerprint, 'replay from event log matches output');
assert(run1.events.every((e) => Number.isFinite(e.seed)), 'all events carry seed');
assert(!run1.events.some((e) => e.payload?.risk_fsm_bypass === true), 'policy: no risk FSM bypass');
assert(process.env.ENABLE_NETWORK !== '1', 'policy: network remains disabled by default');

fs.writeFileSync(path.join(eDir, 'outputs.json'), JSON.stringify(run1.output, null, 2) + '\n');
const result = { passed, failed, output_fingerprint: run1.output_fingerprint, event_count: run1.events.length };
fs.writeFileSync(path.join(rDir, 'verify_epoch45_result.json'), JSON.stringify(result, null, 2) + '\n');
if (failed > 0) process.exit(1);
console.log(`PASS verify:epoch45 checks=${passed} fp=${run1.output_fingerprint}`);
