/**
 * merkle_root.mjs — P1 Merkle Root Integrity Anchor
 *
 * Implements P1_MERKLE_ROOT from SHAMAN_OS_FIRMWARE v2.0.1.
 *
 * Goal: Fast integrity anchor of the evidence set via Merkle tree.
 *
 * Algorithm:
 *   1. Scan the same scope as CHECKSUMS.md (EDGE_LAB/P0 evidence + gates + scripts)
 *   2. For each file (ASCII sorted): compute sha256_norm(content)
 *   3. Leaf hashes: sha256_raw(relpath + ":" + sha256_norm) for each file
 *   4. Binary Merkle tree: pair-hash leaves up to single root
 *      - If odd count at any level, duplicate last element (standard Bitcoin-style)
 *   5. Anchor root in MERKLE_ROOT.md + merkle_root.json
 *
 * Writes:
 *   reports/evidence/GOV/MERKLE_ROOT.md
 *   reports/evidence/GOV/gates/manual/merkle_root.json
 *
 * The root hash is used by GOV01 to detect any evidence tampering.
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
console.log('P1 MERKLE ROOT — Evidence Integrity Anchor');
console.log(`RUN_ID: ${RUN_ID}`);
console.log('='.repeat(60));

// ---------------------------------------------------------------------------
// Collect scope (same as edge_evidence_hashes.mjs)
// ---------------------------------------------------------------------------
const P0_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'P0');
const EDGE_LAB_DIR = path.join(ROOT, 'EDGE_LAB');
const SCRIPTS_DIR = path.join(ROOT, 'scripts', 'edge', 'edge_lab');

// Self-outputs excluded to prevent circular hashing
const EXCLUDED_DERIVED = new Set([
  'reports/evidence/GOV/MERKLE_ROOT.md',
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

  // 1) P0 evidence files (*.md in EDGE_LAB/P0)
  if (fs.existsSync(P0_DIR)) {
    for (const f of fs.readdirSync(P0_DIR).sort()) {
      const fp = path.join(P0_DIR, f);
      if (fs.statSync(fp).isFile() && f.endsWith('.md')) {
        const rel = `reports/evidence/EDGE_LAB/P0/${f}`;
        if (!EXCLUDED_DERIVED.has(rel)) paths.push(rel);
      }
    }
  }

  // 2) Gate JSON files (EDGE_LAB/gates/manual/*.json)
  const manualDir = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'gates', 'manual');
  if (fs.existsSync(manualDir)) {
    for (const f of fs.readdirSync(manualDir).sort()) {
      if (f.endsWith('.json')) {
        const rel = `reports/evidence/EDGE_LAB/gates/manual/${f}`;
        if (!EXCLUDED_DERIVED.has(rel) && !/final/i.test(f)) paths.push(rel);
      }
    }
  }

  // 3) EDGE_LAB/*.md governance docs
  if (fs.existsSync(EDGE_LAB_DIR)) {
    for (const f of fs.readdirSync(EDGE_LAB_DIR).sort()) {
      const fp = path.join(EDGE_LAB_DIR, f);
      if (fs.statSync(fp).isFile() && f.endsWith('.md')) {
        paths.push(`EDGE_LAB/${f}`);
      }
    }
  }

  // 4) Pipeline scripts
  if (fs.existsSync(SCRIPTS_DIR)) {
    for (const f of fs.readdirSync(SCRIPTS_DIR).sort()) {
      const fp = path.join(SCRIPTS_DIR, f);
      if (fs.statSync(fp).isFile() && f.endsWith('.mjs')) {
        paths.push(`scripts/edge/edge_lab/${f}`);
      }
    }
  }

  // ASCII lexicographic sort (R11)
  return canonSort(paths);
}

// ---------------------------------------------------------------------------
// Merkle tree computation
// ---------------------------------------------------------------------------

/**
 * Compute leaf hash for a file entry.
 * leaf = sha256_raw(relpath + ":" + sha256_norm(content))
 */
function leafHash(relPath, content) {
  const norm = sha256Norm(content);
  return sha256Raw(relPath + ':' + norm);
}

/**
 * Compute parent hash from two children.
 * parent = sha256_raw(left + right)
 */
function parentHash(left, right) {
  return sha256Raw(left + right);
}

/**
 * Build Merkle tree from leaf hashes.
 * Returns root hash and tree levels for audit.
 */
function buildMerkleTree(leaves) {
  if (leaves.length === 0) return { root: 'EMPTY', levels: [] };
  if (leaves.length === 1) return { root: leaves[0], levels: [leaves] };

  const levels = [leaves];
  let current = leaves;

  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = (i + 1 < current.length) ? current[i + 1] : current[i]; // duplicate last if odd
      next.push(parentHash(left, right));
    }
    levels.push(next);
    current = next;
  }

  return { root: current[0], levels };
}

// ---------------------------------------------------------------------------
// Compute Merkle root
// ---------------------------------------------------------------------------
const scopePaths = collectScope();
const leafEntries = [];
const missingFiles = [];

for (const rel of scopePaths) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    missingFiles.push(rel);
    console.log(`  [SKIP] Missing: ${rel}`);
    continue;
  }
  const content = fs.readFileSync(abs, 'utf8');
  const lh = leafHash(rel, content);
  leafEntries.push({ path: rel, leaf_hash: lh, sha256_norm: sha256Norm(content) });
}

const leafHashes = leafEntries.map((e) => e.leaf_hash);
const { root: merkleRoot, levels } = buildMerkleTree(leafHashes);

const treeDepth = levels.length;
const leavesCount = leafEntries.length;

// Also compute SCOPE_MANIFEST_SHA for cross-check with CHECKSUMS.md
const scopeManifestContent = scopePaths.join('\n') + '\n';
const SCOPE_MANIFEST_SHA = sha256Raw(scopeManifestContent);

console.log(`[MERKLE] Files in scope: ${scopePaths.length}`);
console.log(`[MERKLE] Files hashed: ${leavesCount}`);
console.log(`[MERKLE] Files missing: ${missingFiles.length}`);
console.log(`[MERKLE] Tree depth: ${treeDepth}`);
console.log(`[MERKLE] Root: ${merkleRoot}`);
console.log(`[MERKLE] SCOPE_MANIFEST_SHA: ${SCOPE_MANIFEST_SHA}`);

// ---------------------------------------------------------------------------
// Write MERKLE_ROOT.md
// ---------------------------------------------------------------------------
const leafTableRows = leafEntries.slice(0, 20).map((e) =>
  `| \`${e.path}\` | \`${e.leaf_hash.slice(0, 24)}…\` | \`${e.sha256_norm.slice(0, 24)}…\` |`
).join('\n');
const leafTableTrunc = leavesCount > 20 ? `\n| … (${leavesCount - 20} more rows) | … | … |` : '';

const gateStatus = missingFiles.length > 0 ? 'PARTIAL' : 'PASS';

const merkleRootMd = `# MERKLE_ROOT.md — P1 Evidence Integrity Anchor

STATUS: ${gateStatus}
REASON_CODE: NONE
RUN_ID: ${RUN_ID}

## Merkle Root

MERKLE_ROOT: \`${merkleRoot}\`

## Scope

| Field | Value |
|-------|-------|
| scope_manifest_sha | \`${SCOPE_MANIFEST_SHA}\` |
| files_in_scope | ${scopePaths.length} |
| files_hashed | ${leavesCount} |
| files_missing | ${missingFiles.length} |
| tree_depth | ${treeDepth} |
| leaves_count | ${leavesCount} |

## Algorithm

- Scope: same as CHECKSUMS.md (EDGE_LAB/P0/*.md + EDGE_LAB/gates/manual/*.json + EDGE_LAB/*.md + scripts/edge/edge_lab/*.mjs)
- Sort: ASCII lexicographic (R11)
- Leaf hash: sha256_raw(relpath + ":" + sha256_norm(content))
- Parent hash: sha256_raw(left_hash + right_hash)
- Odd level: duplicate last leaf (standard Merkle padding)
- Root: single hash at top of binary tree

## Leaf Hashes (first 20 of ${leavesCount})

| Path | Leaf Hash (prefix) | sha256_norm (prefix) |
|------|-------------------|---------------------|
${leafTableRows}${leafTableTrunc}

## GOV01 Usage

GOV01 (gov01_evidence_integrity.mjs) recomputes this Merkle root at runtime
and compares to the anchored value above. Any mismatch => BLOCKED GOV01.

## Evidence Paths

- reports/evidence/GOV/MERKLE_ROOT.md
- reports/evidence/GOV/gates/manual/merkle_root.json
`;

writeMd(path.join(GOV_DIR, 'MERKLE_ROOT.md'), merkleRootMd);

// ---------------------------------------------------------------------------
// Write merkle_root.json
// ---------------------------------------------------------------------------
const gateJson = {
  schema_version: '1.0.0',
  files_hashed: leavesCount,
  files_in_scope: scopePaths.length,
  files_missing: missingFiles.length,
  merkle_root: merkleRoot,
  message: `Merkle root computed from ${leavesCount} files (${treeDepth} levels). Root: ${merkleRoot}`,
  run_id: RUN_ID,
  scope_manifest_sha: SCOPE_MANIFEST_SHA,
  status: gateStatus,
  tree_depth: treeDepth,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'merkle_root.json'), gateJson);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log('P1 MERKLE ROOT RESULT');
console.log('='.repeat(60));
console.log(`  Root: ${merkleRoot}`);
console.log(`  Files: ${leavesCount}/${scopePaths.length} (${missingFiles.length} missing)`);
console.log(`  Depth: ${treeDepth} levels`);
console.log(`  Status: ${gateStatus}`);
console.log('='.repeat(60));

console.log(`\n[PASS] merkle_root — Merkle root anchored at ${merkleRoot.slice(0, 16)}…`);
process.exit(0);
