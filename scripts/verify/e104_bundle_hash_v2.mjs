#!/usr/bin/env node
// E104-C1: Bundle Hash V2 - Filesystem-order independent
// Algorithm: Sorted file list → sha256 per file → sha256 of manifest
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';

const BUNDLE_ROOT = path.resolve('reports/evidence/E104');
const BUNDLE_HASH_FILE = path.join(BUNDLE_ROOT, 'BUNDLE_HASH_V2.md');

// Files to exclude from bundle (avoid circular dependency)
const EXCLUDE_FILES = [
  'BUNDLE_HASH.md',
  'BUNDLE_HASH_V2.md',
  'SHA256SUMS.md',
  'CLOSEOUT.md',
  'VERDICT.md'
];

const mode = process.argv[2] || '--verify';

if (mode !== '--write' && mode !== '--verify') {
  console.error('Usage: e104_bundle_hash_v2.mjs [--write|--verify]');
  process.exit(1);
}

if (mode === '--write' && isCIMode()) {
  throw new Error('BUNDLE_HASH_V2 --write forbidden in CI');
}

/**
 * Gather all .md files in evidence directory, sorted lexicographically
 * Exclude bundle hash files to avoid circular dependency
 */
function gatherFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && !EXCLUDE_FILES.includes(f))
    .sort(); // Lexicographic sort for determinism

  return files.map(f => ({
    name: f,
    fullPath: path.join(dir, f),
    // Use posix separators for portability
    relativePath: `reports/evidence/E104/${f}`
  }));
}

/**
 * Compute bundle hash v2
 * Returns: { hash: string, manifest: string, fileCount: number }
 */
function computeBundleHashV2() {
  const files = gatherFiles(BUNDLE_ROOT);

  if (files.length === 0) {
    throw new Error('No files found for bundle hash computation');
  }

  // Compute sha256 for each file and build manifest lines
  const manifestLines = files.map(({ fullPath, relativePath }) => {
    const fileHash = sha256File(fullPath);
    return `${fileHash}  ${relativePath}`;
  });

  // Sort manifest lines (already sorted by filename, but explicit for clarity)
  manifestLines.sort();

  // Compute sha256 of the concatenated manifest
  const manifest = manifestLines.join('\n') + '\n';
  const bundleHash = sha256Text(manifest);

  return {
    hash: bundleHash,
    manifest,
    fileCount: files.length
  };
}

/**
 * Write bundle hash to BUNDLE_HASH_V2.md
 */
function writeBundleHash() {
  const { hash, manifest, fileCount } = computeBundleHashV2();

  const content = [
    '# E104 BUNDLE HASH V2',
    '',
    '## Algorithm',
    '- Gather all .md files in reports/evidence/E104/ (excluding BUNDLE_HASH*, SHA256SUMS, CLOSEOUT, VERDICT)',
    '- Sort files lexicographically',
    '- Compute sha256 per file',
    '- Build manifest: "<sha256>  <posix_path>" per line',
    '- Compute sha256 of concatenated manifest (sorted)',
    '',
    '## Properties',
    '- Filesystem-order independent (sorted input)',
    '- Platform-independent (posix paths)',
    '- Deterministic (stable sorting, stable hashing)',
    '- Circular-dependency free (excludes self)',
    '',
    '## Bundle Hash',
    `- hash: ${hash}`,
    `- file_count: ${fileCount}`,
    `- algorithm: sha256(sorted_manifest)`,
    '',
    '## Manifest',
    '```',
    manifest.trim(),
    '```'
  ].join('\n');

  writeMd(BUNDLE_HASH_FILE, content);
  console.log(`e104:bundle_hash_v2 --write: ${hash} (${fileCount} files)`);
}

/**
 * Verify bundle hash matches recorded value
 */
function verifyBundleHash() {
  if (!fs.existsSync(BUNDLE_HASH_FILE)) {
    throw new Error('BUNDLE_HASH_V2.md not found (run with --write first)');
  }

  // Read recorded hash
  const recorded = fs.readFileSync(BUNDLE_HASH_FILE, 'utf8');
  const match = recorded.match(/^- hash:\s*([a-f0-9]{64})/m);
  if (!match) {
    throw new Error('No hash found in BUNDLE_HASH_V2.md');
  }
  const recordedHash = match[1];

  // Compute current hash
  const { hash: computedHash, fileCount } = computeBundleHashV2();

  if (recordedHash !== computedHash) {
    console.error(`BUNDLE_HASH_V2 mismatch:`);
    console.error(`  Recorded: ${recordedHash}`);
    console.error(`  Computed: ${computedHash}`);
    throw new Error('BUNDLE_HASH_V2 verification FAILED');
  }

  console.log(`e104:bundle_hash_v2 --verify: PASS (${computedHash}, ${fileCount} files)`);
}

// Execute
if (mode === '--write') {
  writeBundleHash();
} else {
  verifyBundleHash();
}
