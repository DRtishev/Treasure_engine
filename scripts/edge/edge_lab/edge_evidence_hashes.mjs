/**
 * edge_evidence_hashes.mjs — P0 CHECKSUMS gate
 *
 * Implements R5 (dual-hash), R11 (ASCII sort + SCOPE_MANIFEST_SHA + fixed field order).
 *
 * Collects all evidence files in scope, computes sha256_raw + sha256_norm for each,
 * derives SCOPE_MANIFEST_SHA from sorted path list, and writes:
 * - reports/evidence/EDGE_LAB/P0/CHECKSUMS.md
 *
 * Scope: (ASCII lexicographic)
 * 1. reports/evidence/EDGE_LAB/P0/*.md
 * 2. reports/evidence/EDGE_LAB/gates/manual/*.json (existing)
 * 3. EDGE_LAB/*.md
 * 4. scripts/edge/edge_lab/*.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import {
  RUN_ID,
  sha256Raw,
  sha256Norm,
  stableEvidenceNormalize,
  canonSort,
} from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const P0_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'P0');
const MANUAL_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'gates', 'manual');

fs.mkdirSync(P0_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Collect scope (self-outputs excluded to prevent acyclic ledger violation)
// ---------------------------------------------------------------------------
const EXCLUDED_DERIVED = new Set([
  'reports/evidence/EDGE_LAB/P0/CHECKSUMS.md',
  'reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md',
  'reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md',
  'reports/evidence/EDGE_LAB/gates/manual/evidence_hashes.json',
  'reports/evidence/EDGE_LAB/gates/manual/receipts_chain.json',
  'reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json',
  'reports/evidence/EDGE_LAB/gates/manual/calm_p0_x2.json',
]);

function collectScope() {
  const paths = [];

  // 1) P0 evidence files
  if (fs.existsSync(P0_DIR)) {
    for (const f of fs.readdirSync(P0_DIR).sort()) {
      const fp = path.join(P0_DIR, f);
      if (fs.statSync(fp).isFile() && f.endsWith('.md')) {
        const rel = `reports/evidence/EDGE_LAB/P0/${f}`;
        if (!EXCLUDED_DERIVED.has(rel)) paths.push(rel);
      }
    }
  }

  // 2) Gate JSON files (existing EDGE_LAB gates)
  const manualDir = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'gates', 'manual');
  if (fs.existsSync(manualDir)) {
    for (const f of fs.readdirSync(manualDir).sort()) {
      if (f.endsWith('.json')) {
        const rel = `reports/evidence/EDGE_LAB/gates/manual/${f}`;
        if (!EXCLUDED_DERIVED.has(rel) && !/final/i.test(f)) paths.push(rel);
      }
    }
  }

  // 3) EDGE_LAB/*.md governance
  const edgeLabDir = path.join(ROOT, 'EDGE_LAB');
  if (fs.existsSync(edgeLabDir)) {
    for (const f of fs.readdirSync(edgeLabDir).sort()) {
      const fp = path.join(edgeLabDir, f);
      if (fs.statSync(fp).isFile() && f.endsWith('.md')) {
        paths.push(`EDGE_LAB/${f}`);
      }
    }
  }

  // 4) Pipeline scripts
  const scriptsDir = path.join(ROOT, 'scripts', 'edge', 'edge_lab');
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir).sort()) {
      const fp = path.join(scriptsDir, f);
      if (fs.statSync(fp).isFile() && f.endsWith('.mjs')) {
        paths.push(`scripts/edge/edge_lab/${f}`);
      }
    }
  }

  // Return ASCII lexicographic sorted paths (R11)
  return canonSort(paths);
}

const scopePaths = collectScope();

// ---------------------------------------------------------------------------
// SCOPE_MANIFEST_SHA (R11)
// ---------------------------------------------------------------------------
const scopeManifestContent = scopePaths.join('\n') + '\n';
const SCOPE_MANIFEST_SHA = sha256Raw(scopeManifestContent);

// ---------------------------------------------------------------------------
// Read EVIDENCE_CANON_RULES.md for norm_rules_sha
// ---------------------------------------------------------------------------
const canonRulesPath = path.join(ROOT, 'EDGE_LAB', 'EVIDENCE_CANON_RULES.md');
const canonRulesContent = fs.existsSync(canonRulesPath)
  ? fs.readFileSync(canonRulesPath, 'utf8')
  : '';
const NORM_RULES_SHA = sha256Raw(canonRulesContent);

// ---------------------------------------------------------------------------
// Hash each file
// ---------------------------------------------------------------------------
const entries = [];
const missingFiles = [];

for (const rel of scopePaths) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    missingFiles.push(rel);
    continue;
  }
  const content = fs.readFileSync(abs, 'utf8');
  entries.push({
    path: rel,
    sha256_raw: sha256Raw(content),
    sha256_norm: sha256Norm(content),
  });
}

// ---------------------------------------------------------------------------
// Determine status
// ---------------------------------------------------------------------------
const status = missingFiles.length === 0 ? 'PASS' : 'BLOCKED';
const reason_code = missingFiles.length === 0 ? 'NONE' : 'E004';
const message = status === 'PASS'
  ? `All ${entries.length} scoped files hashed (sha256_raw + sha256_norm). SCOPE_MANIFEST_SHA=${SCOPE_MANIFEST_SHA.slice(0, 16)}...`
  : `${missingFiles.length} file(s) in scope are missing: ${missingFiles.join(', ')}`;
const next_action = status === 'PASS'
  ? 'Proceed to RECEIPTS_CHAIN.'
  : `Regenerate missing evidence files before running edge_evidence_hashes.`;

// ---------------------------------------------------------------------------
// Write CHECKSUMS.md (R14 — evidence is md-only)
// ---------------------------------------------------------------------------
const hashRows = entries.map((e) =>
  `| \`${e.path}\` | \`${e.sha256_raw}\` | \`${e.sha256_norm}\` |`
).join('\n');

const missingSection = missingFiles.length > 0
  ? missingFiles.map((f) => `- MISSING: ${f}`).join('\n')
  : '- NONE';

const checksumsMd = `# CHECKSUMS.md — P0 Evidence Hash Ledger

STATUS: ${status}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${next_action}

## Metadata

| Field | Value |
|-------|-------|
| scope_manifest_sha | \`${SCOPE_MANIFEST_SHA}\` |
| norm_rules_sha | \`${NORM_RULES_SHA}\` |
| files_in_scope | ${scopePaths.length} |
| files_hashed | ${entries.length} |
| files_missing | ${missingFiles.length} |

## Hash Ledger (sha256_raw + sha256_norm, ASCII sorted)

| Path | sha256_raw | sha256_norm |
|------|-----------|------------|
${hashRows}

## Scope Manifest

\`\`\`
${scopePaths.join('\n')}
\`\`\`

## Missing Files

${missingSection}

## SCOPE_POLICY

Excluded derived artifacts to keep hashing acyclic and deterministic:
- reports/evidence/EDGE_LAB/P0/CHECKSUMS.md
- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
- reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md
- reports/evidence/EDGE_LAB/gates/manual/evidence_hashes.json
- reports/evidence/EDGE_LAB/gates/manual/receipts_chain.json
- reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json
- reports/evidence/EDGE_LAB/gates/manual/calm_p0_x2.json
- reports/evidence/EDGE_LAB/gates/manual/*final*.json

## Policy References

- R5: dual-hash doctrine (sha256_raw + sha256_norm per entry)
- R11: ASCII lexicographic path sort; SCOPE_MANIFEST_SHA required
- EDGE_LAB/EVIDENCE_CANON_RULES.md: normalization rules (norm_rules_sha)
- EDGE_LAB/UPDATE_SCOPE_POLICY.md: scope change governance
`;

fs.writeFileSync(path.join(P0_DIR, 'CHECKSUMS.md'), checksumsMd);

if (status === 'PASS') {
  console.log(`[PASS] edge_evidence_hashes — ${entries.length} files hashed, SCOPE_MANIFEST_SHA=${SCOPE_MANIFEST_SHA.slice(0, 16)}...`);
  process.exit(0);
} else {
  console.error(`[${status}] edge_evidence_hashes — ${reason_code}: ${message}`);
  process.exit(1);
}
