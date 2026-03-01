/**
 * regression_rg_trust01_trust_doc_present.mjs — RG_TRUST01
 *
 * Gate: docs/TRUST_SCORE_DOCTRINE.md must exist and contain required sections.
 *
 * Required sections:
 *   - ## 1. TRUTHLEVEL vs TRUST SCORE
 *   - ## 2. COCKPIT COLUMN NAME POLICY
 *   - ## 3. TRUTHLEVEL SEMANTICS
 *   - ## 4. TRUST SCORE (FUTURE R2)
 *   - ## 5. ANTI-FABRICATION RULE
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
const DOC_PATH = path.join(ROOT, 'docs/TRUST_SCORE_DOCTRINE.md');

const REQUIRED_SECTIONS = [
  '## 1. TRUTHLEVEL vs TRUST SCORE',
  '## 2. COCKPIT COLUMN NAME POLICY',
  '## 3. TRUTHLEVEL SEMANTICS',
  '## 4. TRUST SCORE',
  '## 5. ANTI-FABRICATION RULE',
];

const checks = [];

const docExists = fs.existsSync(DOC_PATH);
checks.push({
  check: 'doc_exists',
  pass: docExists,
  detail: docExists ? 'docs/TRUST_SCORE_DOCTRINE.md present — OK' : 'FAIL: docs/TRUST_SCORE_DOCTRINE.md missing',
});

if (docExists) {
  const content = fs.readFileSync(DOC_PATH, 'utf8');
  for (const section of REQUIRED_SECTIONS) {
    const present = content.includes(section);
    checks.push({
      check: `section_present_${section.replace(/[^A-Za-z0-9]/g, '_').replace(/_+/g, '_').toLowerCase().slice(0, 40)}`,
      pass: present,
      detail: present ? `"${section}" present — OK` : `FAIL: section "${section}" missing`,
    });
  }

  // trust_score_data_implemented: false must be present (honesty flag)
  const hasImplFlag = content.includes('trust_score_data_implemented: false');
  checks.push({
    check: 'trust_score_not_implemented_flag',
    pass: hasImplFlag,
    detail: hasImplFlag ? 'trust_score_data_implemented: false present — OK' : 'FAIL: implementation status flag missing',
  });

  // Ensure TruthLevel concept is present
  const hasTruthLevel = content.includes('TruthLevel');
  checks.push({
    check: 'truthlevel_concept_documented',
    pass: hasTruthLevel,
    detail: hasTruthLevel ? 'TruthLevel concept documented — OK' : 'FAIL: TruthLevel not mentioned',
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_TRUST01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_TRUST01.md'), [
  '# REGRESSION_RG_TRUST01.md — Trust Doc Present', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_trust01_trust_doc_present.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_TRUST01_TRUST_DOC_PRESENT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_trust01_trust_doc_present — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
