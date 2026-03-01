/**
 * regression_cap01_capabilities_present.mjs — RG_CAP01_CAPABILITIES_PRESENT
 *
 * Gate: specs/data_capabilities.json must exist, parse as valid JSON,
 *       have schema_version, capabilities object, and confidence_map with coverage.
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

const NEXT_ACTION = 'npm run -s verify:regression:cap01-capabilities-present';
const CAP_PATH = path.join(ROOT, 'specs', 'data_capabilities.json');
const checks = [];

checks.push({
  check: 'capabilities_file_exists',
  pass: fs.existsSync(CAP_PATH),
  detail: path.relative(ROOT, CAP_PATH),
});

let cap = null;
if (fs.existsSync(CAP_PATH)) {
  try {
    cap = JSON.parse(fs.readFileSync(CAP_PATH, 'utf8'));
    checks.push({ check: 'capabilities_parseable', pass: true, detail: 'JSON parse OK' });
  } catch (e) {
    checks.push({ check: 'capabilities_parseable', pass: false, detail: `JSON parse error: ${e.message}` });
  }
}

if (cap) {
  checks.push({
    check: 'has_schema_version',
    pass: typeof cap.schema_version === 'string',
    detail: `schema_version=${cap.schema_version}`,
  });
  checks.push({
    check: 'has_capabilities_object',
    pass: cap.capabilities !== null && typeof cap.capabilities === 'object' && !Array.isArray(cap.capabilities),
    detail: cap.capabilities ? `providers=${Object.keys(cap.capabilities).join(',')}` : 'MISSING',
  });
  checks.push({
    check: 'has_confidence_map',
    pass: cap.confidence_map !== null && typeof cap.confidence_map === 'object',
    detail: cap.confidence_map ? 'confidence_map present' : 'MISSING',
  });

  if (cap.confidence_map) {
    checks.push({
      check: 'confidence_map_has_coverage',
      pass: cap.confidence_map.coverage !== null && typeof cap.confidence_map.coverage === 'object',
      detail: cap.confidence_map.coverage ? `coverage_keys=${Object.keys(cap.confidence_map.coverage).length}` : 'MISSING',
    });
    checks.push({
      check: 'confidence_map_has_required_path_patterns',
      pass: Array.isArray(cap.confidence_map.required_path_patterns) && cap.confidence_map.required_path_patterns.length >= 3,
      detail: Array.isArray(cap.confidence_map.required_path_patterns)
        ? `patterns_n=${cap.confidence_map.required_path_patterns.length}`
        : 'MISSING',
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'CAP01_CAPABILITIES_MISSING';

writeMd(path.join(EXEC, 'REGRESSION_CAP01.md'), [
  '# REGRESSION_CAP01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_cap01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_CAP01_CAPABILITIES_PRESENT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_cap01_capabilities_present — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
