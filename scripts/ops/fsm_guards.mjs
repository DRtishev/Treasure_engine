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
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// guard_deps_ready — T01: BOOT → CERTIFYING
// Checks: deps available (node_modules OR NODE_PATH OR BUNDLE); .git/ exists
// EPOCH-70.1 BUG-D FIX: support NODE_PATH and BUNDLE mode
// ---------------------------------------------------------------------------
function guard_deps_ready(_context) {
  const verifyMode = (process.env.VERIFY_MODE || 'GIT').toUpperCase();

  // Path 1: local node_modules
  const nmDir = path.join(ROOT, 'node_modules');
  if (fs.existsSync(nmDir)) {
    let entries;
    try { entries = fs.readdirSync(nmDir); } catch { entries = []; }
    if (entries.length >= 10) {
      return checkGitPresent(verifyMode, `node_modules/ has ${entries.length} entries`);
    }
  }

  // Path 2: NODE_PATH resolution (global/vendored)
  const nodePath = process.env.NODE_PATH;
  if (nodePath) {
    const dirs = nodePath.split(path.delimiter).filter(Boolean);
    for (const dir of dirs) {
      try {
        if (fs.existsSync(dir) && fs.readdirSync(dir).length >= 10) {
          return checkGitPresent(verifyMode, `NODE_PATH ${dir} has deps`);
        }
      } catch { /* continue */ }
    }
  }

  // Path 3: npm global root (npm run resolves deps through this)
  try {
    const r = spawnSync('npm', ['root', '-g'], { encoding: 'utf8', timeout: 5000 });
    const globalRoot = (r.stdout || '').trim();
    if (globalRoot && fs.existsSync(globalRoot) && fs.readdirSync(globalRoot).length >= 10) {
      return checkGitPresent(verifyMode, `npm global root ${globalRoot} has deps`);
    }
  } catch { /* continue */ }

  // Path 4: BUNDLE mode (skip deps check entirely)
  if (verifyMode === 'BUNDLE') {
    return checkGitPresent(verifyMode, 'BUNDLE mode — deps check skipped');
  }

  // Path 5: npm run still works (verify by checking if npm can resolve)
  try {
    const r = spawnSync('npm', ['run', '-s', '--list'], { encoding: 'utf8', timeout: 5000 });
    if (r.status === 0) {
      return checkGitPresent(verifyMode, 'npm resolution works (no local node_modules)');
    }
  } catch { /* continue */ }

  return { pass: false, detail: 'no deps found: node_modules/ missing, NODE_PATH empty, npm global empty' };
}

function checkGitPresent(verifyMode, depsDetail) {
  if (verifyMode !== 'BUNDLE') {
    const gitDir = path.join(ROOT, '.git');
    if (!fs.existsSync(gitDir)) {
      return { pass: false, detail: '.git/ directory missing (not BUNDLE mode)' };
    }
  }
  return { pass: true, detail: depsDetail + ', .git present' };
}

// ---------------------------------------------------------------------------
// guard_verify_fast_x2 — T02: CERTIFYING → CERTIFIED
// Precondition check: EXECUTOR evidence directory exists with gate receipts.
// The actual verification is run by the transition action (verify:fast x2).
// ---------------------------------------------------------------------------
function guard_verify_fast_x2(_context) {
  // Lightweight precondition: verify EXECUTOR evidence directory has gate
  // receipts from prior certification. The heavy lifting (verify:fast x2)
  // is handled by the transition action with action_x2: true.
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
// EPOCH-71: reads real EPOCH-DOCTOR receipts + context triggers + EventBus
// ---------------------------------------------------------------------------
function guard_probe_failure(context) {
  if (!context) {
    return { pass: false, detail: 'no context provided — cannot detect probe failure' };
  }

  // Direct context triggers (manual / programmatic / reflex)
  if (context.failed_gate || context.failed_probe) {
    return { pass: true, detail: `probe failure detected: ${context.failed_gate || context.failed_probe}` };
  }

  // EPOCH-71: Read latest doctor receipt from evidence
  const evidDir = path.join(ROOT, 'reports', 'evidence');
  try {
    if (fs.existsSync(evidDir)) {
      const doctorDirs = fs.readdirSync(evidDir)
        .filter((d) => d.startsWith('EPOCH-DOCTOR-')).sort();
      if (doctorDirs.length > 0) {
        const latest = doctorDirs[doctorDirs.length - 1];
        const receiptPath = path.join(evidDir, latest, 'DOCTOR.json');
        if (fs.existsSync(receiptPath)) {
          const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
          if (receipt.status && receipt.status !== 'HEALTHY') {
            return { pass: true, detail: `doctor verdict: ${receipt.status} score=${receipt.score ?? '?'}` };
          }
        }
      }
    }
  } catch { /* fail-safe: continue to other checks */ }

  // EventBus-derived triggers (G5: doctor emits PROBE_FAIL / DOCTOR_VERDICT)
  if (Array.isArray(context.recentEvents)) {
    const probeFailEvents = context.recentEvents.filter(
      (e) => e.event === 'PROBE_FAIL' ||
             (e.event === 'DOCTOR_VERDICT' && e.attrs?.verdict && e.attrs.verdict !== 'HEALTHY')
    );
    if (probeFailEvents.length > 0) {
      const details = probeFailEvents.map(
        (e) => e.attrs?.probe ?? e.attrs?.verdict ?? e.event
      ).join(', ');
      return { pass: true, detail: `probe failures from EventBus: ${details}` };
    }
  }

  return { pass: false, detail: 'no probe failures detected (no failed_gate, failed_probe, doctor receipt, or bus PROBE_FAIL events)' };
}

// ---------------------------------------------------------------------------
// guard_healable — T06: DEGRADED → HEALING
// EPOCH-71: checks filesystem conditions + doctor diagnosis for healability
// ---------------------------------------------------------------------------
function guard_healable(context) {
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

  // EPOCH-71: doctor-derived healability (context may carry doctor_verdict)
  if (context?.doctor_verdict && context.doctor_verdict !== 'HEALTHY') {
    healable.push(`doctor: ${context.doctor_verdict}`);
  }

  if (healable.length === 0) {
    return { pass: false, detail: 'no known-healable conditions detected' };
  }

  return { pass: true, detail: `healable conditions: ${healable.join(', ')}` };
}

// ---------------------------------------------------------------------------
// guard_heal_complete — T07: HEALING → BOOT
// EPOCH-71: checks heals_applied from context OR latest HEAL_RECEIPT
// ---------------------------------------------------------------------------
function guard_heal_complete(context) {
  // Direct context (from executeTransition)
  if (context && typeof context.heals_applied === 'number' && context.heals_applied > 0) {
    return { pass: true, detail: `${context.heals_applied} heal(s) applied successfully` };
  }

  // EPOCH-71: Read latest heal receipt from evidence
  const evidDir = path.join(ROOT, 'reports', 'evidence');
  try {
    if (fs.existsSync(evidDir)) {
      const healDirs = fs.readdirSync(evidDir)
        .filter((d) => d.startsWith('EPOCH-HEAL-')).sort();
      if (healDirs.length > 0) {
        const latest = healDirs[healDirs.length - 1];
        const receiptPath = path.join(evidDir, latest, 'HEAL_RECEIPT.json');
        if (fs.existsSync(receiptPath)) {
          const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
          if (receipt.heals_applied > 0) {
            return { pass: true, detail: `heal receipt: ${receipt.heals_applied} heal(s) from ${latest}` };
          }
        }
      }
    }
  } catch { /* fail-safe */ }

  return { pass: false, detail: `heals_applied=${context?.heals_applied ?? 'undefined'} — need > 0, no heal receipt found` };
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
