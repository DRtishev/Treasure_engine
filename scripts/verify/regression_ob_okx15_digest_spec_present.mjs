/**
 * regression_ob_okx15_digest_spec_present.mjs — RG_OB_OKX15_DIGEST_SPEC_PRESENT
 *
 * Gate: Verify that docs/OKX_ORDERBOOK_DIGEST_SPEC.md exists and contains
 *       the required sections for digest canonicalization SSOT.
 *
 * Surface: OFFLINE_AUTHORITY
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx15-digest-spec-present';
const SPEC_PATH = path.join(ROOT, 'docs', 'OKX_ORDERBOOK_DIGEST_SPEC.md');

const REQUIRED_SECTIONS = [
  'CANONICAL BOOK DIGEST',
  'DECIMAL SORT TOTAL ORDER',
  'DEDUP POLICY',
  'REORDER WINDOW POLICY',
  'OKX 8-STEP ALIGN ALGORITHM',
  'GATE COVERAGE',
];

const REQUIRED_TERMS = [
  'compareDecimalStr',
  'sha256',
  'parseFloat',
  'seqId',
  'reorder_window_max_items',
  'ALIGN_FIRST_EVENT',
];

const checks = [];

const specExists = fs.existsSync(SPEC_PATH);
checks.push({
  check: 'spec_file_exists',
  pass: specExists,
  detail: specExists
    ? `docs/OKX_ORDERBOOK_DIGEST_SPEC.md exists — OK`
    : `MISSING: docs/OKX_ORDERBOOK_DIGEST_SPEC.md`,
});

if (specExists) {
  const content = fs.readFileSync(SPEC_PATH, 'utf8');

  checks.push({
    check: 'spec_non_empty',
    pass: content.length > 500,
    detail: content.length > 500
      ? `spec length=${content.length} chars — OK`
      : `FAIL: spec too short (${content.length} chars)`,
  });

  for (const section of REQUIRED_SECTIONS) {
    const present = content.includes(section);
    checks.push({
      check: `section_${section.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
      pass: present,
      detail: present
        ? `section "${section}" present — OK`
        : `MISSING section: "${section}"`,
    });
  }

  for (const term of REQUIRED_TERMS) {
    const present = content.includes(term);
    checks.push({
      check: `term_${term.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
      pass: present,
      detail: present
        ? `term "${term}" present — OK`
        : `MISSING term: "${term}"`,
    });
  }

  // Must not contain wallclock fields
  const wallclock = ['Date.now()', 'performance.now()', 'new Date()', 'timestamp_ms'];
  const wc = wallclock.filter((w) => content.includes(w));
  checks.push({
    check: 'no_wallclock_in_spec',
    pass: wc.length === 0,
    detail: wc.length === 0
      ? `no wallclock fields in spec — OK`
      : `WALLCLOCK FOUND: ${wc.join(', ')}`,
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX15_DIGEST_SPEC_MISSING';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX15.md'), [
  '# REGRESSION_OB_OKX15.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## POLICY',
  '- docs/OKX_ORDERBOOK_DIGEST_SPEC.md must exist',
  '- Must contain all required sections and terminology',
  '- No wallclock fields', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx15.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX15_DIGEST_SPEC_PRESENT',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx15_digest_spec_present — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
