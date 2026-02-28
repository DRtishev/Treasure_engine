/**
 * regression_auto01_mode_router.mjs — RG_AUTO01_MODE_ROUTER
 *
 * Gate: autopilot_court_v2.mjs must implement valid mode routing.
 *       All 5 modes must be declared; routing logic must be present.
 * Surface: PR
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

const apPath = path.join(ROOT, 'scripts', 'ops', 'autopilot_court_v2.mjs');
const checks = [];

const REQUIRED_MODES = ['CERT', 'CLOSE', 'AUDIT', 'RESEARCH', 'ACCEL'];

// Check 1: Script exists
const scriptExists = fs.existsSync(apPath);
checks.push({ check: 'autopilot_script_exists', pass: scriptExists, detail: apPath });

if (scriptExists) {
  const content = fs.readFileSync(apPath, 'utf8');

  // Check 2: All 5 modes declared
  const modeChecks = REQUIRED_MODES.map((m) => ({
    check: `mode_declared_${m}`,
    pass: content.includes(`'${m}'`) || content.includes(`"${m}"`),
    detail: `mode ${m} must be in VALID_MODES`,
  }));
  checks.push(...modeChecks);

  // Check 3: detectMode function present
  const hasDetectMode = content.includes('detectMode') || content.includes('detect_mode');
  checks.push({ check: 'has_mode_detection', pass: hasDetectMode, detail: 'detectMode function required' });

  // Check 4: routeMode or equivalent routing logic present
  const hasRouting = content.includes('routeMode') || content.includes('route_mode') || content.includes('modeViolations');
  checks.push({ check: 'has_mode_routing', pass: hasRouting, detail: 'routing logic required (routeMode/modeViolations)' });

  // Check 5: CERT mode enforces offline (NETV01)
  const hasCertOffline = content.includes('NETV01') && (content.includes('CERT') || content.includes('CLOSE'));
  checks.push({ check: 'cert_enforces_offline_netv01', pass: hasCertOffline, detail: 'CERT mode must emit NETV01 on network' });

  // Check 6: Outputs PLAN.json and PLAN.md
  const hasPlanJson = content.includes('PLAN.json');
  const hasPlanMd = content.includes('PLAN.md');
  checks.push({ check: 'outputs_plan_json', pass: hasPlanJson, detail: 'PLAN.json output required' });
  checks.push({ check: 'outputs_plan_md', pass: hasPlanMd, detail: 'PLAN.md output required' });

  // Check 7: Outputs REFUSAL.md
  const hasRefusal = content.includes('REFUSAL.md');
  checks.push({ check: 'outputs_refusal_md', pass: hasRefusal, detail: 'REFUSAL.md output required' });

  // Check 8: EPOCH dir under EPOCH-AUTOPILOTV2-*
  const hasEpochDir = content.includes('EPOCH-AUTOPILOTV2-');
  checks.push({ check: 'epoch_dir_autopilotv2_pattern', pass: hasEpochDir, detail: 'output under EPOCH-AUTOPILOTV2-<RUN_ID>' });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'AUTO01_MODE_ROUTE_FAIL';

const mdContent = [
  '# REGRESSION_AUTO01_MODE_ROUTER.md',
  '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
  '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n');

writeMd(path.join(EXEC, 'REGRESSION_AUTO01_MODE_ROUTER.md'), mdContent);

writeJsonDeterministic(path.join(MANUAL, 'regression_auto01_mode_router.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_AUTO01_MODE_ROUTER',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  required_modes: REQUIRED_MODES,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_auto01_mode_router — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
