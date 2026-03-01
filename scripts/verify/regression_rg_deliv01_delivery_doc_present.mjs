/**
 * regression_rg_deliv01_delivery_doc_present.mjs — RG_DELIV01
 *
 * Gate: docs/DATA_DELIVERY_SEMANTICS.md must exist and contain required sections.
 *
 * Required sections:
 *   - ## 1. DELIVERY MODEL
 *   - ## 2. TRUTH LEVELS
 *   - ## 3. STATIC vs DYNAMIC LANES
 *   - ## 4. READINESS STATES
 *   - ## 5. OPERATOR SELECTOR
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

const REQUIRED_SECTIONS = [
  '## 1. DELIVERY MODEL',
  '## 2. TRUTH LEVELS',
  '## 3. STATIC vs DYNAMIC LANES',
  '## 4. READINESS STATES',
  '## 5. OPERATOR SELECTOR',
];

const checks = [];

const docExists = fs.existsSync(DOC_PATH);
checks.push({
  check: 'doc_exists',
  pass: docExists,
  detail: docExists ? `docs/DATA_DELIVERY_SEMANTICS.md present — OK` : 'FAIL: docs/DATA_DELIVERY_SEMANTICS.md missing',
});

if (docExists) {
  const content = fs.readFileSync(DOC_PATH, 'utf8');
  for (const section of REQUIRED_SECTIONS) {
    const present = content.includes(section);
    checks.push({
      check: `section_${section.replace(/[^A-Za-z0-9]/g, '_').replace(/_+/g, '_').toLowerCase()}`,
      pass: present,
      detail: present ? `"${section}" present — OK` : `FAIL: section "${section}" missing`,
    });
  }

  // Check schema_version present
  const hasSchemaVersion = content.includes('schema_version:');
  checks.push({
    check: 'has_schema_version',
    pass: hasSchemaVersion,
    detail: hasSchemaVersion ? 'schema_version present — OK' : 'FAIL: schema_version missing',
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_DELIV01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_DELIV01.md'), [
  '# REGRESSION_RG_DELIV01.md — Delivery Doc Present', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_deliv01_delivery_doc_present.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_DELIV01_DELIVERY_DOC_PRESENT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_deliv01_delivery_doc_present — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
