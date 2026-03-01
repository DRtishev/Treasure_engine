/**
 * regression_rg_lane05_static_readiness.mjs — RG_LANE05_STATIC_READINESS
 *
 * Gate: verifies that data_readiness_seal correctly handles STATIC lanes
 *       (required_artifacts with no <RUN_ID> placeholder).
 *
 * A STATIC lane MUST:
 *   - Detect that none of its artifact paths contain <RUN_ID>
 *   - Set lane_mode=STATIC
 *   - Return PASS when all static files exist (no RDY01 forever)
 *   - Return NEEDS_DATA when a static file is missing (not a dynamic run issue)
 *
 * Verified by source-code inspection of data_readiness_seal.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:public:data:readiness';
const SEAL_SCRIPT = path.join(ROOT, 'scripts/verify/data_readiness_seal.mjs');

const checks = [];

if (!fs.existsSync(SEAL_SCRIPT)) {
  checks.push({ check: 'seal_script_exists', pass: false, detail: 'data_readiness_seal.mjs missing' });
} else {
  const src = fs.readFileSync(SEAL_SCRIPT, 'utf8');

  // Check 1: STATIC lane detection logic present
  const hasStaticDetect = src.includes('isStatic') && src.includes('<RUN_ID>');
  checks.push({
    check: 'static_lane_detection',
    pass: hasStaticDetect,
    detail: hasStaticDetect ? 'isStatic detection via <RUN_ID> placeholder — OK' : 'FAIL: static detection missing',
  });

  // Check 2: STATIC lane_mode set
  const hasStaticMode = src.includes("lane_mode: 'STATIC'");
  checks.push({
    check: 'static_lane_mode_field',
    pass: hasStaticMode,
    detail: hasStaticMode ? "lane_mode='STATIC' present — OK" : "FAIL: lane_mode='STATIC' not set in static path",
  });

  // Check 3: STATIC PASS path (files exist → PASS)
  const hasStaticPass = src.includes("'static files present'") || src.includes('static files present');
  checks.push({
    check: 'static_pass_path',
    pass: hasStaticPass,
    detail: hasStaticPass ? 'static PASS path present — OK' : 'FAIL: static PASS branch missing',
  });

  // Check 4: STATIC NEEDS_DATA path (file missing → NEEDS_DATA not perpetual RDY01)
  const hasStaticNeedsData = src.includes('static missing:') || src.includes("'static missing");
  checks.push({
    check: 'static_needs_data_path',
    pass: hasStaticNeedsData,
    detail: hasStaticNeedsData ? 'static NEEDS_DATA path (missing file) present — OK' : 'FAIL: static NEEDS_DATA branch missing',
  });

  // Check 5: static lane does NOT enumerate run dirs (avoids perpetual RDY01)
  // Verify the static path returns before findLatestRunDir call
  const staticBlock = src.slice(src.indexOf('isStatic'), src.indexOf('Dynamic lane'));
  const noRunDirEnumInStatic = !staticBlock.includes('findLatestRunDir');
  checks.push({
    check: 'static_no_run_dir_enumeration',
    pass: noRunDirEnumInStatic,
    detail: noRunDirEnumInStatic ? 'static path skips run-dir enumeration — OK' : 'FAIL: static path calls findLatestRunDir',
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_LANE05_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_LANE05.md'), [
  '# REGRESSION_RG_LANE05.md — Static Lane Readiness', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_lane05_static_readiness.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_LANE05_STATIC_READINESS',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_lane05_static_readiness — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
