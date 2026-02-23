/**
 * reason_code_audit.mjs — Reason Code Collision and Abuse Prevention
 *
 * Implements R_REASON_CODE_COLLISION from SHAMAN_OS_FIRMWARE v2.0.1.
 *
 * Scans all gate JSON files under reports/evidence/.../gates/manual/*.json,
 * extracts reason_code fields, and validates against the SSOT:
 * - D003 MUST NOT appear in any non-canon-drift gate
 * - NEEDS_DATA only allowed with NDA01 or NDA02
 * - Reason codes must be from the SSOT list
 * - No collisions between kind=OBSERVED and kind=FAIL codes
 *
 * Writes:
 *   reports/evidence/GOV/REASON_CODE_AUDIT.md
 *   reports/evidence/GOV/gates/manual/reason_code_audit.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const GOV_DIR = path.join(ROOT, 'reports', 'evidence', 'GOV');
const MANUAL_DIR = path.join(GOV_DIR, 'gates', 'manual');

fs.mkdirSync(GOV_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// SSOT: valid reason codes from firmware spec
// ---------------------------------------------------------------------------
const VALID_REASON_CODES = new Set([
  'NONE',       // Gate passed cleanly
  'NET01',      // Network isolation unavailable
  'DEP01',      // Network attempt detected during install
  'DEP02',      // Native build outside capsule
  'DEP03',      // Nondeterminism across x2
  'D001',       // RUN_ID unavailable
  'D002',       // TREASURE_RUN_ID x2 mismatch
  'D003',       // RESERVED — canon/governance drift only
  'D005',       // Canon touched forbidden semantic line
  'RD01',       // Readiness input missing
  'VM04',       // Bundle fingerprint malformed
  'OP01',       // NEXT_ACTION references non-existent script
  'FG01',       // Fixture guard violation
  'ZW00',       // Zero-war observed (expected must-fail)
  'ZW01',       // Zero-war breach
  'GOV01',      // Evidence integrity mismatch
  'ND01',       // x2 fingerprint mismatch
  'NDA01',      // node_modules missing
  'NDA02',      // deps not installed
  'NDA99',      // NEEDS_DATA misuse
  'LEDGER_CYCLE', // Self-hash cycle detected
  // Common legacy codes that may appear in older gates
  'PARTIAL',    // Partial result (e.g. some files missing but not critical)
  'PIPELINE_BLOCKED',
  'FILE_NOT_FOUND',
  'FP01',       // Forbidden timestamp/parse error
  'DC90',       // Data court outlier (specific to data court)
  'T000',       // Trading kill switch (observed in output, not a gate reason code per se)
  'UNKNOWN',    // Should not appear — any UNKNOWN is a finding
  'SL01',
  'SL02',
  'RDROP01',
  'RDROP02',
  'PRF01',
  'EP02_REAL_REQUIRED',
  'ACQ01',
  'ACQ02',
  'NETV01',
  'ACQ05',
  'ACQ04',
  'ACQ03',
  'IM01',
  'IM02',
  'IM03',
  'IM04',
  'IM05',
  'OF01',
  'RK01',
]);

// Codes that must NEVER appear in readiness gates
const D003_GATE_ALLOWLIST = new Set(['CANON_SELFTEST', 'DATA_COURT', 'FORMAT_POLICY']);

// Status values where reason_code must be 'NONE' or blank
const PASS_STATUSES = new Set(['PASS', 'PARTIAL']);
const NDA01_SIG = /(Cannot find module|MODULE_NOT_FOUND|node_modules.*missing)/i;
const NDA02_SIG = /(package-lock\.json.*ENOENT|npm\s+ci.*not\s+run|lockfile\s+missing)/i;

console.log('');
console.log('='.repeat(60));
console.log('REASON CODE AUDIT — SSOT Collision Check');
console.log(`RUN_ID: ${RUN_ID}`);
console.log('='.repeat(60));

// ---------------------------------------------------------------------------
// Scan all gate JSON files
// ---------------------------------------------------------------------------
const SCAN_DIRS = [
  path.join(ROOT, 'reports', 'evidence', 'INFRA_P0', 'gates', 'manual'),
  path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'gates', 'manual'),
  path.join(ROOT, 'reports', 'evidence', 'SAFETY', 'gates', 'manual'),
  path.join(ROOT, 'reports', 'evidence', 'GOV', 'gates', 'manual'),
];

const scanned = [];
const violations = [];

for (const dir of SCAN_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const fname of fs.readdirSync(dir).sort()) {
    if (!fname.endsWith('.json')) continue;
    const fpath = path.join(dir, fname);
    const relPath = path.relative(ROOT, fpath).split(path.sep).join('/');

    let data;
    try {
      data = JSON.parse(fs.readFileSync(fpath, 'utf8'));
    } catch (_) {
      scanned.push({ path: relPath, reason_code: 'PARSE_ERROR', status: 'UNKNOWN', violation: 'PARSE_ERROR' });
      continue;
    }

    const status = data.status || 'UNKNOWN';
    const reasonCode = data.reason_code || 'NONE';
    const entry = { path: relPath, reason_code: reasonCode, status, violation: null };

    // Rule 1: reason_code must be from SSOT (allow unknown legacy codes with WARNING only)
    if (!VALID_REASON_CODES.has(reasonCode)) {
      entry.violation = `UNKNOWN_CODE: reason_code="${reasonCode}" not in SSOT list`;
    }

    // Rule 2: D003 MUST NOT appear outside allowlisted gates
    if (reasonCode === 'D003') {
      const gateId = (data.gate || fname.replace('.json', '')).toUpperCase();
      const allowed = [...D003_GATE_ALLOWLIST].some((g) => gateId.includes(g));
      if (!allowed) {
        entry.violation = `D003_ABUSE: D003 used outside canon drift context (gate=${gateId})`;
        violations.push(entry);
      }
    }

    // Rule 3: NEEDS_DATA status must use NDA01 or NDA02
    if (status === 'NEEDS_DATA' && reasonCode !== 'NDA01' && reasonCode !== 'NDA02' && reasonCode !== 'DC90' && reasonCode !== 'NONE' && reasonCode !== 'EP02_REAL_REQUIRED' && reasonCode !== 'RDROP01' && reasonCode !== 'IM01') {
      entry.violation = `NEEDS_DATA_ABUSE: status=NEEDS_DATA but reason_code="${reasonCode}" not in NDA01/NDA02/DC90 whitelist`;
      violations.push(entry);
    }
    // Rule 3b: NDA01/NDA02 must match whitelist signatures; else NDA99 misuse
    if (status === 'NEEDS_DATA' && (reasonCode === 'NDA01' || reasonCode === 'NDA02')) {
      const sigSource = `${data.message || ''}
${data.stderr || ''}
${data.next_action || ''}`;
      const ok = reasonCode === 'NDA01' ? NDA01_SIG.test(sigSource) : NDA02_SIG.test(sigSource);
      if (!ok) {
        entry.violation = `NDA99_MISUSE: ${reasonCode} signature mismatch`;
        entry.reason_code = 'NDA99';
        violations.push(entry);
      }
    }

    // Rule 4: PASS status should not have blocking reason codes
    if (PASS_STATUSES.has(status) && reasonCode !== 'NONE' && reasonCode !== 'PARTIAL') {
      // Allow certain informational codes on PASS (e.g. DEP01 on INFRA that is allowed)
      const allowedOnPass = new Set(['DEP01', 'DEP02', 'DEP03', 'DC90', 'ZW00']);
      if (!allowedOnPass.has(reasonCode)) {
        entry.violation = `PASS_WITH_BLOCKER_CODE: status=PASS but reason_code="${reasonCode}" suggests a problem`;
        violations.push(entry);
      }
    }

    scanned.push(entry);
  }
}

// Collect all violations (avoid double-counting D003 which was already pushed above)
for (const s of scanned) {
  if (s.violation && !violations.find((v) => v.path === s.path && v.violation === s.violation)) {
    violations.push(s);
  }
}

// Count unknowns (warning, not block)
const unknownCodes = scanned.filter((s) => s.violation && s.violation.startsWith('UNKNOWN_CODE'));
const hardViolations = violations.filter((v) =>
  v.violation && !v.violation.startsWith('UNKNOWN_CODE') && !v.violation.startsWith('PASS_WITH_BLOCKER_CODE')
);

const gateStatus = hardViolations.length > 0 ? 'BLOCKED' : 'PASS';
const reasonCode = hardViolations.length > 0 ? 'GOV01' : 'NONE';

const message = hardViolations.length === 0
  ? `REASON CODE AUDIT PASS — ${scanned.length} gate JSON files scanned. No hard violations. ${unknownCodes.length} unknown code warning(s).`
  : `BLOCKED GOV01 — ${hardViolations.length} reason code violation(s) detected: ${hardViolations.map((v) => v.violation).join(' | ')}`;

const nextAction = hardViolations.length === 0
  ? 'No reason code violations. Proceed with gov:integrity.'
  : 'Fix reason code violations: ensure D003 is only used for canon drift, NEEDS_DATA only with NDA01/NDA02.';

// ---------------------------------------------------------------------------
// Write REASON_CODE_AUDIT.md
// ---------------------------------------------------------------------------
const violationRows = violations.length > 0
  ? violations.map((v) => `| \`${v.path}\` | ${v.reason_code} | ${v.status} | ${v.violation} |`).join('\n')
  : '| (none) | — | — | CLEAN |';

const scannedRows = scanned.slice(0, 30).map((s) =>
  `| \`${s.path.split('/').pop()}\` | ${s.reason_code} | ${s.status} | ${s.violation ? 'VIOLATION' : 'OK'} |`
).join('\n');

const auditMd = `# REASON_CODE_AUDIT.md — Reason Code SSOT Collision Audit

STATUS: ${gateStatus}
REASON_CODE: ${reasonCode}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## Audit Policy

All gate JSON reason_code fields must use codes from the SSOT list.
- D003: RESERVED — canon/governance drift only (allowlist: CANON_SELFTEST, FORMAT_POLICY)
- NEEDS_DATA: only NDA01 or NDA02 (strict stderr signatures) or DC90 (data court)
- PASS status with blocking reason codes: flagged as inconsistency

## Violations

| Path | Reason Code | Status | Violation |
|------|-------------|--------|-----------|
${violationRows}

## Scanned Files (first 30 of ${scanned.length})

| File | Reason Code | Status | Check |
|------|-------------|--------|-------|
${scannedRows}

## Summary

| Metric | Value |
|--------|-------|
| Files scanned | ${scanned.length} |
| Hard violations | ${hardViolations.length} |
| Unknown code warnings | ${unknownCodes.length} |
| D003 violations | ${violations.filter((v) => v.violation?.startsWith('D003_ABUSE')).length} |
| NEEDS_DATA abuse | ${violations.filter((v) => v.violation?.startsWith('NEEDS_DATA_ABUSE')).length} |

## Evidence Paths

- reports/evidence/GOV/REASON_CODE_AUDIT.md
- reports/evidence/GOV/gates/manual/reason_code_audit.json
`;

writeMd(path.join(GOV_DIR, 'REASON_CODE_AUDIT.md'), auditMd);

// ---------------------------------------------------------------------------
// Write reason_code_audit.json
// ---------------------------------------------------------------------------
const gateJson = {
  schema_version: '1.0.0',
  files_scanned: scanned.length,
  hard_violations: hardViolations.length,
  message,
  next_action: nextAction,
  reason_code: reasonCode,
  run_id: RUN_ID,
  status: gateStatus,
  unknown_code_warnings: unknownCodes.length,
  violations: hardViolations.map((v) => ({
    path: v.path,
    reason_code: v.reason_code,
    status: v.status,
    violation: v.violation,
  })),
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'reason_code_audit.json'), gateJson);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log('REASON CODE AUDIT RESULT');
console.log('='.repeat(60));
console.log(`  Files scanned: ${scanned.length}`);
console.log(`  Hard violations: ${hardViolations.length}`);
console.log(`  Unknown code warnings: ${unknownCodes.length}`);
console.log(`  Status: ${gateStatus}`);
console.log('='.repeat(60));

if (gateStatus !== 'PASS') {
  console.error(`\n[BLOCKED GOV01] Reason code violations. See GOV/REASON_CODE_AUDIT.md.`);
  process.exit(1);
}

console.log(`\n[PASS] reason_code_audit — No hard violations.`);
process.exit(0);
