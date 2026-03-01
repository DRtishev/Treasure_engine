/**
 * regression_rg_trust02_cockpit_truthlevel_column.mjs — RG_TRUST02
 *
 * Gate: cockpit HUD must display "TruthLevel" (not "Trust") in the data readiness
 *       scorecard column until trust_score_data is actually implemented.
 *
 * Honesty doctrine: cockpit must not imply a computed trust score when none exists.
 * The column header must be "TruthLevel" while trust_score_data_implemented=false.
 *
 * Checks:
 * 1. scripts/ops/cockpit.mjs uses "TruthLevel" not "Trust" in readiness table header
 * 2. docs/TRUST_SCORE_DOCTRINE.md confirms trust_score_data_implemented: false
 * 3. No trust_score_data.json exists in the cockpit epoch dirs (would require column rename)
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
const COCKPIT_SCRIPT = path.join(ROOT, 'scripts/ops/cockpit.mjs');
const TRUST_DOC = path.join(ROOT, 'docs/TRUST_SCORE_DOCTRINE.md');

const checks = [];

// Check 1: cockpit uses TruthLevel in readiness table header
if (!fs.existsSync(COCKPIT_SCRIPT)) {
  checks.push({ check: 'cockpit_script_exists', pass: false, detail: 'scripts/ops/cockpit.mjs missing' });
} else {
  const src = fs.readFileSync(COCKPIT_SCRIPT, 'utf8');
  const hasTruthLevel = src.includes('TruthLevel');
  const hasTrustOnly = src.includes("'| Lane | Trust |'") || src.includes('"| Lane | Trust |"') ||
    (src.includes('| Trust |') && !src.includes('TruthLevel'));
  checks.push({
    check: 'cockpit_uses_truthlevel_not_trust',
    pass: hasTruthLevel && !hasTrustOnly,
    detail: hasTruthLevel && !hasTrustOnly
      ? 'cockpit uses TruthLevel column — OK'
      : hasTrustOnly
      ? 'FAIL: cockpit still uses "Trust" column (not TruthLevel)'
      : 'FAIL: cockpit missing TruthLevel column',
  });
}

// Check 2: doctrine doc confirms trust_score not implemented
if (!fs.existsSync(TRUST_DOC)) {
  checks.push({ check: 'trust_doctrine_present', pass: false, detail: 'TRUST_SCORE_DOCTRINE.md missing' });
} else {
  const docContent = fs.readFileSync(TRUST_DOC, 'utf8');
  const notImplemented = docContent.includes('trust_score_data_implemented: false');
  checks.push({
    check: 'trust_score_not_implemented',
    pass: notImplemented,
    detail: notImplemented ? 'trust_score_data_implemented=false confirmed — OK' : 'FAIL: implementation status not confirmed false',
  });
}

// Check 3: no trust_score_data.json files in evidence dirs (would require column)
const EVIDENCE_DIR = path.join(ROOT, 'reports/evidence');
const trustScoreFiles = [];
function walkForTrustScore(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkForTrustScore(full);
    else if (ent.name === 'trust_score_data.json') trustScoreFiles.push(path.relative(ROOT, full));
  }
}
walkForTrustScore(EVIDENCE_DIR);
checks.push({
  check: 'no_trust_score_data_files',
  pass: trustScoreFiles.length === 0,
  detail: trustScoreFiles.length === 0
    ? 'no trust_score_data.json found — TruthLevel column is correct — OK'
    : `WARN: ${trustScoreFiles.length} trust_score_data.json found — column may need update: ${trustScoreFiles.join(', ')}`,
});

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_TRUST02_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_TRUST02.md'), [
  '# REGRESSION_RG_TRUST02.md — Cockpit TruthLevel Column', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_trust02_cockpit_truthlevel_column.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_TRUST02_COCKPIT_TRUTHLEVEL_COLUMN',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  trust_score_files_found: trustScoreFiles,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_trust02_cockpit_truthlevel_column — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
