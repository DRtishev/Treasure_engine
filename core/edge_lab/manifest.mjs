// core/edge_lab/manifest.mjs — Contract manifest enforcement
// Doctrine: fixed court order, evidence file integrity, no court omission possible.
// If evidence mismatch detected → REASON_CODE = CONTRACT_DRIFT, STATUS = BLOCKED.

import crypto from 'node:crypto';
import { COURT_ORDER, REASON_CODES, VERDICTS } from './verdicts.mjs';

/**
 * Compute a deterministic fingerprint of court output.
 * Non-deterministic fields (timestamps) are stripped before hashing.
 */
export function fingerprintCourtReport(report) {
  // Strip wall-clock timestamps that would vary across runs
  const stable = {
    court: report.court,
    verdict: report.verdict,
    reason_codes: [...(report.reason_codes || [])].sort(),
    // Include key evidence values but not raw timestamp fields
    evidence_summary: report.evidence_summary || {},
  };
  return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

/**
 * Validate that all required courts are present and in the correct order.
 * @param {Array} reports - Array of court reports in execution order
 * @returns {{ ok: boolean, reason: string|null }}
 */
export function validateManifest(reports) {
  const names = reports.map((r) => r.court);

  // Check court omission
  for (const required of COURT_ORDER) {
    if (!names.includes(required)) {
      return {
        ok: false,
        reason: `Court omission detected: ${required} missing. REASON_CODE=${REASON_CODES.COURT_OMISSION}`,
      };
    }
  }

  // Check order integrity
  const indices = COURT_ORDER.map((name) => names.indexOf(name));
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] < indices[i - 1]) {
      return {
        ok: false,
        reason: `Court order violation: ${COURT_ORDER[i]} appeared before ${COURT_ORDER[i - 1]}. REASON_CODE=${REASON_CODES.CONTRACT_DRIFT}`,
      };
    }
  }

  return { ok: true, reason: null };
}

/**
 * Verify determinism by comparing two sets of court report fingerprints.
 * @param {string[]} run1Fingerprints
 * @param {string[]} run2Fingerprints
 * @returns {{ ok: boolean, mismatches: string[] }}
 */
export function verifyDeterminism(run1Fingerprints, run2Fingerprints) {
  if (run1Fingerprints.length !== run2Fingerprints.length) {
    return {
      ok: false,
      mismatches: [`Run length mismatch: ${run1Fingerprints.length} vs ${run2Fingerprints.length}`],
    };
  }
  const mismatches = [];
  for (let i = 0; i < run1Fingerprints.length; i++) {
    if (run1Fingerprints[i] !== run2Fingerprints[i]) {
      mismatches.push(`Court[${i}]: ${run1Fingerprints[i]} !== ${run2Fingerprints[i]}`);
    }
  }
  return { ok: mismatches.length === 0, mismatches };
}

/**
 * Build a blocked report due to contract drift.
 */
export function buildBlockedReport(reason, reasonCode = REASON_CODES.CONTRACT_DRIFT) {
  return {
    verdict: VERDICTS.BLOCKED,
    reason_codes: [reasonCode],
    reason,
    courts: [],
    evidence_manifest: null,
  };
}
