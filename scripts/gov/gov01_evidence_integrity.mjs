/**
 * gov01_evidence_integrity.mjs — GOV01 Evidence Integrity Gate
 *
 * Implements P1_GOV01_ENFORCEMENT from SHAMAN_OS_FIRMWARE v2.0.1.
 *
 * Goal: Make "no manual evidence edits" mathematically enforceable.
 *
 * Mechanism:
 *   1. Recompute SCOPE_MANIFEST_SHA from current files → compare to anchored CHECKSUMS.md
 *   2. Recompute MERKLE_ROOT from current files → compare to anchored MERKLE_ROOT.md
 *   3. Recompute RECEIPTS_CHAIN final hash → compare to anchored RECEIPTS_CHAIN.md
 *   Any mismatch => BLOCKED GOV01.
 *
 * Writes:
 *   reports/evidence/GOV/GOV01_EVIDENCE_INTEGRITY.md
 *   reports/evidence/GOV/gates/manual/gov01_evidence_integrity.json
 *
 * Called by gov_integrity.mjs AFTER merkle_root.mjs has anchored MERKLE_ROOT.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, sha256Raw, sha256Norm, canonSort, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const GOV_DIR = path.join(ROOT, 'reports', 'evidence', 'GOV');
const MANUAL_DIR = path.join(GOV_DIR, 'gates', 'manual');

fs.mkdirSync(GOV_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

console.log('');
console.log('='.repeat(60));
console.log('GOV01 EVIDENCE INTEGRITY GATE');
console.log(`RUN_ID: ${RUN_ID}`);
console.log('='.repeat(60));

// ---------------------------------------------------------------------------
// Scope collection (mirrors edge_evidence_hashes.mjs)
// ---------------------------------------------------------------------------
const P0_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'P0');
const EDGE_LAB_DIR = path.join(ROOT, 'EDGE_LAB');
const SCRIPTS_DIR = path.join(ROOT, 'scripts', 'edge', 'edge_lab');

const SELF_OUTPUTS = new Set([
  'reports/evidence/GOV/MERKLE_ROOT.md',
  'reports/evidence/EDGE_LAB/P0/CHECKSUMS.md',
]);

function collectScope() {
  const paths = [];

  if (fs.existsSync(P0_DIR)) {
    for (const f of fs.readdirSync(P0_DIR).sort()) {
      const fp = path.join(P0_DIR, f);
      if (fs.statSync(fp).isFile() && f.endsWith('.md')) {
        const rel = `reports/evidence/EDGE_LAB/P0/${f}`;
        if (!SELF_OUTPUTS.has(rel)) paths.push(rel);
      }
    }
  }

  const manualDir = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'gates', 'manual');
  if (fs.existsSync(manualDir)) {
    for (const f of fs.readdirSync(manualDir).sort()) {
      if (f.endsWith('.json')) {
        paths.push(`reports/evidence/EDGE_LAB/gates/manual/${f}`);
      }
    }
  }

  if (fs.existsSync(EDGE_LAB_DIR)) {
    for (const f of fs.readdirSync(EDGE_LAB_DIR).sort()) {
      const fp = path.join(EDGE_LAB_DIR, f);
      if (fs.statSync(fp).isFile() && f.endsWith('.md')) {
        paths.push(`EDGE_LAB/${f}`);
      }
    }
  }

  if (fs.existsSync(SCRIPTS_DIR)) {
    for (const f of fs.readdirSync(SCRIPTS_DIR).sort()) {
      const fp = path.join(SCRIPTS_DIR, f);
      if (fs.statSync(fp).isFile() && f.endsWith('.mjs')) {
        paths.push(`scripts/edge/edge_lab/${f}`);
      }
    }
  }

  return canonSort(paths);
}

// ---------------------------------------------------------------------------
// Merkle tree helpers (mirrored from merkle_root.mjs)
// ---------------------------------------------------------------------------
function leafHash(relPath, content) {
  return sha256Raw(relPath + ':' + sha256Norm(content));
}

function parentHash(left, right) {
  return sha256Raw(left + right);
}

function buildMerkleRoot(leaves) {
  if (leaves.length === 0) return 'EMPTY';
  if (leaves.length === 1) return leaves[0];
  let current = leaves;
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = (i + 1 < current.length) ? current[i + 1] : current[i];
      next.push(parentHash(left, right));
    }
    current = next;
  }
  return current[0];
}

// ---------------------------------------------------------------------------
// Read anchored values
// ---------------------------------------------------------------------------
const CHECKSUMS_PATH = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'P0', 'CHECKSUMS.md');
const MERKLE_ROOT_PATH = path.join(ROOT, 'reports', 'evidence', 'GOV', 'MERKLE_ROOT.md');
const RECEIPTS_PATH = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'P0', 'RECEIPTS_CHAIN.md');

function readAnchored(filePath, pattern, label) {
  if (!fs.existsSync(filePath)) {
    return { found: false, value: `MISSING:${label}`, file: path.relative(ROOT, filePath) };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const m = content.match(pattern);
  if (!m) {
    return { found: false, value: `NOT_FOUND:${label}`, file: path.relative(ROOT, filePath) };
  }
  return { found: true, value: m[1], file: path.relative(ROOT, filePath) };
}

const anchoredScopeSha = readAnchored(
  CHECKSUMS_PATH,
  /scope_manifest_sha\s*\|\s*`([0-9a-f]{64})`/,
  'SCOPE_MANIFEST_SHA'
);
const anchoredMerkleRoot = readAnchored(
  MERKLE_ROOT_PATH,
  /MERKLE_ROOT:\s*`([0-9a-f]{64})`/,
  'MERKLE_ROOT'
);
const anchoredReceiptsHash = readAnchored(
  RECEIPTS_PATH,
  /final_chain_hash\s*\|\s*`([0-9a-f]{64})`/,
  'RECEIPTS_CHAIN_FINAL'
);

console.log(`[GOV01] Anchored SCOPE_MANIFEST_SHA: ${anchoredScopeSha.found ? anchoredScopeSha.value.slice(0, 16) + '…' : anchoredScopeSha.value}`);
console.log(`[GOV01] Anchored MERKLE_ROOT: ${anchoredMerkleRoot.found ? anchoredMerkleRoot.value.slice(0, 16) + '…' : anchoredMerkleRoot.value}`);
console.log(`[GOV01] Anchored RECEIPTS final: ${anchoredReceiptsHash.found ? anchoredReceiptsHash.value.slice(0, 16) + '…' : anchoredReceiptsHash.value}`);

// ---------------------------------------------------------------------------
// Recompute all three from current files
// ---------------------------------------------------------------------------
const scopePaths = collectScope();
const scopeManifestContent = scopePaths.join('\n') + '\n';
const computedScopeManifestSha = sha256Raw(scopeManifestContent);

// Recompute Merkle root
const leafHashes = [];
for (const rel of scopePaths) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) {
    const content = fs.readFileSync(abs, 'utf8');
    leafHashes.push(leafHash(rel, content));
  }
}
const computedMerkleRoot = buildMerkleRoot(leafHashes);

// Recompute RECEIPTS_CHAIN final hash
// The receipts chain is: sha256_raw(prev_hash + ":" + sha256_norm) for each file in scope (sorted)
// Initial hash: "GENESIS"
let chainHash = 'GENESIS';
for (const rel of scopePaths) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) {
    const content = fs.readFileSync(abs, 'utf8');
    const norm = sha256Norm(content);
    chainHash = sha256Raw(chainHash + ':' + norm);
  }
}
const computedReceiptsHash = chainHash;

console.log(`[GOV01] Computed SCOPE_MANIFEST_SHA: ${computedScopeManifestSha.slice(0, 16)}…`);
console.log(`[GOV01] Computed MERKLE_ROOT: ${computedMerkleRoot.slice(0, 16)}…`);
console.log(`[GOV01] Computed RECEIPTS final: ${computedReceiptsHash.slice(0, 16)}…`);

// ---------------------------------------------------------------------------
// Compare anchored vs computed
// ---------------------------------------------------------------------------
const comparisons = [
  {
    id: 'C01_SCOPE_MANIFEST_SHA',
    label: 'SCOPE_MANIFEST_SHA',
    anchored: anchoredScopeSha.value,
    computed: computedScopeManifestSha,
    anchor_found: anchoredScopeSha.found,
    anchor_file: anchoredScopeSha.file,
  },
  {
    id: 'C02_MERKLE_ROOT',
    label: 'MERKLE_ROOT',
    anchored: anchoredMerkleRoot.value,
    computed: computedMerkleRoot,
    anchor_found: anchoredMerkleRoot.found,
    anchor_file: anchoredMerkleRoot.file,
  },
  {
    id: 'C03_RECEIPTS_CHAIN_FINAL',
    label: 'RECEIPTS_CHAIN_FINAL',
    anchored: anchoredReceiptsHash.value,
    computed: computedReceiptsHash,
    anchor_found: anchoredReceiptsHash.found,
    anchor_file: anchoredReceiptsHash.file,
  },
];

for (const c of comparisons) {
  if (!c.anchor_found) {
    c.match = false;
    c.note = `Anchor file missing or value not found: ${c.anchor_file}`;
  } else {
    c.match = c.anchored === c.computed;
    c.note = c.match ? 'MATCH — no tampering detected' : 'MISMATCH — possible manual edit or evidence drift';
  }
}

const mismatches = comparisons.filter((c) => !c.match);
const gateStatus = mismatches.length === 0 ? 'PASS' : 'BLOCKED';
const reasonCode = mismatches.length === 0 ? 'NONE' : 'GOV01';

const message = mismatches.length === 0
  ? `GOV01 PASS — Evidence integrity verified. All 3 anchored values match recomputed values. No manual edits detected.`
  : `BLOCKED GOV01 — Evidence integrity mismatch detected in ${mismatches.length} check(s): ${mismatches.map((c) => c.id).join(', ')}. Manual edit or drift suspected.`;

const nextAction = mismatches.length === 0
  ? 'Evidence integrity proven. Proceed to EDGE_UNLOCK evaluation.'
  : `Investigate mismatches: ${mismatches.map((c) => c.label).join(', ')}. Re-run evidence generation scripts (edge:calm:p0, gov:merkle) to restore integrity. Do NOT manually edit evidence files.`;

// ---------------------------------------------------------------------------
// Write GOV01_EVIDENCE_INTEGRITY.md
// ---------------------------------------------------------------------------
const compTable = comparisons.map((c) =>
  `| ${c.id} | ${c.anchored.slice(0, 16)}… | ${c.computed.slice(0, 16)}… | ${c.match ? 'MATCH' : 'MISMATCH'} | ${c.note} |`
).join('\n');

const integrityMd = `# GOV01_EVIDENCE_INTEGRITY.md — P1 GOV01 Evidence Integrity Gate

STATUS: ${gateStatus}
REASON_CODE: ${reasonCode}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## GOV01 Policy

Evidence MUST NOT be manually edited (MANUAL_EDITS_FORBIDDEN=true).
This gate makes the policy mathematical: recomputed values must match anchored ones.
Any mismatch => BLOCKED GOV01.

## Comparison Results

| Check | Anchored (prefix) | Computed (prefix) | Result | Note |
|-------|-------------------|-------------------|--------|------|
${compTable}

## Scope Summary

| Metric | Value |
|--------|-------|
| Files in scope | ${scopePaths.length} |
| Files accessible | ${leafHashes.length} |
| Comparisons | ${comparisons.length} |
| Mismatches | ${mismatches.length} |

## Evidence Anchors

| Anchor | File |
|--------|------|
| SCOPE_MANIFEST_SHA | ${anchoredScopeSha.file} |
| MERKLE_ROOT | ${anchoredMerkleRoot.file} |
| RECEIPTS_CHAIN_FINAL | ${anchoredReceiptsHash.file} |

## Evidence Paths

- reports/evidence/GOV/GOV01_EVIDENCE_INTEGRITY.md
- reports/evidence/GOV/gates/manual/gov01_evidence_integrity.json
`;

writeMd(path.join(GOV_DIR, 'GOV01_EVIDENCE_INTEGRITY.md'), integrityMd);

// ---------------------------------------------------------------------------
// Write gov01_evidence_integrity.json
// ---------------------------------------------------------------------------
const gateJson = {
  schema_version: '1.0.0',
  comparisons: comparisons.map((c) => ({
    anchor_file: c.anchor_file,
    anchor_found: c.anchor_found,
    anchored: c.anchored,
    computed: c.computed,
    id: c.id,
    label: c.label,
    match: c.match,
    note: c.note,
  })),
  files_in_scope: scopePaths.length,
  message,
  mismatch_count: mismatches.length,
  next_action: nextAction,
  reason_code: reasonCode,
  run_id: RUN_ID,
  status: gateStatus,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'gov01_evidence_integrity.json'), gateJson);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log('GOV01 INTEGRITY RESULTS');
console.log('='.repeat(60));
for (const c of comparisons) {
  console.log(`  [${c.match ? 'MATCH' : 'MISMATCH'}] ${c.id}: ${c.note}`);
}
console.log(`\nFINAL: ${gateStatus}${reasonCode !== 'NONE' ? ' ' + reasonCode : ''}`);
console.log('='.repeat(60));

if (gateStatus !== 'PASS') {
  console.error(`\n[BLOCKED GOV01] Evidence integrity mismatch. See GOV/GOV01_EVIDENCE_INTEGRITY.md.`);
  process.exit(1);
}

console.log(`\n[PASS] gov01_evidence_integrity — All anchored values match. Evidence integrity confirmed.`);
process.exit(0);
