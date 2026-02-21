/**
 * edge_data_court.mjs — P0 Data Court
 *
 * SINGLE_SOURCE_MODE (default): validates that all evidence data comes from
 * a single authoritative source. Outlier detection => DC90 NEEDS_DATA.
 *
 * DATA_SOURCE_CONFIRMED=1: confirms the authoritative source and proceeds.
 *
 * Writes: reports/evidence/EDGE_LAB/P0/DATA_COURT.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, sha256Norm, canonSort } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const P0_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'P0');
const MANUAL_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'gates', 'manual');
const DATA_CONFIRM_POLICY_PATH = path.join(ROOT, 'EDGE_LAB', 'DATA_CONFIRM_POLICY.md');

fs.mkdirSync(P0_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const singleSourceMode = process.env.DATA_SOURCE_MODE !== 'MULTI';
const sourceConfirmed = process.env.DATA_SOURCE_CONFIRMED === '1';
const policyExists = fs.existsSync(DATA_CONFIRM_POLICY_PATH);

// ---------------------------------------------------------------------------
// Scan for evidence data sources
// ---------------------------------------------------------------------------
const DATA_DIRS = [
  path.join(ROOT, 'artifacts', 'incoming'),
  path.join(ROOT, 'data', 'fixtures'),
  path.join(ROOT, 'data', 'raw'),
  path.join(ROOT, 'data', 'normalized'),
];

const PAPER_EVIDENCE_PATH = path.join(ROOT, 'artifacts', 'incoming', 'paper_evidence.json');
const EVIDENCE_JSON_PATHS = [PAPER_EVIDENCE_PATH];

// ---------------------------------------------------------------------------
// Source detection
// ---------------------------------------------------------------------------
const detectedSources = [];

for (const dataDir of DATA_DIRS) {
  if (fs.existsSync(dataDir)) {
    const label = path.relative(ROOT, dataDir);
    detectedSources.push({ source: label, present: true });
  }
}

// Check for multiple conflicting paper evidence files
const paperEvidenceFiles = [];
for (const dataDir of DATA_DIRS) {
  const candidates = ['paper_evidence.json', 'paper_evidence_v2.json', 'paper_evidence_backup.json'];
  for (const c of candidates) {
    const fp = path.join(dataDir, c);
    if (fs.existsSync(fp)) {
      const content = fs.readFileSync(fp, 'utf8');
      paperEvidenceFiles.push({
        path: path.relative(ROOT, fp),
        sha256_norm: sha256Norm(content),
      });
    }
  }
}

// Detect outliers: multiple paper evidence files with different content
const uniqueNorms = new Set(paperEvidenceFiles.map((f) => f.sha256_norm));
const hasOutlier = paperEvidenceFiles.length > 1 && uniqueNorms.size > 1;

// ---------------------------------------------------------------------------
// Determine outcome
// ---------------------------------------------------------------------------
let status, reason_code, message, next_action;

if (!policyExists) {
  status = 'BLOCKED';
  reason_code = 'E004';
  message = 'DATA_CONFIRM_POLICY.md is missing. Cannot determine data confirmation rules.';
  next_action = 'Create EDGE_LAB/DATA_CONFIRM_POLICY.md per INFRA_P0 specification.';
} else if (hasOutlier && singleSourceMode && !sourceConfirmed) {
  status = 'NEEDS_DATA';
  reason_code = 'DC90';
  message = `Data outlier detected: ${paperEvidenceFiles.length} conflicting paper evidence files with ${uniqueNorms.size} unique sha256_norm values. Manual confirmation required.`;
  next_action = `Identify the authoritative source, then set DATA_SOURCE_CONFIRMED=1 and rerun. Conflicting files: ${paperEvidenceFiles.map((f) => f.path).join(', ')}`;
} else if (paperEvidenceFiles.length === 0) {
  // No paper evidence — acceptable, NEEDS_DATA is non-blocking at P0
  status = 'NEEDS_DATA';
  reason_code = 'DC90';
  message = 'No paper_evidence.json found. P0 data court requires at least one evidence file to confirm source.';
  next_action = 'Provide artifacts/incoming/paper_evidence.json to proceed with data confirmation.';
} else {
  // Single source confirmed or no conflict
  const sourceDesc = sourceConfirmed
    ? 'DATA_SOURCE_CONFIRMED=1 set by operator'
    : 'single source (no conflict detected)';
  status = 'PASS';
  reason_code = 'NONE';
  message = `Data court PASS: ${sourceDesc}. ${paperEvidenceFiles.length} evidence file(s) verified. SINGLE_SOURCE_MODE=${singleSourceMode}.`;
  next_action = 'No action required. Data source is confirmed.';
}

// ---------------------------------------------------------------------------
// Write DATA_COURT.md
// ---------------------------------------------------------------------------
const sourceTable = detectedSources.length > 0
  ? detectedSources.map((s) => `| \`${s.source}\` | ${s.present ? 'PRESENT' : 'MISSING'} |`).join('\n')
  : '| — | No data directories found |';

const paperFilesTable = paperEvidenceFiles.length > 0
  ? paperEvidenceFiles.map((f) => `| \`${f.path}\` | \`${f.sha256_norm.slice(0, 16)}…\` |`).join('\n')
  : '| — | No paper evidence files found |';

const dataCourtMd = `# DATA_COURT.md — P0 Data Source Court

STATUS: ${status}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${next_action}

## Configuration

| Setting | Value |
|---------|-------|
| DATA_SOURCE_MODE | ${singleSourceMode ? 'SINGLE_SOURCE (default)' : 'MULTI'} |
| DATA_SOURCE_CONFIRMED | ${sourceConfirmed ? '1 (confirmed)' : 'not set'} |
| policy_present | ${policyExists} |

## Detected Data Directories

| Directory | Status |
|-----------|--------|
${sourceTable}

## Paper Evidence Files

| File | sha256_norm (prefix) |
|------|---------------------|
${paperFilesTable}

## Outlier Analysis

| Metric | Value |
|--------|-------|
| paper_evidence_files | ${paperEvidenceFiles.length} |
| unique_sha256_norm | ${uniqueNorms.size} |
| outlier_detected | ${hasOutlier} |

## Message

${message}

## Policy Reference

EDGE_LAB/DATA_CONFIRM_POLICY.md

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/DATA_COURT.md
`;

fs.writeFileSync(path.join(P0_DIR, 'DATA_COURT.md'), dataCourtMd);

const icon = status === 'PASS' ? '[PASS]' : status === 'NEEDS_DATA' ? '[NEEDS_DATA]' : `[${status}]`;
console.log(`${icon} edge_data_court — ${reason_code}: ${message}`);

// NEEDS_DATA is non-blocking (exit 0) per R1 / severity policy
process.exit(status === 'FAIL' ? 1 : 0);
