/**
 * regression_auto02_no_cert_in_research.mjs — RG_AUTO02_NO_CERT_IN_RESEARCH
 *
 * Gate: autopilot_court_v2.mjs must enforce that RESEARCH mode
 *       forbids CERT scripts (no epoch:victory:seal etc).
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

const NEXT_ACTION = 'npm run -s verify:fast';

const apPath = path.join(ROOT, 'scripts', 'ops', 'autopilot_court_v2.mjs');
const checks = [];

// Check 1: Script exists
const scriptExists = fs.existsSync(apPath);
checks.push({ check: 'autopilot_script_exists', pass: scriptExists, detail: apPath });

if (scriptExists) {
  const content = fs.readFileSync(apPath, 'utf8');

  // Check 2: Script references RESEARCH mode
  const hasResearch = content.includes("'RESEARCH'") || content.includes('"RESEARCH"');
  checks.push({ check: 'script_has_research_mode', pass: hasResearch, detail: 'RESEARCH mode must be declared' });

  // Check 3: Script has CERT-in-RESEARCH guard (AUTO02 code)
  const hasCertInResearchGuard =
    content.includes('AUTO02_CERT_IN_RESEARCH') ||
    content.includes('RESEARCH_MODE_CERT_SCRIPTS_FORBIDDEN') ||
    (content.includes('RESEARCH') && content.includes('CERT') && content.includes('forbidden'));
  checks.push({
    check: 'script_has_cert_in_research_guard',
    pass: hasCertInResearchGuard,
    detail: 'AUTO02_CERT_IN_RESEARCH guard or RESEARCH_MODE_CERT_SCRIPTS_FORBIDDEN check required',
  });

  // Check 4: checkResearchNoCert function or equivalent present
  const hasCheckFn = content.includes('checkResearchNoCert') || content.includes('RESEARCH_MODE_CERT_SCRIPTS_FORBIDDEN') || content.includes('researchCertCheck');
  checks.push({ check: 'has_research_cert_check_fn', pass: hasCheckFn, detail: 'checkResearchNoCert or equivalent function required' });

  // Check 5: AUDIT mode guard also present (related offline authority)
  const hasAuditGuard = content.includes("'AUDIT'") || content.includes('"AUDIT"');
  checks.push({ check: 'script_has_audit_mode', pass: hasAuditGuard, detail: 'AUDIT mode must be declared alongside RESEARCH' });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'AUTO02_CERT_IN_RESEARCH';

const mdContent = [
  '# REGRESSION_AUTO02_NO_CERT_IN_RESEARCH.md',
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

writeMd(path.join(EXEC, 'REGRESSION_AUTO02_NO_CERT_IN_RESEARCH.md'), mdContent);

writeJsonDeterministic(path.join(MANUAL, 'regression_auto02_no_cert_in_research.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_AUTO02_NO_CERT_IN_RESEARCH',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_auto02_no_cert_in_research — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
