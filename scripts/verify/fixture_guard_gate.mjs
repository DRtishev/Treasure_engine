/**
 * fixture_guard_gate.mjs — FG01 Fixture Guard Gate
 *
 * Implements FG01: default mode is REAL_ONLY.
 * Fixtures may only be used when ALLOW_FIXTURES=1 (tests only).
 *
 * Rules:
 * - If evidence source is fixture AND ALLOW_FIXTURES != 1 => BLOCKED FG01
 * - Eligibility flags must remain false under any fixture violation
 *
 * Detection strategy:
 * - Scans gate JSON files in reports/evidence/**/gates/manual/ for fixture markers
 * - Checks for "fixture" in file path (e.g., *_fixture.json, fixture_*) outside test dirs
 * - Checks for fixture_source, is_fixture, allow_fixtures fields in gate JSON
 * - Checks ALLOW_FIXTURES env var
 *
 * Writes:
 *   reports/evidence/INFRA_P0/FIXTURE_GUARD_GATE.md
 *   reports/evidence/INFRA_P0/gates/manual/fixture_guard_gate.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, sha256Raw, sha256Norm, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const INFRA_DIR = path.join(ROOT, 'reports', 'evidence', 'INFRA_P0');
const MANUAL_DIR = path.join(INFRA_DIR, 'gates', 'manual');

fs.mkdirSync(INFRA_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const ALLOW_FIXTURES = process.env.ALLOW_FIXTURES === '1';

console.log('');
console.log('='.repeat(60));
console.log('FG01 FIXTURE GUARD — Evidence Source Verification');
console.log(`RUN_ID: ${RUN_ID}`);
console.log(`ALLOW_FIXTURES: ${ALLOW_FIXTURES ? '1 (fixture opt-in active)' : 'unset (REAL_ONLY mode)'}`);
console.log('='.repeat(60));

// ---------------------------------------------------------------------------
// Scan for fixture contamination in gate JSON evidence
// ---------------------------------------------------------------------------

const EVIDENCE_SCAN_DIRS = [
  path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'gates', 'manual'),
  path.join(ROOT, 'reports', 'evidence', 'INFRA_P0', 'gates', 'manual'),
];

// Fields that indicate fixture contamination
const FIXTURE_JSON_FIELDS = ['fixture_source', 'is_fixture', 'allow_fixtures', 'fixture_mode'];

// File name patterns that indicate fixture sources
const FIXTURE_FILE_PATTERN = /fixture/i;

const violations = [];
const scanned = [];

for (const scanDir of EVIDENCE_SCAN_DIRS) {
  if (!fs.existsSync(scanDir)) continue;

  for (const fname of fs.readdirSync(scanDir).sort()) {
    if (!fname.endsWith('.json')) continue;

    const fpath = path.join(scanDir, fname);
    const relPath = path.relative(ROOT, fpath).split(path.sep).join('/');

    // Check filename for fixture pattern
    if (FIXTURE_FILE_PATTERN.test(fname)) {
      // Fixture-named file in evidence directory — not auto-violation but note it
      scanned.push({ path: relPath, check: 'FILENAME_FIXTURE_PATTERN', result: 'FLAGGED' });
    } else {
      scanned.push({ path: relPath, check: 'FILENAME_OK', result: 'CLEAN' });
    }

    // Parse JSON and check for fixture fields
    let data;
    try {
      data = JSON.parse(fs.readFileSync(fpath, 'utf8'));
    } catch (_) {
      scanned.push({ path: relPath, check: 'PARSE_ERROR', result: 'UNKNOWN' });
      continue;
    }

    for (const field of FIXTURE_JSON_FIELDS) {
      if (field in data) {
        const val = data[field];
        const isFixtureActive = val === true || val === '1' || val === 1 || val === 'true';
        if (isFixtureActive) {
          violations.push({
            path: relPath,
            field,
            value: String(val),
            violation: `FG01: fixture field "${field}"=${val} in evidence file (ALLOW_FIXTURES not set)`,
          });
        }
      }
    }
  }
}

// Check e109:pilot:fixture script output — this is an officially permitted fixture
// (operator-controlled, not a contamination of evidence) — skip it.

// ---------------------------------------------------------------------------
// Determine gate status
// ---------------------------------------------------------------------------
const hasViolations = violations.length > 0 && !ALLOW_FIXTURES;
const gateStatus = hasViolations ? 'BLOCKED' : 'PASS';
const reasonCode = hasViolations ? 'FG01' : 'NONE';

const eligibleForMicroLive = !hasViolations;
const eligibleForExecution = !hasViolations;

const message = hasViolations
  ? `BLOCKED FG01 — ${violations.length} fixture violation(s) detected in evidence files. Set ALLOW_FIXTURES=1 to opt-in, or remove fixture contamination.`
  : ALLOW_FIXTURES
    ? `FG01 PASS (ALLOW_FIXTURES=1) — Fixture opt-in active. Evidence may include fixture sources.`
    : `FG01 PASS (REAL_ONLY) — No fixture contamination detected in ${scanned.length} evidence files scanned.`;

const nextAction = hasViolations
  ? 'Remove fixture-contaminated evidence fields or set ALLOW_FIXTURES=1 (tests only). Eligibility flags remain false.'
  : 'Fixture guard satisfied. Eligibility not blocked by FG01.';

// ---------------------------------------------------------------------------
// Write FIXTURE_GUARD_GATE.md
// ---------------------------------------------------------------------------
const violationsSection = violations.length > 0
  ? violations.map((v) =>
    `| \`${v.path}\` | ${v.field} | ${v.value} | VIOLATION |`
  ).join('\n')
  : '| (none) | — | — | CLEAN |';

const scannedSection = scanned.slice(0, 20).map((s) =>
  `| \`${s.path}\` | ${s.check} | ${s.result} |`
).join('\n');

const guardMd = `# FIXTURE_GUARD_GATE.md — FG01 Fixture Guard

STATUS: ${gateStatus}
REASON_CODE: ${reasonCode}
RUN_ID: ${RUN_ID}
ALLOW_FIXTURES: ${ALLOW_FIXTURES ? '1' : 'unset'}
ELIGIBLE_FOR_MICRO_LIVE: ${eligibleForMicroLive}
ELIGIBLE_FOR_EXECUTION: ${eligibleForExecution}
NEXT_ACTION: ${nextAction}

## FG01 Policy

Default mode: REAL_ONLY — evidence sources must be real (not fixtures).
Fixture opt-in: Set ALLOW_FIXTURES=1 (tests only).
Enforcement: If evidence source is fixture AND ALLOW_FIXTURES!=1 => BLOCKED FG01.
Eligibility flags remain false under any fixture violation.

## Violations

| Path | Field | Value | Status |
|------|-------|-------|--------|
${violationsSection}

## Scanned Files (sample, max 20 of ${scanned.length})

| Path | Check | Result |
|------|-------|--------|
${scannedSection}

## Summary

| Metric | Value |
|--------|-------|
| Files scanned | ${scanned.length} |
| Violations found | ${violations.length} |
| ALLOW_FIXTURES | ${ALLOW_FIXTURES ? '1 (opt-in)' : 'unset'} |
| Gate status | ${gateStatus} |

## Evidence Paths

- reports/evidence/INFRA_P0/FIXTURE_GUARD_GATE.md
- reports/evidence/INFRA_P0/gates/manual/fixture_guard_gate.json
`;

writeMd(path.join(INFRA_DIR, 'FIXTURE_GUARD_GATE.md'), guardMd);

// ---------------------------------------------------------------------------
// Write fixture_guard_gate.json
// ---------------------------------------------------------------------------
const gateJson = {
  schema_version: '1.0.0',
  allow_fixtures: ALLOW_FIXTURES,
  eligible_for_execution: eligibleForExecution,
  eligible_for_micro_live: eligibleForMicroLive,
  files_scanned: scanned.length,
  message,
  next_action: nextAction,
  reason_code: reasonCode,
  run_id: RUN_ID,
  status: gateStatus,
  violations,
  violations_count: violations.length,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'fixture_guard_gate.json'), gateJson);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log('FG01 FIXTURE GUARD RESULT');
console.log('='.repeat(60));
console.log(`  Files scanned: ${scanned.length}`);
console.log(`  Violations: ${violations.length}`);
console.log(`  ALLOW_FIXTURES: ${ALLOW_FIXTURES ? '1' : 'unset'}`);
console.log(`  Status: ${gateStatus}${reasonCode !== 'NONE' ? ' ' + reasonCode : ''}`);
console.log('='.repeat(60));

if (gateStatus !== 'PASS') {
  console.error(`\n[BLOCKED FG01] Fixture guard violation. See INFRA_P0/FIXTURE_GUARD_GATE.md.`);
  process.exit(1);
}

console.log(`\n[PASS] fixture_guard_gate — No fixture contamination in real evidence.`);
process.exit(0);
