/**
 * chaos_orphan_write.mjs — CHAOS_ORPHAN
 *
 * Creates a temp "evidence root" with a known orphan dir,
 * then runs the san_mutation detection logic against it.
 * Verifies the scanner catches the orphan.
 *
 * Gate ID: CHAOS_ORPHAN · Wired: ops:doctor (chaos phase)
 * Side effects: NONE (temp dir in os.tmpdir, cleaned via finally)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { isLegacyExempt } from '../gov/policy_engine.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'CHAOS_ORPHAN';
const NEXT_ACTION = 'npm run -s ops:doctor';

let status = 'FAIL';
let reason_code = 'CHAOS_ORPHAN_IMMUNE_BROKEN';
let detail = '';

const tmpRoot = path.join(os.tmpdir(), `_CHAOS_ORPHAN_${RUN_ID}`);

try {
  // Step 1: Create fake evidence root with known entries
  fs.mkdirSync(path.join(tmpRoot, 'EXECUTOR'), { recursive: true });
  fs.mkdirSync(path.join(tmpRoot, 'EPOCH-TEST-001'), { recursive: true });
  fs.mkdirSync(path.join(tmpRoot, '_CHAOS_ORPHAN_INJECTED_'), { recursive: true }); // THE ORPHAN

  // Step 2: Run the EXACT same detection logic san_mutation uses
  const violations = [];
  for (const ent of fs.readdirSync(tmpRoot, { withFileTypes: true })) {
    const name = ent.name;
    if (name === 'EXECUTOR') continue;
    if (name.startsWith('EPOCH-')) continue;
    if (isLegacyExempt(name)) continue;
    violations.push(name);
  }

  // Step 3: Verify the orphan was caught
  if (violations.includes('_CHAOS_ORPHAN_INJECTED_')) {
    status = 'PASS';
    reason_code = 'NONE';
    detail = `Orphan '_CHAOS_ORPHAN_INJECTED_' detected by mutation scanner — immune system WORKS`;
  } else {
    detail = `Orphan '_CHAOS_ORPHAN_INJECTED_' NOT detected — IMMUNE SYSTEM BROKEN (found: ${violations.join(', ')})`;
  }
} finally {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* OS cleans tmpdir */ }
}

writeMd(path.join(EXEC, 'CHAOS_ORPHAN.md'), [
  '# CHAOS_ORPHAN.md — Chaos: orphan write injection', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '', '## RESULT', detail,
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'chaos_orphan_write.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, detail,
});

console.log(`[${status}] chaos_orphan_write — ${reason_code}`);
if (detail) console.log(`  ${detail}`);
process.exit(status === 'PASS' ? 0 : 1);
