/**
 * fsm_compensations.mjs — EPOCH-69 Organism Brain FSM Compensation Functions
 *
 * Saga-style rollback actions for failed transitions.
 * Compensations MUST be idempotent: calling twice produces the same result.
 * Compensations MUST NOT throw exceptions (always return CompensationResult).
 * Compensations MUST NOT make network calls.
 *
 * Contract: CompensationFunction() => { compensated: boolean, action: string, detail: string }
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// compensate_revoke_network — T03 compensation
// Deletes artifacts/incoming/ALLOW_NETWORK. If already absent → {compensated: true}
// ---------------------------------------------------------------------------
function compensate_revoke_network() {
  const tokenPath = path.join(ROOT, 'artifacts', 'incoming', 'ALLOW_NETWORK');
  try {
    if (!fs.existsSync(tokenPath)) {
      return { compensated: true, action: 'revoke_network', detail: 'ALLOW_NETWORK already absent — idempotent OK' };
    }
    fs.unlinkSync(tokenPath);
    return { compensated: true, action: 'revoke_network', detail: 'ALLOW_NETWORK deleted successfully' };
  } catch (e) {
    return { compensated: false, action: 'revoke_network', detail: `failed to delete ALLOW_NETWORK: ${e.message}` };
  }
}

// ---------------------------------------------------------------------------
// compensate_invalidate_registry — T04 compensation
// Sets all PROMOTED candidates to INVALIDATED_BY_SAGA.
// If registry absent → {compensated: true}
// ---------------------------------------------------------------------------
function compensate_invalidate_registry() {
  const regPath = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'CANDIDATE_REGISTRY.json');
  try {
    if (!fs.existsSync(regPath)) {
      return { compensated: true, action: 'invalidate_registry', detail: 'CANDIDATE_REGISTRY.json absent — idempotent OK' };
    }
    const raw = fs.readFileSync(regPath, 'utf8');
    const reg = JSON.parse(raw);
    const candidates = reg.candidates || [];
    let invalidCount = 0;

    for (const c of candidates) {
      if (c.status === 'PROMOTED') {
        c.status = 'INVALIDATED_BY_SAGA';
        invalidCount++;
      }
    }

    if (invalidCount === 0) {
      return { compensated: true, action: 'invalidate_registry', detail: 'no PROMOTED candidates to invalidate — idempotent OK' };
    }

    fs.writeFileSync(regPath, JSON.stringify(reg, null, 2) + '\n');
    return { compensated: true, action: 'invalidate_registry', detail: `${invalidCount} candidate(s) set to INVALIDATED_BY_SAGA` };
  } catch (e) {
    return { compensated: false, action: 'invalidate_registry', detail: `failed to invalidate registry: ${e.message}` };
  }
}

// ---------------------------------------------------------------------------
// COMPENSATION_REGISTRY — maps compensation names to functions
// ---------------------------------------------------------------------------
export const COMPENSATION_REGISTRY = {
  compensate_revoke_network,
  compensate_invalidate_registry,
};
