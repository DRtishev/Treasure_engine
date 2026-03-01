/**
 * regression_agent03_no_legacy_contradictions.mjs — RG_AGENT03_NO_LEGACY_CONTRADICTIONS
 *
 * Gate: AGENTS.md must not contain legacy network toggle strings
 *       (ENABLE_NETWORK_TESTS, ENABLE_NETWORK_TESTS=1) and must declare
 *       double-key unlock doctrine explicitly.
 *
 * Sabotage fix #4: AGENTS.md had legacy ENABLE_NETWORK_TESTS=1 toggle
 *       contradicting the double-key unlock doctrine.
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
const checks = [];

// Forbidden strings — legacy net toggles
const FORBIDDEN = ['ENABLE_NETWORK_TESTS=1', 'ENABLE_NETWORK_TESTS'];

// Required strings — double-key unlock doctrine
const REQUIRED_DOUBLE_KEY = ['--enable-network', 'ALLOW_NETWORK'];

// Check 1: AGENTS.md exists
const agentsPath = path.join(ROOT, 'AGENTS.md');
checks.push({ check: 'agents_md_exists', pass: fs.existsSync(agentsPath), detail: agentsPath });

if (fs.existsSync(agentsPath)) {
  const doc = fs.readFileSync(agentsPath, 'utf8');

  // Check 2+: No forbidden legacy strings
  for (const forbidden of FORBIDDEN) {
    const found = doc.includes(forbidden);
    checks.push({
      check: `no_legacy_toggle_${forbidden.replace(/[^a-zA-Z0-9]/g, '_')}`,
      pass: !found,
      detail: !found
        ? `"${forbidden}" not present — OK`
        : `FORBIDDEN: "${forbidden}" found in AGENTS.md (legacy net toggle — remove)`,
    });
  }

  // Check 3+: Double-key unlock strings present
  for (const required of REQUIRED_DOUBLE_KEY) {
    const found = doc.includes(required);
    checks.push({
      check: `has_double_key_${required.replace(/[^a-zA-Z0-9]/g, '_')}`,
      pass: found,
      detail: found
        ? `"${required}" present in AGENTS.md — OK`
        : `MISSING: "${required}" — double-key unlock doctrine must be explicit`,
    });
  }

  // Check 4: AGENTS.md is still the SSOT (has R12)
  const hasR12 = doc.includes('R12') || doc.includes('AGENTS.md is the SSOT');
  checks.push({
    check: 'agents_is_ssot_r12',
    pass: hasR12,
    detail: hasR12 ? 'R12/SSOT declaration present — OK' : 'R12 or SSOT declaration missing',
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'AGENT03_LEGACY_CONTRADICTIONS_FOUND';

writeMd(path.join(EXEC, 'REGRESSION_AGENT03.md'), [
  '# REGRESSION_AGENT03.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_agent03.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_AGENT03_NO_LEGACY_CONTRADICTIONS',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  forbidden_checked: FORBIDDEN,
  required_double_key: REQUIRED_DOUBLE_KEY,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_agent03_no_legacy_contradictions — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
