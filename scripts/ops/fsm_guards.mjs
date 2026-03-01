/**
 * fsm_guards.mjs — EPOCH-69 Organism Brain FSM Guard Functions
 *
 * Pure read-only precondition checks for state transitions.
 * Guards MUST NOT write to filesystem, make network calls, or modify global state.
 * Guards MUST be deterministic: same filesystem state → same result.
 *
 * Contract: GuardFunction(context?) => { pass: boolean, detail: string }
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// guard_deps_ready — T01: BOOT → CERTIFYING
// Checks: node_modules/ exists with ≥10 entries; .git/ exists (or BUNDLE mode)
// ---------------------------------------------------------------------------
function guard_deps_ready(_context) {
  const nmDir = path.join(ROOT, 'node_modules');
  if (!fs.existsSync(nmDir)) {
    return { pass: false, detail: 'node_modules/ directory missing' };
  }
  let entries;
  try {
    entries = fs.readdirSync(nmDir);
  } catch (e) {
    return { pass: false, detail: `cannot read node_modules/: ${e.message}` };
  }
  if (entries.length < 10) {
    return { pass: false, detail: `node_modules/ has only ${entries.length} entries (need ≥10)` };
  }

  const verifyMode = (process.env.VERIFY_MODE || 'GIT').toUpperCase();
  if (verifyMode !== 'BUNDLE') {
    const gitDir = path.join(ROOT, '.git');
    if (!fs.existsSync(gitDir)) {
      return { pass: false, detail: '.git/ directory missing (not BUNDLE mode)' };
    }
  }

  return { pass: true, detail: `node_modules/ has ${entries.length} entries, .git present` };
}

// ---------------------------------------------------------------------------
// guard_verify_fast_x2 — T02: CERTIFYING → CERTIFIED
// Guard IS the verification — runs verify:fast twice consecutively.
// Per §9.1: guard runs the heavy work, action is null.
// ---------------------------------------------------------------------------
function guard_verify_fast_x2(_context) {
  // NOTE: This guard is heavyweight — it runs verify:fast x2.
  // In structural-only mode (no runtime FSM execution in EPOCH-69),
  // this guard definition exists for completeness but is NOT called
  // by the regression gate. It will be invoked when life.mjs
  // integrates with the FSM in EPOCH-70.
  //
  // For now, return a structural placeholder that checks prior
  // certification evidence exists.
  const execDir = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
  if (!fs.existsSync(execDir)) {
    return { pass: false, detail: 'EXECUTOR evidence directory missing — no prior certification' };
  }
  const gatesDir = path.join(execDir, 'gates', 'manual');
  if (!fs.existsSync(gatesDir)) {
    return { pass: false, detail: 'EXECUTOR/gates/manual/ missing — no gate evidence' };
  }
  let gateFiles;
  try {
    gateFiles = fs.readdirSync(gatesDir).filter((f) => f.endsWith('.json'));
  } catch (e) {
    return { pass: false, detail: `cannot read gates/manual/: ${e.message}` };
  }
  if (gateFiles.length === 0) {
    return { pass: false, detail: 'no gate JSON files in EXECUTOR/gates/manual/' };
  }

  return { pass: true, detail: `${gateFiles.length} gate files present in EXECUTOR` };
}

// ---------------------------------------------------------------------------
// guard_network_token — T03: CERTIFIED → RESEARCHING
// Checks: artifacts/incoming/ALLOW_NETWORK contains "ALLOW_NETWORK: YES"
// ---------------------------------------------------------------------------
function guard_network_token(_context) {
  const tokenPath = path.join(ROOT, 'artifacts', 'incoming', 'ALLOW_NETWORK');
  if (!fs.existsSync(tokenPath)) {
    return { pass: false, detail: 'artifacts/incoming/ALLOW_NETWORK file missing' };
  }
  let content;
  try {
    content = fs.readFileSync(tokenPath, 'utf8');
  } catch (e) {
    return { pass: false, detail: `cannot read ALLOW_NETWORK: ${e.message}` };
  }
  if (!content.includes('ALLOW_NETWORK: YES')) {
    return { pass: false, detail: 'ALLOW_NETWORK file does not contain "ALLOW_NETWORK: YES"' };
  }

  return { pass: true, detail: 'ALLOW_NETWORK token present and valid' };
}

// ---------------------------------------------------------------------------
// guard_data_ready — T04: RESEARCHING → EDGE_READY
// Checks: CANDIDATE_REGISTRY.json has ≥1 candidate with status "PROMOTED"
// ---------------------------------------------------------------------------
function guard_data_ready(_context) {
  const regPath = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'CANDIDATE_REGISTRY.json');
  if (!fs.existsSync(regPath)) {
    return { pass: false, detail: 'CANDIDATE_REGISTRY.json missing' };
  }
  let reg;
  try {
    reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  } catch (e) {
    return { pass: false, detail: `cannot parse CANDIDATE_REGISTRY.json: ${e.message}` };
  }
  const candidates = reg.candidates || [];
  const promoted = candidates.filter((c) => c.status === 'PROMOTED');
  if (promoted.length === 0) {
    return { pass: false, detail: `no PROMOTED candidates (${candidates.length} total)` };
  }

  return { pass: true, detail: `${promoted.length} PROMOTED candidate(s) found` };
}

// ---------------------------------------------------------------------------
// guard_probe_failure — T05: * → DEGRADED
// Checks: context contains failed_gate or failed_probe
// ---------------------------------------------------------------------------
function guard_probe_failure(context) {
  if (!context) {
    return { pass: false, detail: 'no context provided — cannot detect probe failure' };
  }
  if (context.failed_gate || context.failed_probe) {
    return { pass: true, detail: `probe failure detected: ${context.failed_gate || context.failed_probe}` };
  }
  return { pass: false, detail: 'no failed_gate or failed_probe in context' };
}

// ---------------------------------------------------------------------------
// guard_healable — T06: DEGRADED → HEALING
// Checks: at least one known-healable condition exists
// ---------------------------------------------------------------------------
function guard_healable(_context) {
  const healable = [];

  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    healable.push('missing node_modules');
  }
  const verifyMode = (process.env.VERIFY_MODE || 'GIT').toUpperCase();
  if (verifyMode !== 'BUNDLE' && !fs.existsSync(path.join(ROOT, '.git'))) {
    healable.push('missing .git');
  }
  if (!fs.existsSync(path.join(ROOT, 'reports', 'evidence', 'EXECUTOR'))) {
    healable.push('missing EXECUTOR directory');
  }

  if (healable.length === 0) {
    return { pass: false, detail: 'no known-healable conditions detected' };
  }

  return { pass: true, detail: `healable conditions: ${healable.join(', ')}` };
}

// ---------------------------------------------------------------------------
// guard_heal_complete — T07: HEALING → BOOT
// Checks: context confirms heals_applied > 0
// ---------------------------------------------------------------------------
function guard_heal_complete(context) {
  if (!context) {
    return { pass: false, detail: 'no context provided — cannot confirm heal completion' };
  }
  if (typeof context.heals_applied === 'number' && context.heals_applied > 0) {
    return { pass: true, detail: `${context.heals_applied} heal(s) applied successfully` };
  }
  return { pass: false, detail: `heals_applied=${context.heals_applied ?? 'undefined'} — need > 0` };
}

// ---------------------------------------------------------------------------
// GUARD_REGISTRY — maps guard names to functions
// ---------------------------------------------------------------------------
export const GUARD_REGISTRY = {
  guard_deps_ready,
  guard_verify_fast_x2,
  guard_network_token,
  guard_data_ready,
  guard_probe_failure,
  guard_healable,
  guard_heal_complete,
};
