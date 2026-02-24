/**
 * canon.mjs — Evidence canonicalization + RUN_ID SSOT
 *
 * Implements:
 * - R6: RUN_ID resolver (TREASURE_RUN_ID > GIT > BUNDLE > BLOCKED D001)
 * - R7: BUNDLE fingerprint format validation (VM04)
 * - R4/R5: sha256_raw + sha256_norm dual-hash doctrine
 * - R9: D005 — canon MUST NOT touch non-volatile semantic lines
 * - Volatile markers: UTC_TIMESTAMP_, Generated at, RUN_ID, Host:, Path:,
 *                     generated_at:, Started:, Completed:
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Volatile markers (R9 — normalization allowed ONLY on lines starting with these)
// ---------------------------------------------------------------------------
export const VOLATILE_MARKERS = [
  'UTC_TIMESTAMP_',
  'Generated at',
  'RUN_ID',
  'Host:',
  'Path:',
  'generated_at:',
  'Started:',
  'Completed:',
  'STARTED_AT:',
  'COMPLETED_AT:',
];

// ---------------------------------------------------------------------------
// Forbidden semantic tokens (R9 — D005 guard on NON-volatile lines)
// ---------------------------------------------------------------------------
export const FORBIDDEN_SEMANTIC_TOKENS_RE =
  /\b(threshold|limit|ratio|delta|pnl|slippage|expectancy|kelly|sharpe|drawdown)\b/i;

// ---------------------------------------------------------------------------
// RUN_ID resolver — R6
// ---------------------------------------------------------------------------
function resolveRunId() {
  // 1) Explicit env override
  if (process.env.TREASURE_RUN_ID) {
    return process.env.TREASURE_RUN_ID.trim();
  }

  const verifyMode = (process.env.VERIFY_MODE || 'GIT').toUpperCase();

  // 2) GIT mode (default)
  if (verifyMode === 'GIT') {
    // Try GITHUB_SHA first (CI environment)
    if (process.env.GITHUB_SHA) {
      return process.env.GITHUB_SHA.slice(0, 12);
    }
    const gitDir = path.join(process.cwd(), '.git');
    if (fs.existsSync(gitDir)) {
      try {
        return execSync('git rev-parse --short=12 HEAD', { encoding: 'utf8' }).trim();
      } catch (_) {
        throw new Error('BLOCKED D001: VERIFY_MODE=GIT but git rev-parse failed. Ensure .git is present and HEAD is valid.');
      }
    }
    throw new Error('BLOCKED D001: VERIFY_MODE=GIT but .git directory not found at ' + process.cwd());
  }

  // 3) BUNDLE mode
  if (verifyMode === 'BUNDLE') {
    const bundleCommitSha = process.env.BUNDLE_COMMIT_SHA_SHORT;
    const sourceFingerprint = process.env.SOURCE_FINGERPRINT;

    if (bundleCommitSha) {
      if (!/^[0-9a-f]{7,12}$/.test(bundleCommitSha)) {
        throw new Error(
          `FAIL VM04: BUNDLE_COMMIT_SHA_SHORT "${bundleCommitSha}" is malformed. ` +
          'Must match ^[0-9a-f]{7,12}$ (lowercase hex only).'
        );
      }
      return bundleCommitSha;
    }

    if (sourceFingerprint) {
      if (!/^sha256:[0-9a-f]{64}$/.test(sourceFingerprint)) {
        throw new Error(
          `FAIL VM04: SOURCE_FINGERPRINT "${sourceFingerprint}" is malformed. ` +
          'Must match ^sha256:[0-9a-f]{64}$ (lowercase hex only).'
        );
      }
      return sourceFingerprint;
    }

    throw new Error(
      'BLOCKED D001: VERIFY_MODE=BUNDLE but neither BUNDLE_COMMIT_SHA_SHORT nor SOURCE_FINGERPRINT is set. ' +
      'See BUNDLE_CONTRACT.md for required fields.'
    );
  }

  // 4) Unknown mode — BLOCKED
  throw new Error(
    `BLOCKED D001: Unknown VERIFY_MODE="${verifyMode}". Expected GIT or BUNDLE.`
  );
}

export const RUN_ID = resolveRunId();

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------
export function canonRelPath(root, p) {
  return path.relative(root, p).split(path.sep).join('/');
}

// ---------------------------------------------------------------------------
// Sort helpers (ASCII lexicographic per R11)
// ---------------------------------------------------------------------------
export function canonSort(arr) {
  return [...arr].sort((a, b) => String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Numeric normalization
// ---------------------------------------------------------------------------
export function canonNum(n, dp = 4) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 'NaN';
  return Number(x.toFixed(dp));
}

// ---------------------------------------------------------------------------
// Line-level normalization (trailing whitespace + final newline)
// ---------------------------------------------------------------------------
export function canonLines(text) {
  return String(text)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n*$/, '\n');
}

// ---------------------------------------------------------------------------
// Table normalization
// ---------------------------------------------------------------------------
export function canonTable(rows) {
  return canonSort(rows).join('\n');
}

// ---------------------------------------------------------------------------
// File writer
// ---------------------------------------------------------------------------
export function writeMd(file, content) {
  fs.writeFileSync(file, canonLines(content));
}

// ---------------------------------------------------------------------------
// D005-safe stableEvidenceNormalize
//
// Rule: normalization MAY ONLY operate on lines that START WITH a volatile marker.
// If a NON-volatile line would be modified AND contains a forbidden semantic token => FAIL D005.
// Since we only process volatile lines, D005 is structurally prevented.
// An explicit assertion verifies this invariant for defense-in-depth.
// ---------------------------------------------------------------------------
export function stableEvidenceNormalize(content, opts = {}) {
  const { assertD005 = true } = opts;
  const raw = canonLines(String(content));
  const lines = raw.split('\n');

  const normalized = lines.map((line) => {
    const trimmed = line.trimStart();
    const isVolatile = VOLATILE_MARKERS.some((m) => trimmed.startsWith(m));

    if (!isVolatile) {
      // D005 assertion: non-volatile lines must not be changed by canon
      // (They won't be changed below, but we validate the contract here)
      return line;
    }

    // Only volatile lines get timestamp/ms normalization
    return line
      .replace(/20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z/g, RUN_ID)
      .replace(/\(\d+ms\)/g, '(RUN_MS)')
      .replace(/after \d+ms/gi, 'after RUN_MS');
  });

  const result = normalized.join('\n');

  // D005 defense-in-depth: verify no non-volatile semantic line was accidentally changed
  if (assertD005) {
    const origLines = raw.split('\n');
    const normLines = result.split('\n');
    for (let i = 0; i < Math.max(origLines.length, normLines.length); i++) {
      const orig = origLines[i] ?? '';
      const norm = normLines[i] ?? '';
      if (orig !== norm) {
        const trimmed = orig.trimStart();
        const isVolatile = VOLATILE_MARKERS.some((m) => trimmed.startsWith(m));
        if (!isVolatile && FORBIDDEN_SEMANTIC_TOKENS_RE.test(orig)) {
          throw new Error(
            `FAIL D005: Canon touched non-volatile semantic line at index ${i}:\n` +
            `  original: ${orig}\n  normalized: ${norm}\n` +
            `  Contains forbidden token matching: ${FORBIDDEN_SEMANTIC_TOKENS_RE.source}`
          );
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Hashing — R5 dual-hash doctrine
// ---------------------------------------------------------------------------

/**
 * sha256_raw: hash of raw content (as stored on disk / as received).
 */
export function sha256Raw(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

/**
 * sha256_norm: hash of normalized content (stableEvidenceNormalize applied).
 * Used for PASS/FAIL comparisons and receipt chains (R4, R5, R11).
 */
export function sha256Norm(text) {
  return sha256Raw(stableEvidenceNormalize(String(text), { assertD005: false }));
}

/**
 * sha256Text: legacy alias for sha256Raw (backward compatibility).
 * New code should use sha256Raw or sha256Norm explicitly.
 */
export function sha256Text(text) {
  return sha256Raw(text);
}
