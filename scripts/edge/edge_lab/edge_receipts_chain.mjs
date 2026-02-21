/**
 * edge_receipts_chain.mjs — P0 receipt chain on sha256_norm
 *
 * Implements R5 (chain uses sha256_norm), R11 (fixed ordering + SCOPE_MANIFEST_SHA).
 *
 * Reads CHECKSUMS.md to get sha256_norm hashes, builds a receipt chain:
 * - Each receipt links: path + sha256_norm + chain_position + prev_receipt_hash
 * - Chain hash = sha256_raw(prev_hash + sha256_norm)
 *
 * Writes: reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, sha256Raw, sha256Norm, canonSort } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const P0_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'P0');
const MANUAL_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'gates', 'manual');
const CHECKSUMS_PATH = path.join(P0_DIR, 'CHECKSUMS.md');

fs.mkdirSync(P0_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Parse CHECKSUMS.md for path → sha256_norm map
// ---------------------------------------------------------------------------
function parseChecksums(content) {
  const entries = [];
  const tableRe = /\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{64})`\s*\|\s*`([0-9a-f]{64})`\s*\|/g;
  let match;
  while ((match = tableRe.exec(content)) !== null) {
    entries.push({
      path: match[1],
      sha256_raw: match[2],
      sha256_norm: match[3],
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Parse SCOPE_MANIFEST_SHA from CHECKSUMS.md
// ---------------------------------------------------------------------------
function parseScopeManifestSha(content) {
  const match = content.match(/scope_manifest_sha\s*\|\s*`([0-9a-f]{64})`/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Build receipt chain
// Receipt chain = ordered sequence of entries from CHECKSUMS.md
// Each receipt: { position, path, sha256_norm, chain_hash }
// chain_hash(N) = sha256_raw(chain_hash(N-1) + sha256_norm(N))
// chain_hash(0) = sha256_raw("GENESIS" + sha256_norm(0))
// ---------------------------------------------------------------------------
let status, reason_code, message, next_action;
let chain = [];
let scopeManifestSha = null;

if (!fs.existsSync(CHECKSUMS_PATH)) {
  status = 'BLOCKED';
  reason_code = 'E004';
  message = 'CHECKSUMS.md not found. Run edge_evidence_hashes first.';
  next_action = 'Run: node scripts/edge/edge_lab/edge_evidence_hashes.mjs';
} else {
  const checksumsContent = fs.readFileSync(CHECKSUMS_PATH, 'utf8');
  const entries = parseChecksums(checksumsContent);
  scopeManifestSha = parseScopeManifestSha(checksumsContent);

  if (entries.length === 0) {
    status = 'BLOCKED';
    reason_code = 'E003';
    message = 'CHECKSUMS.md found but no hash entries could be parsed. Possible format drift.';
    next_action = 'Regenerate CHECKSUMS.md via edge_evidence_hashes.mjs.';
  } else {
    // Build chain in ASCII-sorted order (R11: path sort = ASCII lexicographic)
    const sortedEntries = canonSort(entries.map((e) => e.path)).map((p) =>
      entries.find((e) => e.path === p)
    ).filter(Boolean);

    let prevHash = 'GENESIS';
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      const chainHash = sha256Raw(prevHash + ':' + entry.sha256_norm);
      chain.push({
        chain_position: i,
        chain_hash: chainHash,
        path: entry.path,
        sha256_norm: entry.sha256_norm,
      });
      prevHash = chainHash;
    }

    const finalChainHash = chain.length > 0 ? chain[chain.length - 1].chain_hash : 'EMPTY';

    status = 'PASS';
    reason_code = 'NONE';
    message = `Receipt chain built over ${chain.length} entries. Final chain hash: ${finalChainHash.slice(0, 16)}...`;
    next_action = 'Proceed to DATA_COURT.';
  }
}

// ---------------------------------------------------------------------------
// Write RECEIPTS_CHAIN.md
// ---------------------------------------------------------------------------
const chainRows = chain.map((r) =>
  `| ${r.chain_position} | \`${r.path}\` | \`${r.sha256_norm.slice(0, 16)}…\` | \`${r.chain_hash.slice(0, 16)}…\` |`
).join('\n');

const finalChainHash = chain.length > 0 ? chain[chain.length - 1].chain_hash : 'EMPTY';

const receiptsMd = `# RECEIPTS_CHAIN.md — P0 Evidence Receipt Chain

STATUS: ${status}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${next_action}

## Chain Metadata

| Field | Value |
|-------|-------|
| entries_in_chain | ${chain.length} |
| final_chain_hash | \`${finalChainHash}\` |
| scope_manifest_sha | \`${scopeManifestSha ?? 'MISSING'}\` |
| chain_genesis | \`GENESIS\` |
| hash_function | sha256_raw(prev_hash + ":" + sha256_norm) |

## Chain Policy

- sha256_norm used for all chain entries (R4, R5)
- ASCII lexicographic path ordering (R11)
- Each receipt: chain_hash(N) = sha256_raw(chain_hash(N-1) + ":" + sha256_norm(N))
- Break detection: any receipt modification invalidates downstream chain hashes

## Receipt Chain

| Position | Path | sha256_norm (prefix) | chain_hash (prefix) |
|----------|------|---------------------|---------------------|
${chainRows || '| — | No entries | — | — |'}

## Chain Verification

To verify chain integrity:
1. Re-read CHECKSUMS.md sha256_norm values in ASCII sorted order
2. Re-derive chain from GENESIS using: sha256_raw(prev + ":" + sha256_norm)
3. Compare final_chain_hash

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
`;

fs.writeFileSync(path.join(P0_DIR, 'RECEIPTS_CHAIN.md'), receiptsMd);

if (status === 'PASS') {
  console.log(`[PASS] edge_receipts_chain — ${chain.length} entries chained, final=${finalChainHash.slice(0, 16)}...`);
  process.exit(0);
} else {
  console.error(`[${status}] edge_receipts_chain — ${reason_code}: ${message}`);
  process.exit(1);
}
