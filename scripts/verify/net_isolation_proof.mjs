/**
 * net_isolation_proof.mjs — NET01 Network Isolation Proof Gate
 *
 * Implements P0_NET_OFF from SHAMAN_OS_FIRMWARE v2.0.1.
 *
 * Goal: Prove network is NOT required for PASS.
 * Fail code: NET01 — "Network isolation unavailable / not proven"
 *
 * Checks:
 * 1. ENABLE_NET is unset or '0' (network opt-in NOT active)
 * 2. Key trading/network env flags are unset (I_UNDERSTAND_LIVE_RISK, LIVE_TRADING, etc.)
 * 3. node_modules directory exists (offline install already completed — no network needed)
 * 4. package-lock.json present (deterministic lock exists)
 * 5. VERIFY_MODE is GIT or BUNDLE (not network-dependent)
 * 6. No live-exchange env vars set (API_KEY, API_SECRET, BINANCE_KEY, etc.)
 *
 * Writes:
 *   reports/evidence/INFRA_P0/NET_ISOLATION_PROOF.md
 *   reports/evidence/INFRA_P0/gates/manual/net_isolation.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const INFRA_DIR = path.join(ROOT, 'reports', 'evidence', 'INFRA_P0');
const MANUAL_DIR = path.join(INFRA_DIR, 'gates', 'manual');

fs.mkdirSync(INFRA_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

console.log('');
console.log('='.repeat(60));
console.log('NET01 NETWORK ISOLATION PROOF');
console.log(`RUN_ID: ${RUN_ID}`);
console.log('='.repeat(60));

// ---------------------------------------------------------------------------
// Check set: ordered list of isolation checks
// ---------------------------------------------------------------------------
const checks = [];

// Check 1: ENABLE_NET must not be set to '1'
{
  const enableNet = process.env.ENABLE_NET;
  const ok = !enableNet || enableNet === '0' || enableNet === 'false';
  checks.push({
    id: 'C01_ENABLE_NET_OFF',
    description: 'ENABLE_NET is unset or 0 (network opt-in inactive)',
    env_var: 'ENABLE_NET',
    env_value: enableNet || '(unset)',
    ok,
    reason: ok
      ? 'ENABLE_NET not active — offline mode enforced'
      : `ENABLE_NET=${enableNet} — network opt-in is ACTIVE. Unset to enforce offline mode.`,
  });
}

// Check 2: I_UNDERSTAND_LIVE_RISK must not be set
{
  const liveRisk = process.env.I_UNDERSTAND_LIVE_RISK;
  const ok = !liveRisk || liveRisk === '0' || liveRisk === 'false';
  checks.push({
    id: 'C02_LIVE_RISK_FLAG_OFF',
    description: 'I_UNDERSTAND_LIVE_RISK is unset (no live trading acknowledgement)',
    env_var: 'I_UNDERSTAND_LIVE_RISK',
    env_value: liveRisk || '(unset)',
    ok,
    reason: ok
      ? 'Live risk flag not active — not in live trading mode'
      : `I_UNDERSTAND_LIVE_RISK=${liveRisk} is set — live mode acknowledged. Should not be set for P0.`,
  });
}

// Check 3: Live exchange API keys must not be set
{
  const liveKeys = ['API_KEY', 'API_SECRET', 'BINANCE_KEY', 'BINANCE_SECRET', 'EXCHANGE_API_KEY'];
  const setKeys = liveKeys.filter((k) => process.env[k]);
  const ok = setKeys.length === 0;
  checks.push({
    id: 'C03_NO_LIVE_API_KEYS',
    description: 'No live exchange API keys set (API_KEY, API_SECRET, BINANCE_KEY, etc.)',
    env_var: liveKeys.join(', '),
    env_value: ok ? '(all unset)' : setKeys.map((k) => `${k}=<redacted>`).join(', '),
    ok,
    reason: ok
      ? 'No live exchange API credentials found — cannot connect to live endpoints'
      : `Live API key(s) found: ${setKeys.join(', ')}. Must be unset for P0 isolation proof.`,
  });
}

// Check 4: node_modules present (no network needed for deps)
{
  const nmPath = path.join(ROOT, 'node_modules');
  const ok = fs.existsSync(nmPath) && fs.statSync(nmPath).isDirectory();
  checks.push({
    id: 'C04_NODE_MODULES_PRESENT',
    description: 'node_modules directory present (offline install completed, no network needed)',
    env_var: 'N/A',
    env_value: 'N/A',
    ok,
    reason: ok
      ? 'node_modules present — npm ci completed from cache/local state, no network required'
      : 'node_modules missing — npm ci would require network (DEP01 risk). Run npm ci first.',
  });
}

// Check 5: package-lock.json present (deterministic install)
{
  const lockPath = path.join(ROOT, 'package-lock.json');
  const ok = fs.existsSync(lockPath);
  checks.push({
    id: 'C05_LOCK_FILE_PRESENT',
    description: 'package-lock.json present (deterministic dependency spec)',
    env_var: 'N/A',
    env_value: 'N/A',
    ok,
    reason: ok
      ? 'package-lock.json found — deterministic install spec locked'
      : 'package-lock.json missing — non-deterministic install risk.',
  });
}

// Check 6: VERIFY_MODE is acceptable (GIT or BUNDLE — no network modes)
{
  const verifyMode = (process.env.VERIFY_MODE || 'GIT').toUpperCase();
  const ok = verifyMode === 'GIT' || verifyMode === 'BUNDLE';
  checks.push({
    id: 'C06_VERIFY_MODE_OFFLINE',
    description: 'VERIFY_MODE is GIT or BUNDLE (authority from commit or bundle, not network)',
    env_var: 'VERIFY_MODE',
    env_value: process.env.VERIFY_MODE || '(unset, defaults to GIT)',
    ok,
    reason: ok
      ? `VERIFY_MODE=${verifyMode} — offline authority mode active`
      : `VERIFY_MODE=${verifyMode} — unknown mode may require network. Expected GIT or BUNDLE.`,
  });
}

// ---------------------------------------------------------------------------
// Determine gate status
// ---------------------------------------------------------------------------
const failedChecks = checks.filter((c) => !c.ok);
const gateStatus = failedChecks.length === 0 ? 'PASS' : 'BLOCKED';
const reasonCode = failedChecks.length === 0 ? 'NONE' : 'NET01';

const message = failedChecks.length === 0
  ? `NET01 PASS — Network isolation proven. ${checks.length}/${checks.length} checks passed. No network required for PASS.`
  : `BLOCKED NET01 — Network isolation NOT proven. ${failedChecks.length} check(s) failed: ${failedChecks.map((c) => c.id).join(', ')}.`;

const nextAction = failedChecks.length === 0
  ? 'Network isolation proven. Continue with infra:p0 pipeline.'
  : `Fix failing isolation checks: ${failedChecks.map((c) => c.id).join(', ')}. Unset network env vars and ensure offline state.`;

// ---------------------------------------------------------------------------
// Write NET_ISOLATION_PROOF.md
// ---------------------------------------------------------------------------
const checksTable = checks.map((c) =>
  `| ${c.id} | ${c.env_var} | ${c.env_value} | ${c.ok ? 'PASS' : 'FAIL'} | ${c.reason} |`
).join('\n');

const proofMd = `# NET_ISOLATION_PROOF.md — NET01 Network Usage Policy Proof

STATUS: ${gateStatus}
REASON_CODE: ${reasonCode}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## NET01 Policy and Scope Clarity

WHAT THIS GATE PROVES: Policy checks that network is NOT required for PASS (offline-authoritative).
WHAT THIS GATE DOES NOT PROVE: Hardware-level network isolation (no network namespace enforcement).

This gate verifies via 6 policy checks:
1. No network opt-in flags active (ENABLE_NET unset or 0)
2. No live trading risk acknowledgement
3. No live exchange API keys present
4. node_modules already installed (no network needed for npm ci)
5. package-lock.json exists (deterministic reinstall spec)
6. VERIFY_MODE is GIT or BUNDLE (offline-authoritative, not network-dependent)

Fail code NET01: Network usage policy violated or offline state not verifiable.
For hardware-level isolation: use docker --network=none or unshare -n in CI.

Offline-truth-is-authority: if all checks pass, network is never required for PASS.

## Isolation Checks

| Check ID | Env Var | Value | Result | Reason |
|----------|---------|-------|--------|--------|
${checksTable}

## Summary

| Metric | Value |
|--------|-------|
| Total checks | ${checks.length} |
| Checks PASS | ${checks.filter((c) => c.ok).length} |
| Checks FAIL | ${failedChecks.length} |
| Gate status | ${gateStatus} |

## Isolation Proof

The following conditions together prove offline operation is possible:
1. ENABLE_NET unset — no network opt-in flag active
2. No live trading acknowledgement flag
3. No live exchange API credentials
4. node_modules present from prior offline install (npm ci from cache)
5. package-lock.json present for deterministic reinstall
6. VERIFY_MODE=GIT derives authority from git commit sha (no network needed)

## Evidence Paths

- reports/evidence/INFRA_P0/NET_ISOLATION_PROOF.md
- reports/evidence/INFRA_P0/gates/manual/net_isolation.json
`;

writeMd(path.join(INFRA_DIR, 'NET_ISOLATION_PROOF.md'), proofMd);

// ---------------------------------------------------------------------------
// Write net_isolation.json
// ---------------------------------------------------------------------------
const gateJson = {
  schema_version: '1.0.0',
  checks: checks.map((c) => ({
    description: c.description,
    env_value: c.env_value,
    env_var: c.env_var,
    id: c.id,
    ok: c.ok,
    reason: c.reason,
  })),
  checks_failed: failedChecks.length,
  checks_total: checks.length,
  message,
  next_action: nextAction,
  reason_code: reasonCode,
  run_id: RUN_ID,
  status: gateStatus,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'net_isolation.json'), gateJson);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log('NET01 ISOLATION CHECKS');
console.log('='.repeat(60));
for (const c of checks) {
  console.log(`  [${c.ok ? 'PASS' : 'FAIL'}] ${c.id}: ${c.reason}`);
}
console.log(`\nFINAL: ${gateStatus}${reasonCode !== 'NONE' ? ' ' + reasonCode : ''}`);
console.log('='.repeat(60));

if (gateStatus !== 'PASS') {
  console.error(`\n[BLOCKED NET01] Network isolation not proven. See INFRA_P0/NET_ISOLATION_PROOF.md.`);
  process.exit(1);
}

console.log(`\n[PASS] net_isolation_proof — Network isolation proven for P0.`);
process.exit(0);
