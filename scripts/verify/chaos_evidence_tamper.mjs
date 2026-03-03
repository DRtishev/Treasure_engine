/**
 * chaos_evidence_tamper.mjs — CHAOS_EVIDENCE_TAMPER
 *
 * Creates a temp evidence directory with merkle-sealed files,
 * tampers with one file, then verifies provenance detects the tamper.
 *
 * Gate ID: CHAOS_EVIDENCE_TAMPER · Wired: ops:doctor (chaos phase)
 * Side effects: NONE (temp dir, cleaned via finally)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { sealProvenance, verifyProvenance } from '../lib/provenance.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'CHAOS_EVIDENCE_TAMPER';
const NEXT_ACTION = 'npm run -s ops:doctor';

let status = 'FAIL';
let reason_code = 'CHAOS_EVIDENCE_TAMPER_IMMUNE_BROKEN';
let detail = '';

const tmpDir = path.join(os.tmpdir(), `_CHAOS_EVIDENCE_TAMPER_${RUN_ID}`);

try {
  // Step 1: Create temp evidence dir with some files
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'TEST_EVIDENCE.json'), JSON.stringify({
    schema_version: '1.0.0',
    gate_id: 'CHAOS_TEST',
    status: 'PASS',
    run_id: RUN_ID,
  }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(tmpDir, 'TEST_REPORT.md'), '# Test Report\n\nThis is test evidence.\n', 'utf8');

  // Step 2: Seal provenance (creates merkle tree)
  sealProvenance(tmpDir, { run_id: RUN_ID });

  // Step 3: Verify seal is valid BEFORE tampering
  const beforeResult = verifyProvenance(tmpDir);
  if (!beforeResult.valid) {
    detail = `Pre-tamper verification failed: ${beforeResult.reason} — provenance seal broken`;
  } else {
    // Step 4: TAMPER with one of the sealed files
    fs.writeFileSync(path.join(tmpDir, 'TEST_EVIDENCE.json'), JSON.stringify({
      schema_version: '1.0.0',
      gate_id: 'CHAOS_TEST',
      status: 'TAMPERED',
      run_id: RUN_ID,
    }, null, 2) + '\n', 'utf8');

    // Step 5: Verify provenance detects the tamper
    const afterResult = verifyProvenance(tmpDir);
    if (!afterResult.valid) {
      // GOOD — tamper detected
      status = 'PASS';
      reason_code = 'NONE';
      detail = `Tamper detected: ${afterResult.reason} — merkle seal WORKS`;
    } else {
      detail = 'Provenance DID NOT detect file tamper — merkle seal BROKEN';
    }
  }
} finally {
  // Clean up temp dir
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* OS cleans tmpdir */ }
}

writeMd(path.join(EXEC, 'CHAOS_EVIDENCE_TAMPER.md'), [
  '# CHAOS_EVIDENCE_TAMPER.md — Chaos: merkle tamper proof', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '', '## RESULT', detail,
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'chaos_evidence_tamper.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, detail,
});

console.log(`[${status}] chaos_evidence_tamper — ${reason_code}`);
if (detail) console.log(`  ${detail}`);
process.exit(status === 'PASS' ? 0 : 1);
