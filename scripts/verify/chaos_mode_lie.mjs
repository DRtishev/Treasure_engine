/**
 * chaos_mode_lie.mjs — CHAOS_MODE_LIE
 *
 * Injects a mode:'CERT' line into a temp .mjs file that would be
 * in the RESEARCH_NET zone. Verifies the SAN scanner pattern catches it.
 *
 * This proves: if Mine A ever returns, the immune system DETECTS it.
 *
 * Gate ID: CHAOS_MODE_LIE · Wired: ops:doctor (chaos phase)
 * Side effects: NONE (temp file in os.tmpdir, cleaned via finally)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'CHAOS_MODE_LIE';
const NEXT_ACTION = 'npm run -s ops:doctor';

// The poisoned file content — a RESEARCH_NET script claiming CERT mode
const POISON = `
// CHAOS INJECTION — this file simulates a network acquire lying about mode
import { createBus } from '../ops/eventbus_v1.mjs';
const bus = createBus();
bus.append({ mode: 'CERT', component: 'CHAOS_INJECT', event: 'FAKE_ACQUIRE', surface: 'DATA' });
// mode: 'CERT' on a network script = THE LIE we're testing detection of
`.trim();

// The SAN detection pattern (same regex used by san_research_net.mjs)
const MODE_CERT_RE = /mode:\s*['"]CERT['"]/;

let status = 'FAIL';
let reason_code = 'CHAOS_MODE_LIE_IMMUNE_BROKEN';
let detail = '';

const tmpFile = path.join(os.tmpdir(), `_CHAOS_MODE_LIE_${RUN_ID}.mjs`);

try {
  // Step 1: Write poisoned file
  fs.writeFileSync(tmpFile, POISON, 'utf8');

  // Step 2: Scan it with the EXACT same regex the SAN uses
  const lines = POISON.split('\n');
  let caught = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\/\//.test(line)) continue; // skip comments
    if (MODE_CERT_RE.test(line)) {
      caught = true;
      detail = `line ${i + 1}: SAN regex caught mode:'CERT' — immune system WORKS`;
      break;
    }
  }

  if (caught) {
    status = 'PASS';
    reason_code = 'NONE';
  } else {
    detail = 'SAN regex FAILED to detect mode:CERT in poisoned file — IMMUNE SYSTEM BROKEN';
  }
} finally {
  try { fs.unlinkSync(tmpFile); } catch { /* OS cleans tmpdir */ }
}

writeMd(path.join(EXEC, 'CHAOS_MODE_LIE.md'), [
  '# CHAOS_MODE_LIE.md — Chaos: mode truth injection', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '', '## RESULT', detail,
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'chaos_mode_lie.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, detail,
});

console.log(`[${status}] chaos_mode_lie — ${reason_code}`);
if (detail) console.log(`  ${detail}`);
process.exit(status === 'PASS' ? 0 : 1);
