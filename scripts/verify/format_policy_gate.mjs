/**
 * format_policy_gate.mjs — FP01 format policy enforcement
 *
 * Validates that:
 * 1. Evidence files use .md format (no JSON at root evidence level)
 * 2. Machine JSON only under gates/ directories
 * 3. All NEW machine JSON (P0/INFRA_P0 scope) has schema_version + no timestamps
 *
 * SCOPE POLICY:
 * - STRICT scope: P0 + INFRA_P0 gate files (new in this hardening) → FAIL on violation
 * - LEGACY scope: pre-existing EDGE_LAB gate files → WARN only (migration scheduled)
 *
 * FP01: FAIL — Forbidden evidence format OR strict-scope machine JSON violations
 * PASS: All strict-scope rules satisfied (legacy warnings may be present)
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_ROOT = path.join(ROOT, 'reports', 'evidence');
const INFRA_EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'INFRA_P0');
const MANUAL_DIR = path.join(INFRA_EVIDENCE_DIR, 'gates', 'manual');
const FORMAT_POLICY_PATH = path.join(ROOT, 'FORMAT_POLICY.md');

const FORBIDDEN_EVIDENCE_EXTENSIONS = ['.json', '.csv', '.txt', '.yaml', '.yml', '.html', '.xml'];

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const policyExists = fs.existsSync(FORMAT_POLICY_PATH);
const violations = [];      // strict violations => FAIL
const legacyWarnings = [];  // legacy warnings => WARN only
const checks = [];
const sampledJsonFiles = [];

// ---------------------------------------------------------------------------
// Helper: collect direct-child files of a directory
// ---------------------------------------------------------------------------
function getDirectChildren(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .map((f) => path.join(dir, f))
    .filter((fp) => fs.statSync(fp).isFile());
}

// ---------------------------------------------------------------------------
// Check 1: FORMAT_POLICY.md must exist
// ---------------------------------------------------------------------------
if (!policyExists) {
  violations.push({
    type: 'FP01',
    path: 'FORMAT_POLICY.md',
    detail: 'FORMAT_POLICY.md is missing. Cannot enforce format policy without SSOT.',
    scope: 'STRICT',
  });
}
checks.push({ check: 'FORMAT_POLICY.md', result: policyExists ? 'PRESENT' : 'MISSING' });

// ---------------------------------------------------------------------------
// Check 2: Evidence root directories must not contain non-md files directly
// ---------------------------------------------------------------------------
function checkEvidenceDir(dir) {
  if (!fs.existsSync(dir)) return;

  // Check direct root files
  const children = getDirectChildren(dir);
  for (const fp of children) {
    const ext = path.extname(fp).toLowerCase();
    if (ext !== '.md') {
      const rel = path.relative(ROOT, fp);
      if (rel.includes('gates')) continue;  // gates/ subdirs allowed to have JSON
      if (FORBIDDEN_EVIDENCE_EXTENSIONS.includes(ext)) {
        violations.push({
          type: 'FP01',
          path: rel,
          detail: `Forbidden evidence format "${ext}" at evidence root. Only .md files allowed at evidence root level.`,
          scope: 'STRICT',
        });
      }
    }
  }

  // Recurse into subdirs (but NOT gates/ — those are allowed to have JSON)
  const subdirs = fs.readdirSync(dir)
    .map((f) => path.join(dir, f))
    .filter((fp) => fs.statSync(fp).isDirectory() && !fp.endsWith('gates'));

  for (const subdir of subdirs) {
    checkEvidenceDir(subdir);
  }
}

// Check EDGE_LAB evidence root
const edgeLabEvidenceDir = path.join(EVIDENCE_ROOT, 'EDGE_LAB');
if (fs.existsSync(edgeLabEvidenceDir)) {
  checkEvidenceDir(edgeLabEvidenceDir);
  checks.push({ check: 'EDGE_LAB_evidence_root', result: 'CHECKED' });
}

// Check INFRA_P0 evidence root
if (fs.existsSync(INFRA_EVIDENCE_DIR)) {
  checkEvidenceDir(INFRA_EVIDENCE_DIR);
  checks.push({ check: 'INFRA_P0_evidence_root', result: 'CHECKED' });
}

// ---------------------------------------------------------------------------
// Check 3: Machine JSON schema_version (scoped)
// ---------------------------------------------------------------------------
function collectJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const fp = path.join(d, f);
      if (fs.statSync(fp).isDirectory()) walk(fp);
      else if (f.endsWith('.json')) files.push(fp);
    }
  }
  walk(dir);
  return files;
}

function checkJsonFile(fp, scope) {
  const rel = path.relative(ROOT, fp);
  try {
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const hasSchemaVersion = 'schema_version' in data;
    const hasTimestamps = Object.keys(data).some((k) =>
      /_at$|_ts$|^timestamp|^created|^updated|^generated|^date/.test(k)
    );

    sampledJsonFiles.push({
      file: rel,
      has_timestamps: hasTimestamps,
      schema_version: hasSchemaVersion ? data.schema_version : 'MISSING',
      scope,
    });

    if (!hasSchemaVersion || hasTimestamps) {
      const detail = [
        !hasSchemaVersion ? 'missing schema_version' : null,
        hasTimestamps ? 'forbidden timestamp field(s)' : null,
      ].filter(Boolean).join('; ');

      if (scope === 'STRICT') {
        violations.push({ type: 'FP01', path: rel, detail, scope });
      } else {
        legacyWarnings.push({ type: 'FP01_WARN', path: rel, detail, scope, migration: 'SCHEDULED' });
      }
    }
  } catch (e) {
    const detail = `Machine JSON parse error: ${e.message}`;
    if (scope === 'STRICT') {
      violations.push({ type: 'FP01', path: rel, detail, scope });
    } else {
      legacyWarnings.push({ type: 'FP01_WARN', path: rel, detail, scope, migration: 'SCHEDULED' });
    }
  }
}

// STRICT: P0 and INFRA_P0 gate files (new in this hardening)
const p0Dir = path.join(EVIDENCE_ROOT, 'EDGE_LAB', 'P0');
const infraGatesDir = path.join(INFRA_EVIDENCE_DIR, 'gates');
const strictJsonFiles = [
  ...collectJsonFiles(p0Dir).filter((f) => f.endsWith('.json')),
  ...collectJsonFiles(infraGatesDir),
];
for (const fp of strictJsonFiles) checkJsonFile(fp, 'STRICT');

// LEGACY: pre-existing EDGE_LAB gate files
const legacyGatesDir = path.join(EVIDENCE_ROOT, 'EDGE_LAB', 'gates');
const legacyJsonFiles = collectJsonFiles(legacyGatesDir).filter((fp) => {
  const rel = path.relative(ROOT, fp);
  return !rel.includes('/P0/');  // exclude new P0 files already checked above
});
for (const fp of legacyJsonFiles) checkJsonFile(fp, 'LEGACY');

const totalJsonFiles = strictJsonFiles.length + legacyJsonFiles.length;
if (totalJsonFiles > 0) {
  checks.push({
    check: 'machine_json_schema_version',
    result: 'CHECKED',
    strict_count: strictJsonFiles.length,
    legacy_count: legacyJsonFiles.length,
  });
}

// ---------------------------------------------------------------------------
// Determine outcome
// ---------------------------------------------------------------------------
let status, reason_code, message, next_action;

if (violations.length > 0) {
  status = 'FAIL';
  reason_code = 'FP01';
  message = `${violations.length} strict-scope FP01 violation(s) found. ${legacyWarnings.length} legacy warning(s) scheduled for migration.`;
  next_action = `Fix strict-scope violations: ${violations.slice(0, 3).map((v) => v.path).join(', ')}${violations.length > 3 ? '...' : ''}.`;
} else {
  status = 'PASS';
  reason_code = 'NONE';
  message = `Format policy satisfied (strict scope). ${strictJsonFiles.length} new JSON file(s) verified. ${legacyWarnings.length} legacy file(s) queued for schema_version migration.`;
  next_action = legacyWarnings.length > 0
    ? `Migrate ${legacyWarnings.length} legacy EDGE_LAB gate JSON files to schema_version in a follow-up PR.`
    : 'No action required. Format policy fully compliant.';
}

// Write machine JSON
const gateResult = {
  schema_version: '1.0.0',
  checks,
  legacy_warnings: legacyWarnings.slice(0, 30),
  legacy_warnings_count: legacyWarnings.length,
  message,
  next_action,
  policy_present: policyExists,
  reason_code,
  run_id: RUN_ID,
  status,
  strict_json_checked: strictJsonFiles.length,
  violations,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'format_policy_gate.json'), gateResult);

// Write markdown evidence
const violationsSection = violations.length > 0
  ? violations.map((v) => `- **${v.type}** (${v.scope}) \`${v.path}\`: ${v.detail}`).join('\n')
  : '- NONE';

const legacySection = legacyWarnings.length > 0
  ? legacyWarnings.slice(0, 10).map((w) => `- **WARN** \`${w.path}\`: ${w.detail} [MIGRATION_SCHEDULED]`).join('\n') +
    (legacyWarnings.length > 10 ? `\n- ... and ${legacyWarnings.length - 10} more` : '')
  : '- NONE';

const md = `# FORMAT_POLICY_GATE.md

STATUS: ${status}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${next_action}

## Gate Results

| Check | Result |
|-------|--------|
| policy_file | ${policyExists ? 'PRESENT' : 'MISSING'} |
| strict_json_checked | ${strictJsonFiles.length} (P0 + INFRA_P0) |
| legacy_json_checked | ${legacyJsonFiles.length} (pre-existing EDGE_LAB) |
| strict_violations | ${violations.length} |
| legacy_warnings | ${legacyWarnings.length} (WARN only, migration scheduled) |

## Strict-Scope Violations (FAIL if any)

${violationsSection}

## Legacy Warnings (WARN only — pre-existing, migration scheduled)

${legacySection}

## Scope Policy

- **STRICT** (P0 + INFRA_P0 new files): violations cause FAIL FP01
- **LEGACY** (pre-existing EDGE_LAB gate JSON): violations cause WARN only; migration to schema_version scheduled

## Message

${message}

## Evidence Paths

- reports/evidence/INFRA_P0/gates/manual/format_policy_gate.json
- reports/evidence/INFRA_P0/FORMAT_POLICY_GATE.md
`;

fs.writeFileSync(path.join(INFRA_EVIDENCE_DIR, 'FORMAT_POLICY_GATE.md'), md);

if (status === 'PASS') {
  console.log(`[PASS] format_policy_gate — ${message}`);
  process.exit(0);
} else {
  console.error(`[${status}] format_policy_gate — ${reason_code}: ${message}`);
  process.exit(1);
}
