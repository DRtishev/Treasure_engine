/**
 * regression_rg_deliv02_delivery_doc_coherence.mjs — RG_DELIV02
 *
 * Gate: docs/DATA_DELIVERY_SEMANTICS.md must be coherent with specs/data_lanes.json.
 *
 * Checks:
 * 1. Both files exist
 * 2. TRUTH level values mentioned in doc match what data_lanes.json actually has
 * 3. RDY01/RDY02/RDY_SELECT01_INVALID reason codes are documented
 * 4. STATIC/DYNAMIC lane modes are documented
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const DOC_PATH = path.join(ROOT, 'docs/DATA_DELIVERY_SEMANTICS.md');
const LANES_PATH = path.join(ROOT, 'specs/data_lanes.json');

const checks = [];

if (!fs.existsSync(DOC_PATH) || !fs.existsSync(LANES_PATH)) {
  checks.push({
    check: 'both_files_exist',
    pass: false,
    detail: `MISSING: ${!fs.existsSync(DOC_PATH) ? 'DATA_DELIVERY_SEMANTICS.md' : 'data_lanes.json'}`,
  });
} else {
  const doc = fs.readFileSync(DOC_PATH, 'utf8');
  const lanes = JSON.parse(fs.readFileSync(LANES_PATH, 'utf8'));
  checks.push({ check: 'both_files_exist', pass: true, detail: 'both files present — OK' });

  // Check truth_level values are documented
  const truthLevels = [...new Set(lanes.lanes.map((l) => l.truth_level))];
  for (const tl of truthLevels) {
    const present = doc.includes(`\`${tl}\``) || doc.includes(`'${tl}'`) || doc.includes(tl);
    checks.push({
      check: `truth_level_${tl}_documented`,
      pass: present,
      detail: present ? `truth_level=${tl} mentioned — OK` : `FAIL: truth_level=${tl} not documented`,
    });
  }

  // Check reason codes are documented
  const REQUIRED_REASON_CODES = ['RDY01', 'RDY02', 'RDY_SELECT01_INVALID'];
  for (const rc of REQUIRED_REASON_CODES) {
    const present = doc.includes(rc);
    checks.push({
      check: `reason_code_${rc}_documented`,
      pass: present,
      detail: present ? `${rc} documented — OK` : `FAIL: reason code ${rc} not documented`,
    });
  }

  // Check STATIC and DYNAMIC modes are documented
  checks.push({
    check: 'static_lane_mode_documented',
    pass: doc.includes('STATIC'),
    detail: doc.includes('STATIC') ? 'STATIC lane mode documented — OK' : 'FAIL: STATIC lane mode missing from doc',
  });
  checks.push({
    check: 'dynamic_lane_mode_documented',
    pass: doc.includes('DYNAMIC'),
    detail: doc.includes('DYNAMIC') ? 'DYNAMIC lane mode documented — OK' : 'FAIL: DYNAMIC lane mode missing from doc',
  });

  // Check SELECT_RUN_ID is documented
  checks.push({
    check: 'select_run_id_documented',
    pass: doc.includes('SELECT_RUN_ID'),
    detail: doc.includes('SELECT_RUN_ID') ? 'SELECT_RUN_ID documented — OK' : 'FAIL: SELECT_RUN_ID not documented',
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_DELIV02_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_DELIV02.md'), [
  '# REGRESSION_RG_DELIV02.md — Delivery Doc Coherence', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_deliv02_delivery_doc_coherence.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_DELIV02_DELIVERY_DOC_COHERENCE',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_deliv02_delivery_doc_coherence — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
