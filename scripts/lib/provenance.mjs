/**
 * provenance.mjs — SLSA-lite provenance chain for Doctor evidence
 *
 * Collects all evidence files from a Doctor run, builds merkle tree,
 * writes PROVENANCE.json with unforgeable root hash.
 *
 * v2: chain_parent, chain_depth, chain_integrity for cross-run linking (G-10).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function collectEvidenceFiles(epochDir) {
  const files = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith('.md') || ent.name.endsWith('.json')) {
        files.push(full);
      }
    }
  }
  if (fs.existsSync(epochDir)) walk(epochDir);
  return files.sort();
}

function buildMerkleTree(leaves) {
  if (leaves.length === 0) return { root: sha256('EMPTY_TREE'), depth: 0 };
  let level = [...leaves];
  let depth = 0;
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left; // Bitcoin-style duplicate
      next.push(sha256(left + ':' + right));
    }
    level = next;
    depth++;
  }
  return { root: level[0], depth };
}

/**
 * findPreviousDoctorRun — locate the most recent EPOCH-DOCTOR-* dir before current.
 */
export function findPreviousDoctorRun(evidenceDir, currentRunId) {
  if (!fs.existsSync(evidenceDir)) return null;
  const dirs = fs.readdirSync(evidenceDir)
    .filter((d) => d.startsWith('EPOCH-DOCTOR-') && !d.includes(currentRunId))
    .sort();
  if (dirs.length === 0) return null;
  return { dir: path.join(evidenceDir, dirs.at(-1)), runId: dirs.at(-1).replace('EPOCH-DOCTOR-', '') };
}

/**
 * loadPreviousProvenance — read PROVENANCE.json from a previous Doctor run.
 */
export function loadPreviousProvenance(prevDir) {
  if (!prevDir) return null;
  const provPath = path.join(prevDir, 'PROVENANCE.json');
  if (!fs.existsSync(provPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(provPath, 'utf8'));
  } catch {
    return null;
  }
}

export function sealProvenance(epochDir, metadata = {}, chainOpts = {}) {
  // Exclude PROVENANCE.json itself to match verifyProvenance and avoid circular dependency
  const files = collectEvidenceFiles(epochDir).filter((f) => !f.endsWith('PROVENANCE.json'));
  const leafHashes = files.map((f) => {
    const relPath = path.relative(epochDir, f);
    const content = fs.readFileSync(f, 'utf8');
    return sha256(relPath + ':' + sha256(content));
  });

  const tree = buildMerkleTree(leafHashes);

  // Chain linking (G-10)
  const prevMerkleRoot = chainOpts.prev_merkle_root ?? 'GENESIS';
  const prevChainDepth = chainOpts.prev_chain_depth ?? 0;
  let chainIntegrity = 'GENESIS';
  if (prevMerkleRoot !== 'GENESIS') {
    // Verify the parent exists with matching root
    if (chainOpts.prev_verified) {
      chainIntegrity = 'INTACT';
    } else {
      chainIntegrity = 'BROKEN';
    }
  }

  // Metadata spread first so structural fields can never be overridden
  const provenance = {
    ...metadata,
    chain_depth: prevChainDepth + 1,
    chain_integrity: chainIntegrity,
    chain_parent: prevMerkleRoot,
    leaf_count: files.length,
    merkle_depth: tree.depth,
    merkle_root: tree.root,
    node_version: process.version,
    schema_version: '1.0.0',
  };

  // Write WITHOUT writeJsonDeterministic (which would add FP01 checks on our metadata)
  // This is raw provenance, not gate output
  const sorted = {};
  for (const k of Object.keys(provenance).sort()) sorted[k] = provenance[k];
  fs.writeFileSync(
    path.join(epochDir, 'PROVENANCE.json'),
    JSON.stringify(sorted, null, 2) + '\n',
    'utf8'
  );

  return provenance;
}

export function verifyProvenance(epochDir) {
  const provPath = path.join(epochDir, 'PROVENANCE.json');
  if (!fs.existsSync(provPath)) return { valid: false, reason: 'PROVENANCE.json not found' };

  const prov = JSON.parse(fs.readFileSync(provPath, 'utf8'));
  const files = collectEvidenceFiles(epochDir).filter((f) => !f.endsWith('PROVENANCE.json'));
  const leafHashes = files.map((f) => {
    const relPath = path.relative(epochDir, f);
    const content = fs.readFileSync(f, 'utf8');
    return sha256(relPath + ':' + sha256(content));
  });

  const tree = buildMerkleTree(leafHashes);

  if (tree.root !== prov.merkle_root) {
    return { valid: false, reason: `merkle mismatch: computed=${tree.root} stored=${prov.merkle_root}` };
  }
  if (files.length !== prov.leaf_count) {
    return { valid: false, reason: `leaf count mismatch: computed=${files.length} stored=${prov.leaf_count}` };
  }
  return { valid: true, reason: 'NONE', merkle_root: tree.root };
}
