/**
 * op01_scripts_check.mjs — OP01 Phantom Commands Prevention Gate
 *
 * Implements R_OP01_PHANTOM_COMMANDS from SHAMAN_OS_FIRMWARE v2.0.1.
 *
 * Verifies that every NEXT_ACTION/EXECUTION_ORDER command referenced in
 * documentation and gate outputs exists as an npm script in package.json.
 *
 * BLOCKED OP01 if any required script is missing.
 *
 * Writes:
 *   reports/evidence/SAFETY/OP01_SCRIPTS_CHECK.md
 *   reports/evidence/SAFETY/gates/manual/op01_scripts_check.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const SAFETY_DIR = path.join(ROOT, 'reports', 'evidence', 'SAFETY');
const MANUAL_DIR = path.join(SAFETY_DIR, 'gates', 'manual');

fs.mkdirSync(SAFETY_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Required scripts (all NEXT_ACTIONs referenced in docs/gates)
// ---------------------------------------------------------------------------
const REQUIRED_SCRIPTS = [
  // EXECUTION_ORDER (v2.0.1)
  { script: 'infra:p0',               reason: 'EXECUTION_ORDER C1' },
  { script: 'p0:all',                 reason: 'EXECUTION_ORDER C2' },
  { script: 'edge:calm:p0',           reason: 'EXECUTION_ORDER C3 + CALM pipeline' },
  { script: 'edge:calm:p0:x2',        reason: 'EXECUTION_ORDER C4 + ANTI_FLAKE' },
  { script: 'gov:integrity',          reason: 'EXECUTION_ORDER C5 + P1 orchestrator' },
  // Individual gates
  { script: 'gov:merkle',             reason: 'P1_MERKLE_ROOT gate' },
  { script: 'gov:gov01',              reason: 'P1_GOV01_ENFORCEMENT gate' },
  { script: 'verify:net:isolation',   reason: 'P0_NET_OFF gate (NET01)' },
  { script: 'verify:zero:war:probe',  reason: 'P0_ZERO_WAR_MUST_FAIL gate (ZW00/ZW01)' },
  { script: 'verify:fixture:guard',   reason: 'P0_FIXTURE_GUARD gate (FG01)' },
  // Readiness
  { script: 'edge:micro:live:readiness', reason: 'EXECUTION_ORDER step 6 + readiness gate' },
  // Repair actions referenced in gate NEXT_ACTIONs
  { script: 'edge:calm:canon:selftest', reason: 'NEXT_ACTION in canon/GOV01 failures' },
  { script: 'edge:calm:hashes',         reason: 'NEXT_ACTION in CHECKSUMS failures' },
];

console.log('');
console.log('='.repeat(60));
console.log('OP01 SCRIPTS CHECK — Phantom Command Prevention');
console.log(`RUN_ID: ${RUN_ID}`);
console.log('='.repeat(60));

// Load package.json
const pkgPath = path.join(ROOT, 'package.json');
let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} catch (e) {
  console.error(`[BLOCKED OP01] Cannot read package.json: ${e.message}`);
  process.exit(1);
}

const availableScripts = new Set(Object.keys(pkg.scripts || {}));

const results = REQUIRED_SCRIPTS.map((r) => ({
  script: r.script,
  reason: r.reason,
  exists: availableScripts.has(r.script),
  command: availableScripts.has(r.script) ? (pkg.scripts[r.script] || '').slice(0, 80) : 'MISSING',
}));

const missing = results.filter((r) => !r.exists);
const gateStatus = missing.length === 0 ? 'PASS' : 'BLOCKED';
const reasonCode = missing.length === 0 ? 'NONE' : 'OP01';

const message = missing.length === 0
  ? `OP01 PASS — All ${REQUIRED_SCRIPTS.length} required npm scripts exist in package.json.`
  : `BLOCKED OP01 — ${missing.length} required npm script(s) missing: ${missing.map((r) => r.script).join(', ')}.`;

const nextAction = missing.length === 0
  ? 'All NEXT_ACTION references are valid. No phantom commands.'
  : `Add missing scripts to package.json: ${missing.map((r) => r.script).join(', ')}`;

// ---------------------------------------------------------------------------
// Write OP01_SCRIPTS_CHECK.md
// ---------------------------------------------------------------------------
const checkTable = results.map((r) =>
  `| \`${r.script}\` | ${r.exists ? 'EXISTS' : 'MISSING'} | ${r.reason} |`
).join('\n');

const allScriptsList = [...availableScripts].sort().map((s) => `- \`${s}\``).join('\n');

const checkMd = `# OP01_SCRIPTS_CHECK.md — Phantom Command Prevention

STATUS: ${gateStatus}
REASON_CODE: ${reasonCode}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## OP01 Policy

Any NEXT_ACTION or EXECUTION_ORDER npm command MUST exist in package.json scripts.
Missing script => BLOCKED OP01.

## Required Scripts Check

| Script | Status | Referenced By |
|--------|--------|---------------|
${checkTable}

## Summary

| Metric | Value |
|--------|-------|
| Required scripts | ${REQUIRED_SCRIPTS.length} |
| Found | ${results.filter((r) => r.exists).length} |
| Missing | ${missing.length} |

## All Available Scripts (${availableScripts.size} total, sorted)

${allScriptsList}

## Evidence Paths

- reports/evidence/SAFETY/OP01_SCRIPTS_CHECK.md
- reports/evidence/SAFETY/gates/manual/op01_scripts_check.json
`;

writeMd(path.join(SAFETY_DIR, 'OP01_SCRIPTS_CHECK.md'), checkMd);

// ---------------------------------------------------------------------------
// Write op01_scripts_check.json
// ---------------------------------------------------------------------------
const gateJson = {
  schema_version: '1.0.0',
  checks_failed: missing.length,
  checks_total: REQUIRED_SCRIPTS.length,
  message,
  missing_scripts: missing.map((r) => r.script),
  next_action: nextAction,
  reason_code: reasonCode,
  results,
  run_id: RUN_ID,
  status: gateStatus,
  total_scripts_in_package: availableScripts.size,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'op01_scripts_check.json'), gateJson);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log('OP01 SCRIPTS CHECK RESULT');
console.log('='.repeat(60));
for (const r of results) {
  console.log(`  [${r.exists ? 'EXISTS' : 'MISSING'}] ${r.script} (${r.reason})`);
}
console.log(`\nFINAL: ${gateStatus}${reasonCode !== 'NONE' ? ' ' + reasonCode : ''}`);
console.log('='.repeat(60));

if (gateStatus !== 'PASS') {
  console.error(`\n[BLOCKED OP01] Missing scripts: ${missing.map((r) => r.script).join(', ')}`);
  process.exit(1);
}

console.log(`\n[PASS] op01_scripts_check — All required npm scripts exist.`);
process.exit(0);
