/**
 * regression_cap04_no_wallclock_policy_fields.mjs — RG_CAP04_NO_WALLCLOCK_POLICY_FIELDS
 *
 * Gate: capabilities.*.policy.* must NOT contain wallclock-duration field names.
 *       Forbidden suffixes inside policy objects: _sec, _seconds, _ms
 *       (these encode wall-clock time which is non-deterministic in CERT mode).
 *
 * Allowed outside policy zone: metrics/locks/docs may use these suffixes freely.
 * Only the `policy` sub-object of each capability is checked.
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

const NEXT_ACTION = 'npm run -s verify:regression:cap04-no-wallclock-policy-fields';
const CAP_PATH = path.join(ROOT, 'specs', 'data_capabilities.json');

// Wallclock suffixes forbidden in policy zone
const FORBIDDEN_SUFFIXES = ['_sec', '_seconds', '_ms'];

const checks = [];

function hasForbiddenSuffix(key) {
  return FORBIDDEN_SUFFIXES.some((s) => key.endsWith(s));
}

function collectPolicyViolations(policy, providerName) {
  const violations = [];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return violations;
  for (const key of Object.keys(policy)) {
    if (hasForbiddenSuffix(key)) {
      violations.push(`capabilities.${providerName}.policy.${key}`);
    }
  }
  return violations;
}

if (!fs.existsSync(CAP_PATH)) {
  checks.push({ check: 'cap_file_exists', pass: false, detail: `missing: ${CAP_PATH}` });
} else {
  let cap;
  try {
    cap = JSON.parse(fs.readFileSync(CAP_PATH, 'utf8'));
    checks.push({ check: 'cap_parseable', pass: true, detail: 'JSON parse OK' });
  } catch (e) {
    cap = null;
    checks.push({ check: 'cap_parseable', pass: false, detail: `parse error: ${e.message}` });
  }

  if (cap && cap.capabilities) {
    const providers = Object.keys(cap.capabilities).sort();
    checks.push({ check: 'providers_present', pass: providers.length > 0, detail: `providers=${providers.join(',')}` });

    const allViolations = [];
    for (const provider of providers) {
      const policy = cap.capabilities[provider] && cap.capabilities[provider].policy;
      const policyExists = policy !== null && policy !== undefined && typeof policy === 'object';
      checks.push({
        check: `${provider}_has_policy_object`,
        pass: policyExists,
        detail: policyExists ? `policy keys=${Object.keys(policy).join(',')}` : `MISSING policy for ${provider}`,
      });

      if (policyExists) {
        const violations = collectPolicyViolations(policy, provider);
        const clean = violations.length === 0;
        checks.push({
          check: `${provider}_policy_no_wallclock_fields`,
          pass: clean,
          detail: clean
            ? `no forbidden suffixes (${FORBIDDEN_SUFFIXES.join(',')}) — OK`
            : `WALLCLOCK_FIELDS: ${violations.join(', ')}`,
        });
        allViolations.push(...violations);
      }
    }

    checks.push({
      check: 'total_violations_zero',
      pass: allViolations.length === 0,
      detail: allViolations.length === 0
        ? `0 wallclock policy fields across ${providers.length} providers — OK`
        : `TOTAL_VIOLATIONS: ${allViolations.length} — ${allViolations.join(', ')}`,
    });
  } else {
    checks.push({ check: 'capabilities_object_present', pass: false, detail: 'capabilities object missing' });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'CAP04_WALLCLOCK_POLICY_FIELDS';

writeMd(path.join(EXEC, 'REGRESSION_CAP04.md'), [
  '# REGRESSION_CAP04.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  `## FORBIDDEN_SUFFIXES`,
  FORBIDDEN_SUFFIXES.map((s) => `- \`${s}\``).join('\n'), '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_cap04.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_CAP04_NO_WALLCLOCK_POLICY_FIELDS',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  forbidden_suffixes: FORBIDDEN_SUFFIXES,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_cap04_no_wallclock_policy_fields — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
