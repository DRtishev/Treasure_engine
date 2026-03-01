/**
 * regression_rg_r3_mode01_acquire_not_cert.mjs — RG_R3_MODE01
 *
 * Ensures edge_okx_orderbook_10_acquire_live.mjs never emits mode:'CERT'.
 * This script does live WebSocket I/O → must use mode:'RESEARCH'.
 *
 * Gate ID : RG_R3_MODE01
 * Wired   : verify:r3:okx-acquire-contract
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_R3_MODE01';
const NEXT_ACTION = 'npm run -s verify:r3:okx-acquire-contract';
const TARGET_REL = 'scripts/edge/edge_okx_orderbook_10_acquire_live.mjs';
const TARGET = path.join(ROOT, TARGET_REL);

const violations = [];

if (!fs.existsSync(TARGET)) {
  violations.push({ path: TARGET_REL, detail: 'FILE_NOT_FOUND' });
} else {
  const lines = fs.readFileSync(TARGET, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
    if (/mode:\s*['"]CERT['"]/.test(line)) {
      violations.push({
        path: `${TARGET_REL}:${i + 1}`,
        detail: `mode:'CERT' in network acquire — must be 'RESEARCH'`,
      });
    }
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_R3_MODE01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_R3_MODE01.md'), [
  '# REGRESSION_RG_R3_MODE01.md — Acquire mode truth', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `TARGET: ${TARGET_REL}`,
  `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS',
  violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_r3_mode01_acquire_not_cert.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, target: TARGET_REL, violations,
});

console.log(`[${status}] regression_rg_r3_mode01_acquire_not_cert — ${reason_code}`);
if (violations.length > 0) for (const v of violations.slice(0, 10)) console.log(`  ${v.path}: ${v.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
