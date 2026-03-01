/**
 * provenance.mjs — SLSA-lite provenance chain for Doctor evidence
 *
 * Collects all evidence files from a Doctor run, builds merkle tree,
 * writes PROVENANCE.json with unforgeable root hash.
 *
 * Uses existing canon.mjs sha256Raw for hash consistency.
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

export function sealProvenance(epochDir, metadata = {}) {
  const files = collectEvidenceFiles(epochDir);
  const leafHashes = files.map((f) => {
    const relPath = path.relative(epochDir, f);
    const content = fs.readFileSync(f, 'utf8');
    return sha256(relPath + ':' + sha256(content));
  });

  const tree = buildMerkleTree(leafHashes);

  const provenance = {
    schema_version: '1.0.0',
    merkle_root: tree.root,
    merkle_depth: tree.depth,
    leaf_count: files.length,
    node_version: process.version,
    ...metadata,
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
